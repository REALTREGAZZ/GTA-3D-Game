/**
 * Model Loader Elite
 * Enhanced character loading with humanoid models, pooling, and quality fallbacks
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createProceduralRiggedCharacter } from './procedural-rigged-character.js';

const DEFAULT_HIP_BONE_NAMES = ['mixamorigHips', 'Hips', 'hips'];

export const MODEL_LOADER_CONFIG = {
    // Model URLs in priority order
    PLAYER_MODEL_URLS: [
        '/assets/models/characters/player.glb',
        '/assets/models/characters/Xbot.glb',
        '/assets/models/characters/Astrabot.glb',
        'https://threejs.org/examples/models/gltf/Soldier.glb',
    ],

    NPC_MODEL_URLS: [
        '/assets/models/characters/NPC_Ty.glb',
        '/assets/models/characters/NPC_Rufus.glb',
        '/assets/models/characters/NPC_Malcolm.glb',
        '/assets/models/characters/Aj.glb',
        '/assets/models/characters/Ty.glb',
        '/assets/models/characters/Rufus.glb',
        '/assets/models/characters/Xavier.glb',
        '/assets/models/characters/Aiden.glb',
        'https://threejs.org/examples/models/gltf/Soldier.glb',
    ],

    // Quality settings
    SHADOW_QUALITY: {
        HIGH: { mapSize: 2048, castShadow: true, receiveShadow: true },
        MEDIUM: { mapSize: 1024, castShadow: true, receiveShadow: true },
        LOW: { mapSize: 512, castShadow: true, receiveShadow: false },
    },
};

class ModelLoaderElite {
    constructor() {
        this.loader = new GLTFLoader();
        this.gltfCache = new Map();
        this.modelPool = new Map(); // modelUrl -> instances
        this.currentQuality = 'HIGH';
    }

    /**
     * Set shadow quality level
     */
    setQuality(quality) {
        if (['HIGH', 'MEDIUM', 'LOW'].includes(quality)) {
            this.currentQuality = quality;
        }
    }

    /**
     * Load and cache a GLTF model
     */
    async loadGLTF(url) {
        if (this.gltfCache.has(url)) {
            return this.gltfCache.get(url);
        }

        const promise = new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => resolve(gltf),
                undefined,
                (err) => reject(err)
            );
        });

        this.gltfCache.set(url, promise);
        return promise;
    }

    /**
     * Try loading from multiple URLs in order
     */
    async loadFirstAvailable(urls) {
        const list = Array.isArray(urls) ? urls : [urls];
        let lastErr = null;

        for (const url of list) {
            try {
                return await this.loadGLTF(url);
            } catch (err) {
                lastErr = err;
                console.warn(`[ModelLoaderElite] Failed to load ${url}`);
            }
        }

        throw lastErr ?? new Error('No GLTF model URLs succeeded');
    }

    /**
     * Normalize animation names to standard keys
     */
    normalizeAnimationName(name) {
        const n = String(name || '').toLowerCase();

        if (n.includes('idle')) return 'idle';
        if (n.includes('walk')) return 'walk';
        if (n.includes('run')) return 'run';
        if (n.includes('jump')) return 'jump';
        if (n.includes('fall')) return 'fall';
        if (n.includes('punch') || n.includes('attack') || n.includes('hit')) return 'attack';

        return n;
    }

    /**
     * Extract animation map from clips
     */
    extractAnimationMap(clips = []) {
        const map = {};

        for (const clip of clips) {
            const key = this.normalizeAnimationName(clip?.name);
            if (!key) continue;
            if (!map[key]) {
                map[key] = clip;
            }
        }

        return map;
    }

    /**
     * Align scene so hips are at origin
     */
    alignSceneToHips(scene, hipBoneNames = DEFAULT_HIP_BONE_NAMES) {
        if (!scene) return;

        scene.updateMatrixWorld(true);

        let hip = null;
        for (const name of hipBoneNames) {
            hip = scene.getObjectByName(name);
            if (hip) break;
        }

        if (!hip) return;

        const hipWorld = new THREE.Vector3();
        hip.getWorldPosition(hipWorld);

        scene.position.y -= hipWorld.y;
        scene.updateMatrixWorld(true);
    }

    /**
     * Apply shadow quality settings to a mesh
     */
    applyShadowQuality(mesh) {
        const quality = MODEL_LOADER_CONFIG.SHADOW_QUALITY[this.currentQuality];

        mesh.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = quality.castShadow;
                node.receiveShadow = quality.receiveShadow;
            }
        });
    }

    /**
     * Load player avatar with fallback to procedural
     */
    async loadPlayerAvatar(scene, options = {}) {
        const { position = new THREE.Vector3(0, 0, 0), colorPreset = null } = options;

        try {
            // Try to load from URLs
            const gltf = await this.loadFirstAvailable(MODEL_LOADER_CONFIG.PLAYER_MODEL_URLS);

            // Clone the loaded model
            const playerScene = cloneSkinned(gltf.scene);
            this.alignSceneToHips(playerScene);
            this.applyShadowQuality(playerScene);

            playerScene.position.copy(position);

            // Find skeleton and animation mixer
            let skeleton = null;
            let mixer = new THREE.AnimationMixer(playerScene);

            playerScene.traverse((node) => {
                if (node.isSkinnedMesh) {
                    skeleton = node.skeleton;
                }
            });

            const animationMap = this.extractAnimationMap(gltf.animations);

            console.log('[ModelLoaderElite] Player avatar loaded successfully');

            return {
                scene: playerScene,
                mixer,
                skeleton,
                animationMap,
                isProcedural: false,
                loadedFrom: 'external',
            };
        } catch (err) {
            console.warn('[ModelLoaderElite] External player model failed, using procedural fallback:', err);

            // Fallback to procedural rigged character
            const procedural = createProceduralRiggedCharacter(colorPreset);
            const scene = procedural.scene;
            scene.position.copy(position);

            // Procedural already has mixer support embedded in animation system
            const mixer = new THREE.AnimationMixer(scene);

            return {
                scene,
                mixer,
                skeleton: procedural.skeleton,
                animationMap: procedural.animations,
                isProcedural: true,
                loadedFrom: 'procedural',
            };
        }
    }

    /**
     * Create NPC avatar with model pooling
     */
    async loadNPCAvatar(colorPreset, options = {}) {
        const { position = new THREE.Vector3(0, 0, 0) } = options;

        // Check pool first
        const poolKey = colorPreset?.torso ?? 'default';
        if (!this.modelPool.has(poolKey)) {
            // Create base model for pool
            const baseModel = await this.createNPCBaseModel(colorPreset);
            this.modelPool.set(poolKey, { base: baseModel, instances: [] });
        }

        const pool = this.modelPool.get(poolKey);

        // Clone instance from base
        const scene = cloneSkinned(pool.base.scene);
        scene.position.copy(position);

        // Setup mixer
        const mixer = new THREE.AnimationMixer(scene);
        let skeleton = null;

        scene.traverse((node) => {
            if (node.isSkinnedMesh) {
                skeleton = node.skeleton;
            }
        });

        const animationMap = { ...pool.base.animationMap };

        return {
            scene,
            mixer,
            skeleton,
            animationMap,
            isProcedural: pool.base.isProcedural,
        };
    }

    /**
     * Create base NPC model (shared for instances)
     */
    async createNPCBaseModel(colorPreset) {
        try {
            // Try to load from URLs
            const gltf = await this.loadFirstAvailable(MODEL_LOADER_CONFIG.NPC_MODEL_URLS);

            // Clone and align
            const scene = cloneSkinned(gltf.scene);
            this.alignSceneToHips(scene);
            this.applyShadowQuality(scene);

            let skeleton = null;
            scene.traverse((node) => {
                if (node.isSkinnedMesh) {
                    skeleton = node.skeleton;
                }
            });

            const animationMap = this.extractAnimationMap(gltf.animations);

            return {
                scene,
                skeleton,
                animationMap,
                isProcedural: false,
                loadedFrom: 'external',
            };
        } catch (err) {
            console.warn('[ModelLoaderElite] External NPC model failed, using procedural fallback:', err);

            const procedural = createProceduralRiggedCharacter(colorPreset);

            return {
                scene: procedural.scene,
                skeleton: procedural.skeleton,
                animationMap: procedural.animations,
                isProcedural: true,
                loadedFrom: 'procedural',
            };
        }
    }

    /**
     * Clear cached models and pools
     */
    clearCache() {
        this.gltfCache.clear();
        this.modelPool.clear();
    }

    /**
     * Get memory usage info
     */
    getMemoryInfo() {
        return {
            cachedModels: this.gltfCache.size,
            pooledModels: this.modelPool.size,
            quality: this.currentQuality,
        };
    }
}

// Singleton instance
const loaderInstance = new ModelLoaderElite();

/**
 * Load player avatar (uses singleton loader)
 */
export async function loadPlayerAvatar(scene, options = {}) {
    return loaderInstance.loadPlayerAvatar(scene, options);
}

/**
 * Load NPC avatar (uses singleton loader)
 */
export async function loadNPCAvatar(colorPreset, options = {}) {
    return loaderInstance.loadNPCAvatar(colorPreset, options);
}

/**
 * Get the singleton loader instance
 */
export function getModelLoader() {
    return loaderInstance;
}

/**
 * Set shadow quality globally
 */
export function setModelQuality(quality) {
    loaderInstance.setQuality(quality);
}
