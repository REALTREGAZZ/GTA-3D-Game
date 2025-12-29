/**
 * Boss Animation System
 * Provides AnimationMixer and blending for legendary bosses
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class BossAnimationSystem {
    constructor(bossModel) {
        this.mixer = new THREE.AnimationMixer(bossModel);
        this.clips = [];
        this.actions = {};
        this.activeAction = null;
        this.previousAction = null;
        this.fadeDuration = 0.3;

        // Extract all animations from the model
        if (bossModel.animations && bossModel.animations.length > 0) {
            this.clips = bossModel.animations;
            console.log('[BossAnimation] Found', this.clips.length, 'animations');

            // Create actions for each clip
            for (const clip of this.clips) {
                this.actions[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
            }
        }
    }

    /**
     * Play an animation clip with optional blending
     * @param {string} clipName - Name of the animation clip
     * @param {Object} options - { fadeDuration, timeScale, loop }
     */
    play(clipName, options = {}) {
        const { fadeDuration = this.fadeDuration, timeScale = 1.0, loop = THREE.LoopRepeat } = options;

        const action = this.actions[clipName.toLowerCase()];
        if (!action) {
            console.warn(`[BossAnimation] Animation "${clipName}" not found`);
            return false;
        }

        // Stop previous action with fade
        if (this.activeAction && this.activeAction !== action) {
            this.previousAction = this.activeAction;
            this.previousAction.fadeOut(fadeDuration);
        }

        // Configure and play new action
        action.setLoop(loop);
        action.timeScale = timeScale;
        action.reset().fadeIn(fadeDuration).play();

        this.activeAction = action;
        console.log(`[BossAnimation] Playing: ${clipName}`);
        return true;
    }

    /**
     * Crossfade between animations
     */
    crossfadeTo(clipName, options = {}) {
        this.play(clipName, options);
    }

    /**
     * Stop current animation
     */
    stop(fadeDuration = 0.3) {
        if (this.activeAction) {
            this.activeAction.fadeOut(fadeDuration);
            this.previousAction = this.activeAction;
            this.activeAction = null;
        }
    }

    /**
     * Set animation time scale (speed)
     */
    setTimeScale(clipName, timeScale) {
        const action = this.actions[clipName.toLowerCase()];
        if (action) {
            action.timeScale = timeScale;
        }
    }

    /**
     * Get animation by name
     */
    getClip(clipName) {
        return this.clips.find(c => c.name.toLowerCase() === clipName.toLowerCase());
    }

    /**
     * Update animation mixer
     */
    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }

    /**
     * Get all available animation names
     */
    getAnimationNames() {
        return this.clips.map(c => c.name);
    }
}

/**
 * Load a boss model with animations from GLB file
 */
export async function loadBossModel(path, options = {}) {
    const loader = new GLTFLoader();

    try {
        const gltf = await loader.loadAsync(path);
        const model = gltf.scene;

        // Apply options
        const scale = options.scale || 1;
        model.scale.set(scale, scale, scale);

        // Enable shadows
        model.traverse((node) => {
            if (node?.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;

                // Enhance materials for epic look
                if (node.material) {
                    node.material.metalness = Math.min(0.8, (node.material.metalness || 0) + 0.3);
                    node.material.roughness = Math.max(0.2, (node.material.roughness || 0.5) - 0.2);
                    node.material.envMapIntensity = 1.0;
                    node.material.needsUpdate = true;
                }
            }
        });

        console.log(`[BossModel] Loaded: ${path} with ${gltf.animations?.length || 0} animations`);
        return { model, animations: gltf.animations };
    } catch (err) {
        console.error(`[BossModel] Failed to load ${path}:`, err);
        return null;
    }
}

/**
 * Create a procedural boss animation controller for fallback
 */
export function createProceduralBossAnimations() {
    return {
        idle: null,
        combatReady: null,
        attack: null,
        walk: null,
        hit: null,
        death: null
    };
}
