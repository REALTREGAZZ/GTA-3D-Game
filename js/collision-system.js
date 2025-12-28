/**
 * Collision System
 * Lightweight helpers for capsule-style player collisions and ground snapping.
 */

import * as THREE from 'three';

export function createCapsuleCollider({
    radius = 0.4,
    height = 1.8,
    offset = new THREE.Vector3(0, 0, 0),
} = {}) {
    const safeHeight = Math.max(radius * 2, height);
    return {
        radius,
        height: safeHeight,
        offset: offset.clone(),
    };
}

const _bottom = new THREE.Vector3();
const _top = new THREE.Vector3();

export function getCapsuleEndpoints(position, capsule, bottomTarget = _bottom, topTarget = _top) {
    bottomTarget.copy(position).add(capsule.offset);
    topTarget.copy(bottomTarget);

    bottomTarget.y += capsule.radius;
    topTarget.y += capsule.height - capsule.radius;

    return { bottom: bottomTarget, top: topTarget };
}

const _closest = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();

function pushSphereOutOfBox(position, sphereCenter, radius, box) {
    const dist = box.distanceToPoint(sphereCenter);
    if (dist >= radius) return false;

    box.clampPoint(sphereCenter, _closest);
    _delta.subVectors(sphereCenter, _closest);

    // Horizontal-only response for cheap character collision.
    _delta.y = 0;

    let lenSq = _delta.lengthSq();
    if (lenSq < 1e-10) {
        box.getCenter(_boxCenter);
        _delta.subVectors(sphereCenter, _boxCenter);
        _delta.y = 0;
        lenSq = _delta.lengthSq();
        if (lenSq < 1e-10) {
            _delta.set(1, 0, 0);
            lenSq = 1;
        }
    }

    const len = Math.sqrt(lenSq);
    const penetration = radius - dist;

    _delta.multiplyScalar((penetration + 1e-3) / len);
    position.add(_delta);
    return true;
}

/**
 * Resolves capsule collisions against an array of { box: THREE.Box3 } colliders.
 * This is intentionally horizontal-only for performance (no step-up logic).
 */
export function resolveCapsuleCollisions(position, capsule, colliders, {
    iterations = 2,
} = {}) {
    if (!colliders?.length) return position;

    for (let iter = 0; iter < iterations; iter++) {
        let moved = false;

        const { bottom, top } = getCapsuleEndpoints(position, capsule);

        for (let i = 0; i < colliders.length; i++) {
            const box = colliders[i]?.box;
            if (!box) continue;

            // Two-sphere approximation of a capsule.
            if (pushSphereOutOfBox(position, bottom, capsule.radius, box)) {
                moved = true;
                getCapsuleEndpoints(position, capsule, bottom, top);
            }

            if (pushSphereOutOfBox(position, top, capsule.radius, box)) {
                moved = true;
                getCapsuleEndpoints(position, capsule, bottom, top);
            }
        }

        if (!moved) break;
    }

    return position;
}

/**
 * Keeps a character at least `footOffset` above the terrain height.
 */
export function snapToGroundY(currentY, groundY, {
    footOffset = 0.05,
    maxSnapSpeed = 35,
    dt = 1 / 60,
} = {}) {
    const targetY = groundY + footOffset;

    // If we're below ground: hard snap.
    if (currentY < targetY) return targetY;

    // If we're above: smooth approach to avoid jitter on slopes.
    const delta = targetY - currentY;
    const maxStep = maxSnapSpeed * dt;
    return currentY + THREE.MathUtils.clamp(delta, -maxStep, maxStep);
}
