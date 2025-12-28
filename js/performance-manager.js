/**
 * Performance Manager
 * - Dynamic resolution scaling (pixel ratio)
 * - Shadow frustum focusing (directional shadow camera follows the player)
 */

import * as THREE from 'three';

export function createPerformanceManager({
    renderer,
    sunLight,
    minResolutionScale = 0.65,
    maxResolutionScale = 1.0,
    targetFps = 60,
    shadowFrustumSize = 90,
} = {}) {
    if (!renderer) throw new Error('createPerformanceManager: renderer is required');

    const state = {
        resolutionScale: 1.0,
        lastChangeTime: 0,
        cooldown: 1.0,
        shadowFrustumSize,
        enabled: true,
    };

    const _size = new THREE.Vector2();

    function applyPixelRatio() {
        const deviceRatio = Math.min(window.devicePixelRatio || 1, 2);
        const ratio = deviceRatio * state.resolutionScale;

        renderer.setPixelRatio(ratio);
        renderer.getSize(_size);
        renderer.setSize(_size.x, _size.y, false);
    }

    function updateResolutionScale(fps, timeSeconds) {
        if (!Number.isFinite(fps)) return;
        if (timeSeconds - state.lastChangeTime < state.cooldown) return;

        const low = targetFps - 10;
        const high = targetFps + 3;

        if (fps < low && state.resolutionScale > minResolutionScale) {
            state.resolutionScale = Math.max(minResolutionScale, state.resolutionScale - 0.05);
            state.lastChangeTime = timeSeconds;
            applyPixelRatio();
        } else if (fps > high && state.resolutionScale < maxResolutionScale) {
            state.resolutionScale = Math.min(maxResolutionScale, state.resolutionScale + 0.05);
            state.lastChangeTime = timeSeconds;
            applyPixelRatio();
        }
    }

    function updateShadowFrustum(focusPosition) {
        if (!sunLight?.castShadow || !sunLight.shadow?.camera || !focusPosition) return;

        const cam = sunLight.shadow.camera;
        const half = state.shadowFrustumSize;

        cam.left = -half;
        cam.right = half;
        cam.top = half;
        cam.bottom = -half;

        // Follow the player so the shadow map is concentrated where gameplay happens.
        sunLight.target.position.set(focusPosition.x, 0, focusPosition.z);
        sunLight.target.updateMatrixWorld();

        cam.updateProjectionMatrix();
    }

    function update({ fps = null, timeSeconds = performance.now() / 1000, focusPosition = null } = {}) {
        if (!state.enabled) return;
        updateResolutionScale(fps, timeSeconds);
        updateShadowFrustum(focusPosition);
    }

    function setShadowFrustumSize(size) {
        state.shadowFrustumSize = Math.max(10, size);
    }

    function getState() {
        return { ...state };
    }

    // Apply initial pixel ratio with scale 1.0
    applyPixelRatio();

    return {
        update,
        setShadowFrustumSize,
        getState,
        setEnabled: (enabled) => { state.enabled = !!enabled; },
    };
}
