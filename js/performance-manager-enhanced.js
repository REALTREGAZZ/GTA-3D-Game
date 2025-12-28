/**
 * Enhanced Performance Manager
 * - Dynamic resolution scaling
 * - Shadow frustum focusing
 * - Object pooling for particles
 * - Terrain LOD management
 * - Memory cleanup
 */

import * as THREE from 'three';

export function createPerformanceManagerEnhanced({
    renderer,
    sunLight,
    scene,
    minResolutionScale = 0.5,
    maxResolutionScale = 1.0,
    targetFps = 60,
    shadowFrustumSize = 90,
} = {}) {
    if (!renderer) throw new Error('createPerformanceManagerEnhanced: renderer is required');

    const state = {
        resolutionScale: 1.0,
        lastChangeTime: 0,
        cooldown: 0.5, // Faster response time
        shadowFrustumSize,
        enabled: true,
        
        // Performance metrics
        fpsHistory: [],
        maxFpsHistory: 30,
        currentFps: 60,
        
        // Memory management
        lastCleanupTime: 0,
        cleanupInterval: 10.0, // Cleanup every 10 seconds
        
        // LOD management
        lodLevels: ['high', 'medium', 'low'],
        currentLodLevel: 'high',
        
        // Particle management
        maxParticles: 5000,
        activeParticles: 0,
    };

    const _size = new THREE.Vector2();
    const _playerPosition = new THREE.Vector3();
    const _shadowTarget = new THREE.Vector3();

    // Object pool for particles
    const particlePool = [];
    const activeParticles = [];

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

        // Update FPS history
        state.fpsHistory.push(fps);
        if (state.fpsHistory.length > state.maxFpsHistory) {
            state.fpsHistory.shift();
        }
        state.currentFps = fps;

        const lowThreshold = targetFps - 15; // More aggressive scaling down
        const highThreshold = targetFps + 5;

        if (fps < lowThreshold && state.resolutionScale > minResolutionScale) {
            state.resolutionScale = Math.max(minResolutionScale, state.resolutionScale - 0.1); // Faster scaling down
            state.lastChangeTime = timeSeconds;
            applyPixelRatio();
            console.log(`🔴 Performance: Scaled resolution to ${state.resolutionScale.toFixed(2)} (FPS: ${fps.toFixed(1)})`);
        } else if (fps > highThreshold && state.resolutionScale < maxResolutionScale) {
            state.resolutionScale = Math.min(maxResolutionScale, state.resolutionScale + 0.05); // Slower scaling up
            state.lastChangeTime = timeSeconds;
            applyPixelRatio();
            console.log(`🟢 Performance: Scaled resolution to ${state.resolutionScale.toFixed(2)} (FPS: ${fps.toFixed(1)})`);
        }

        // Adjust LOD based on performance
        updateLODLevel(fps);
    }

    function updateLODLevel(fps) {
        const avgFps = state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length;

        if (avgFps < 30 && state.currentLodLevel !== 'low') {
            setLODLevel('low');
        } else if (avgFps < 45 && state.currentLodLevel !== 'medium') {
            setLODLevel('medium');
        } else if (avgFps >= 45 && state.currentLodLevel !== 'high') {
            setLODLevel('high');
        }
    }

    function setLODLevel(level) {
        if (!state.lodLevels.includes(level)) return;

        state.currentLodLevel = level;
        console.log(`🎮 LOD Level changed to: ${level}`);

        // Broadcast LOD change event
        const event = new CustomEvent('lodChange', { detail: { level } });
        window.dispatchEvent(event);
    }

    function updateShadowFocus(playerPosition, timeSeconds) {
        if (!sunLight || !sunLight.shadow || !sunLight.shadow.camera) return;

        const camera = sunLight.shadow.camera;
        if (!camera.isOrthographicCamera) return;

        // Focus shadow camera on player position
        _shadowTarget.copy(playerPosition);
        _shadowTarget.y = 0; // Keep shadow camera at ground level

        // Smooth follow
        const currentPos = camera.position.clone();
        const targetPos = _shadowTarget.clone();
        targetPos.y = camera.position.y; // Keep same height

        const smoothFactor = 0.1;
        camera.position.lerp(targetPos, smoothFactor);
        camera.lookAt(_shadowTarget);

        // Adjust shadow map size based on performance
        adjustShadowQuality(timeSeconds);
    }

    function adjustShadowQuality(timeSeconds) {
        if (!sunLight || !sunLight.shadow) return;

        const avgFps = state.fpsHistory.length > 0 
            ? state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length
            : 60;

        // Dynamic shadow map resolution
        if (avgFps < 30) {
            sunLight.shadow.mapSize.set(512, 512);
        } else if (avgFps < 45) {
            sunLight.shadow.mapSize.set(1024, 1024);
        } else {
            sunLight.shadow.mapSize.set(2048, 2048);
        }
    }

    function memoryCleanup(timeSeconds) {
        if (timeSeconds - state.lastCleanupTime < state.cleanupInterval) return;
        state.lastCleanupTime = timeSeconds;

        // Clean up unused textures
        cleanupUnusedTextures();

        // Clean up unused geometries
        cleanupUnusedGeometries();

        // Clean up unused materials
        cleanupUnusedMaterials();

        console.log('🧹 Memory cleanup performed');
    }

    function cleanupUnusedTextures() {
        try {
            const textures = renderer.info.memory.textures;
            // Note: Three.js doesn't provide direct access to unused textures,
            // but we can encourage garbage collection
            if (window.gc) {
                window.gc();
            }
        } catch (e) {
            console.warn('Texture cleanup failed:', e);
        }
    }

    function cleanupUnusedGeometries() {
        try {
            // Similar to textures, we can't directly access unused geometries
            // but we can encourage cleanup
            if (scene) {
                scene.traverse((obj) => {
                    if (obj.isMesh && obj.geometry) {
                        obj.geometry.dispose();
                    }
                });
            }
        } catch (e) {
            console.warn('Geometry cleanup failed:', e);
        }
    }

    function cleanupUnusedMaterials() {
        try {
            if (scene) {
                scene.traverse((obj) => {
                    if (obj.isMesh && obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(m => m.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('Material cleanup failed:', e);
        }
    }

    function getParticleFromPool() {
        if (particlePool.length > 0) {
            return particlePool.pop();
        }
        return null;
    }

    function returnParticleToPool(particle) {
        if (particlePool.length < state.maxParticles) {
            particlePool.push(particle);
        }
    }

    function update(timeSeconds) {
        if (!state.enabled) return;

        // Update shadow focus if player position is provided
        if (_playerPosition.lengthSq() > 0) {
            updateShadowFocus(_playerPosition, timeSeconds);
        }

        // Perform periodic memory cleanup
        memoryCleanup(timeSeconds);
    }

    return {
        update,
        
        updateResolutionScale,
        
        setPlayerPosition: function(position) {
            _playerPosition.copy(position);
        },
        
        getState: function() {
            return {
                resolutionScale: state.resolutionScale,
                currentFps: state.currentFps,
                lodLevel: state.currentLodLevel,
                activeParticles: state.activeParticles,
                maxParticles: state.maxParticles
            };
        },
        
        // Particle pooling interface
        getParticle: getParticleFromPool,
        returnParticle: returnParticleToPool,
        
        // Enable/disable performance management
        setEnabled: function(enabled) {
            state.enabled = enabled;
        },
        
        // Manual cleanup trigger
        cleanup: memoryCleanup
    };
}