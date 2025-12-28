/**
 * Environment Map Loader
 * Load HDRI environment maps for realistic reflections
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export const ENVIRONMENT_CONFIG = {
    // HDRI URLs (in priority order)
    HDRI_URLS: [
        '/assets/textures/environment/studio_small_09_2k.hdr',
        '/assets/textures/environment/pillars_2k.hdr',
        '/assets/textures/environment/solitude_night_2k.hdr',
        'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_09_2k.hdr',
        'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/pillars_2k.hdr',
    ],

    // Environment intensity
    INTENSITY: 1.0,

    // Background settings
    USE_AS_BACKGROUND: false,
};

class EnvironmentMapLoader {
    constructor() {
        this.rgbeLoader = new RGBELoader();
        this.loadedTexture = null;
        this.currentUrl = null;
    }

    /**
     * Load an HDRI environment map
     */
    async loadEnvironmentMap(urls = ENVIRONMENT_CONFIG.HDRI_URLS, options = {}) {
        const {
            intensity = ENVIRONMENT_CONFIG.INTENSITY,
            useAsBackground = ENVIRONMENT_CONFIG.USE_AS_BACKGROUND,
        } = options;

        const list = Array.isArray(urls) ? urls : [urls];
        let lastErr = null;

        for (const url of list) {
            try {
                const texture = await this.loadHDRI(url);

                if (!texture) {
                    throw new Error('Failed to decode HDR texture');
                }

                texture.mapping = THREE.EquirectangularReflectionMapping;

                console.log(`[EnvironmentMapLoader] Loaded HDRI from: ${url}`);

                return {
                    texture,
                    url,
                    intensity,
                    useAsBackground,
                };
            } catch (err) {
                lastErr = err;
                console.warn(`[EnvironmentMapLoader] Failed to load HDRI from ${url}`);
            }
        }

        console.error('[EnvironmentMapLoader] All HDRI URLs failed:', lastErr);
        return null;
    }

    /**
     * Load a single HDRI file
     */
    loadHDRI(url) {
        return new Promise((resolve, reject) => {
            this.rgbeLoader.load(
                url,
                (texture) => resolve(texture),
                undefined,
                (err) => reject(err)
            );
        });
    }

    /**
     * Apply environment map to scene
     */
    applyEnvironmentMap(scene, envData) {
        if (!envData || !envData.texture) {
            console.warn('[EnvironmentMapLoader] No environment data to apply');
            return false;
        }

        // Set environment map (for reflections)
        scene.environment = envData.texture;
        scene.environmentIntensity = envData.intensity;

        // Optionally set as background
        if (envData.useAsBackground) {
            scene.background = envData.texture;
        }

        this.loadedTexture = envData.texture;
        this.currentUrl = envData.url;

        console.log('[EnvironmentMapLoader] Environment map applied to scene');

        return true;
    }

    /**
     * Load and apply in one step
     */
    async loadAndApply(scene, urls, options) {
        const envData = await this.loadEnvironmentMap(urls, options);

        if (envData) {
            return this.applyEnvironmentMap(scene, envData);
        }

        return false;
    }

    /**
     * Remove environment map from scene
     */
    removeEnvironmentMap(scene) {
        scene.environment = null;
        scene.environmentIntensity = 1.0;

        if (this.loadedTexture) {
            this.loadedTexture.dispose();
            this.loadedTexture = null;
        }

        this.currentUrl = null;

        console.log('[EnvironmentMapLoader] Environment map removed');
    }

    /**
     * Get current environment info
     */
    getCurrentEnvironment() {
        return {
            texture: this.loadedTexture,
            url: this.currentUrl,
        };
    }
}

// Singleton instance
const loaderInstance = new EnvironmentMapLoader();

/**
 * Load environment map (singleton)
 */
export async function loadEnvironmentMap(scene, urls, options) {
    return loaderInstance.loadAndApply(scene, urls, options);
}

/**
 * Remove environment map (singleton)
 */
export function removeEnvironmentMap(scene) {
    loaderInstance.removeEnvironmentMap(scene);
}

/**
 * Get environment loader instance
 */
export function getEnvironmentLoader() {
    return loaderInstance;
}

/**
 * Simple factory for quick setup
 */
export async function setupLightingWithEnvironment(scene, options = {}) {
    const {
        enableEnvironment = true,
        enableShadows = true,
        shadowMapSize = 2048,
        ambientIntensity = 0.5,
        directionalIntensity = 1.2,
        hemiIntensity = 0.6,
    } = options;

    // Setup directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffd6a3, directionalIntensity);
    sunLight.position.set(100, 150, 50);
    sunLight.castShadow = enableShadows;

    if (enableShadows) {
        sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.bias = -0.0008;
        sunLight.shadow.radius = 3;
    }

    scene.add(sunLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
    scene.add(ambientLight);

    // Hemisphere light (sky/ground gradient)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d2d2d, hemiIntensity);
    scene.add(hemiLight);

    // Load environment map
    if (enableEnvironment) {
        await loadEnvironmentMap(scene);
    }

    return {
        sunLight,
        ambientLight,
        hemiLight,
    };
}
