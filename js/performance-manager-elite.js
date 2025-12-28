/**
 * Performance Manager Elite
 * Advanced performance monitoring with dynamic quality adjustment
 */

import * as THREE from 'three';

export const PERFORMANCE_CONFIG = {
    // FPS targets
    TARGET_FPS: 60,
    MIN_FPS: 40,

    // Quality settings
    QUALITY_LEVELS: {
        HIGH: {
            shadowMapSize: 2048,
            shadowDistance: 300,
            bloomStrength: 1.5,
            anisotropy: 8,
            lodDistance: 150,
            pixelRatio: 1.5,
        },
        MEDIUM: {
            shadowMapSize: 1024,
            shadowDistance: 200,
            bloomStrength: 1.2,
            anisotropy: 4,
            lodDistance: 100,
            pixelRatio: 1.0,
        },
        LOW: {
            shadowMapSize: 512,
            shadowDistance: 100,
            bloomStrength: 0.8,
            anisotropy: 2,
            lodDistance: 50,
            pixelRatio: 0.75,
        },
    },

    // Update intervals
    FPS_SAMPLE_SIZE: 60,
    QUALITY_CHANGE_COOLDOWN: 3.0, // seconds
};

export class PerformanceManagerElite {
    constructor(renderer, scene, options = {}) {
        this.renderer = renderer;
        this.scene = scene;

        // Configuration
        this.targetFPS = options.targetFPS ?? PERFORMANCE_CONFIG.TARGET_FPS;
        this.minFPS = options.minFPS ?? PERFORMANCE_CONFIG.MIN_FPS;

        // Current quality level
        this.currentQuality = 'HIGH';

        // Quality settings (mutable)
        this.qualitySettings = { ...PERFORMANCE_CONFIG.QUALITY_LEVELS.HIGH };

        // FPS tracking
        this.fps = 60;
        this.frameTime = 0;
        this.fpsSamples = [];
        this.maxSampleSize = options.fpsSampleSize ?? PERFORMANCE_CONFIG.FPS_SAMPLE_SIZE;

        // Cooldown
        this.lastQualityChangeTime = 0;
        this.qualityChangeCooldown = options.qualityChangeCooldown ?? PERFORMANCE_CONFIG.QUALITY_CHANGE_COOLDOWN;

        // Reference to post-processing bloom (if available)
        this.bloomPass = null;
        this.sunLight = null;

        // Boss culling (optional)
        this.camera = null;
        this.bosses = [];
        this.bossCullRadius = options.bossCullRadius ?? 100;
        this._frustum = new THREE.Frustum();
        this._projScreenMatrix = new THREE.Matrix4();
        this._sphere = new THREE.Sphere();
        this._tmpWorldPos = new THREE.Vector3();

        // Stats
        this.lastStatsUpdate = 0;
        this.statsUpdateInterval = 1.0; // seconds
        this.currentStats = {
            fps: 60,
            triangles: 0,
            drawCalls: 0,
            textures: 0,
            geometries: 0,
        };

        // Enabled state
        this.enabled = true;

        console.log('[PerformanceManagerElite] Initialized');
    }

    /**
     * Set reference to bloom pass for quality control
     */
    setBloomPass(bloomPass) {
        this.bloomPass = bloomPass;
        this.applyQualitySettings();
    }

    /**
     * Set reference to sun light for shadow quality
     */
    setSunLight(sunLight) {
        this.sunLight = sunLight;
        this.applyQualitySettings();
    }

    /**
     * Set camera reference for optional frustum culling.
     */
    setCamera(camera) {
        this.camera = camera;
    }

    /**
     * Provide boss entities (or their models) for culling.
     */
    setBosses(bosses = [], options = {}) {
        this.bosses = Array.isArray(bosses) ? bosses : [];
        if (typeof options.radius === 'number') {
            this.bossCullRadius = options.radius;
        }
    }

    /**
     * Update performance manager
     */
    update(deltaTime) {
        if (!this.enabled) return;

        // Calculate FPS
        const fps = 1 / Math.max(deltaTime, 0.001);
        this.fpsSamples.push(fps);

        if (this.fpsSamples.length > this.maxSampleSize) {
            this.fpsSamples.shift();
        }

        this.fps = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;

        // Check if we should adjust quality
        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastQualityChangeTime >= this.qualityChangeCooldown) {
            this.checkQualityAdjustment();
        }

        // Update stats periodically
        if (currentTime - this.lastStatsUpdate >= this.statsUpdateInterval) {
            this.updateStats();
            this.lastStatsUpdate = currentTime;
        }

        // Optional boss frustum culling
        this.updateBossCulling();
    }

    updateBossCulling() {
        if (!this.camera || !this.bosses || this.bosses.length === 0) return;

        this.camera.updateMatrixWorld(true);
        this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

        for (const boss of this.bosses) {
            const model = boss?.model || boss;
            if (!model) continue;

            model.getWorldPosition(this._tmpWorldPos);
            this._sphere.center.copy(this._tmpWorldPos);
            this._sphere.radius = this.bossCullRadius;

            model.visible = this._frustum.intersectsSphere(this._sphere);
        }
    }

    /**
     * Check if quality should be adjusted
     */
    checkQualityAdjustment() {
        const currentTime = performance.now() / 1000;

        // Reduce quality if FPS is too low
        if (this.fps < this.minFPS && this.currentQuality !== 'LOW') {
            this.reduceQuality();
            this.lastQualityChangeTime = currentTime;
        }
        // Increase quality if FPS is high
        else if (this.fps > this.targetFPS + 10 && this.currentQuality !== 'HIGH') {
            this.increaseQuality();
            this.lastQualityChangeTime = currentTime;
        }
    }

    /**
     * Reduce quality settings
     */
    reduceQuality() {
        const levels = ['HIGH', 'MEDIUM', 'LOW'];
        const currentIndex = levels.indexOf(this.currentQuality);

        if (currentIndex < levels.length - 1) {
            const newLevel = levels[currentIndex + 1];
            this.setQualityLevel(newLevel);
            console.warn(`[Performance] FPS low (${this.fps.toFixed(1)}). Reduced quality to ${newLevel}`);
        }
    }

    /**
     * Increase quality settings
     */
    increaseQuality() {
        const levels = ['HIGH', 'MEDIUM', 'LOW'];
        const currentIndex = levels.indexOf(this.currentQuality);

        if (currentIndex > 0) {
            const newLevel = levels[currentIndex - 1];
            this.setQualityLevel(newLevel);
            console.log(`[Performance] FPS high (${this.fps.toFixed(1)}). Increased quality to ${newLevel}`);
        }
    }

    /**
     * Set quality level explicitly
     */
    setQualityLevel(level) {
        if (!PERFORMANCE_CONFIG.QUALITY_LEVELS[level]) {
            console.warn(`[Performance] Unknown quality level: ${level}`);
            return;
        }

        this.currentQuality = level;
        this.qualitySettings = { ...PERFORMANCE_CONFIG.QUALITY_LEVELS[level] };

        this.applyQualitySettings();
    }

    /**
     * Apply current quality settings
     */
    applyQualitySettings() {
        // Update shadow map size
        if (this.sunLight?.castShadow) {
            this.sunLight.shadow.mapSize.set(
                this.qualitySettings.shadowMapSize,
                this.qualitySettings.shadowMapSize
            );
            this.sunLight.shadow.needsUpdate = true;
        }

        // Update bloom settings
        if (this.bloomPass) {
            this.bloomPass.strength = this.qualitySettings.bloomStrength;
        }

        // Update pixel ratio
        const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const targetPixelRatio = Math.min(maxPixelRatio, this.qualitySettings.pixelRatio);
        this.renderer.setPixelRatio(targetPixelRatio);

        // Update anisotropy for all textures
        this.scene.traverse((node) => {
            if (node.material?.map) {
                node.material.map.anisotropy = this.qualitySettings.anisotropy;
                node.material.map.needsUpdate = true;
            }
        });
    }

    /**
     * Update statistics
     */
    updateStats() {
        const info = this.renderer.info;

        this.currentStats = {
            fps: this.fps.toFixed(1),
            triangles: info.render.triangles,
            drawCalls: info.render.calls,
            textures: info.memory.textures,
            geometries: info.memory.geometries,
            quality: this.currentQuality,
            pixelRatio: this.renderer.getPixelRatio().toFixed(2),
        };
    }

    /**
     * Get current stats
     */
    getStats() {
        return { ...this.currentStats };
    }

    /**
     * Get current quality level
     */
    getQualityLevel() {
        return this.currentQuality;
    }

    /**
     * Get FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Enable or disable performance management
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Log current stats to console
     */
    logStats() {
        console.log('[Performance]', this.currentStats);
    }

    /**
     * Reset to default settings
     */
    reset() {
        this.setQualityLevel('HIGH');
        this.fpsSamples = [];
        this.fps = 60;
    }
}

/**
 * Factory function to create elite performance manager
 */
export function createPerformanceManagerElite(renderer, scene, options = {}) {
    return new PerformanceManagerElite(renderer, scene, options);
}
