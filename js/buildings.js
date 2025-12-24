/**
 * Simple buildings (BoxGeometry) + basic AABB colliders.
 */

import * as THREE from 'three';

function createBuildingTexture({
    width = 128,
    height = 256,
    baseColor = '#6e6e6e',
    windowColor = '#d6f0ff',
} = {}) {
    if (typeof document === 'undefined') {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle vertical variation
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 1600; i++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
    ctx.globalAlpha = 1;

    const paddingX = 10;
    const paddingY = 12;
    const windowW = 10;
    const windowH = 14;
    const gapX = 10;
    const gapY = 18;

    for (let y = paddingY; y < height - paddingY; y += gapY) {
        for (let x = paddingX; x < width - paddingX; x += gapX) {
            const lit = Math.random() > 0.35;
            ctx.fillStyle = lit ? windowColor : '#2b2b2b';
            ctx.fillRect(x, y, windowW, windowH);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
}

export function createBuilding({
    width = 8,
    depth = 8,
    height = 20,
    position = new THREE.Vector3(),
    material = null,
} = {}) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(
        geometry,
        material ||
            new THREE.MeshStandardMaterial({
                color: 0x777777,
                roughness: 0.9,
                metalness: 0.0,
            }),
    );

    mesh.position.copy(position);
    mesh.position.y = height / 2;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function computeColliders(group) {
    group.updateMatrixWorld(true);

    const colliders = [];
    group.traverse(obj => {
        if (!obj.isMesh) return;

        const box = new THREE.Box3().setFromObject(obj);
        colliders.push({
            mesh: obj,
            box,
        });
    });

    return colliders;
}

export function updateBuildingColliders(colliders) {
    for (const collider of colliders) {
        collider.mesh.updateMatrixWorld(true);
        collider.box.setFromObject(collider.mesh);
    }
}

export function sphereIntersectsColliders(position, radius, colliders) {
    for (const { box } of colliders) {
        if (box.distanceToPoint(position) <= radius) {
            return true;
        }
    }
    return false;
}

export function createBuildings({
    mapSize = 600,
    count = 40,
    margin = 25,
} = {}) {
    const group = new THREE.Group();
    group.name = 'Buildings';

    const texture = createBuildingTexture();
    if (texture) {
        texture.repeat.set(1, 1);
    }

    const sharedMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a8a8a,
        roughness: 0.85,
        metalness: 0.05,
        map: texture || null,
    });

    const half = mapSize / 2 - margin;

    for (let i = 0; i < count; i++) {
        const width = THREE.MathUtils.randFloat(6, 18);
        const depth = THREE.MathUtils.randFloat(6, 18);
        const height = THREE.MathUtils.randFloat(10, 55);

        const x = THREE.MathUtils.randFloat(-half, half);
        const z = THREE.MathUtils.randFloat(-half, half);

        // Keep a small open area near the center for future player spawn.
        const centerClearRadius = 22;
        if (Math.hypot(x, z) < centerClearRadius) {
            i--;
            continue;
        }

        const mesh = createBuilding({
            width,
            depth,
            height,
            position: new THREE.Vector3(x, 0, z),
            material: sharedMaterial,
        });

        mesh.name = `Building_${i}`;
        group.add(mesh);
    }

    const colliders = computeColliders(group);

    return {
        group,
        colliders,
        updateColliders: () => updateBuildingColliders(colliders),
    };
}
