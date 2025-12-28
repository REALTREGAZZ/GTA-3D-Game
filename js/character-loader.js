/**
 * Character Loader System
 * Loads and clones GLB models (including skinned meshes) and merges animations.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const DEFAULT_HIP_BONE_NAMES = ['mixamorigHips', 'Hips', 'hips'];

export function normalizeAnimationName(name) {
    const n = String(name || '').toLowerCase();

    if (n.includes('idle')) return 'idle';
    if (n.includes('walk')) return 'walk';
    if (n.includes('run')) return 'run';
    if (n.includes('jump')) return 'jump';
    if (n.includes('fall')) return 'fall';
    if (n.includes('punch') || n.includes('attack') || n.includes('hit')) return 'attack';

    return n;
}

function alignSceneToHips(scene, hipBoneNames = DEFAULT_HIP_BONE_NAMES) {
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

function collectMaterials(object3d) {
    const materials = new Set();
    object3d?.traverse?.((node) => {
        if (!node?.isMesh || !node.material) return;
        if (Array.isArray(node.material)) {
            node.material.forEach((m) => materials.add(m));
        } else {
            materials.add(node.material);
        }
    });
    return Array.from(materials);
}

export class CharacterLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.gltfCache = new Map();
    }

    loadGLTF(url) {
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

    async loadFirstAvailable(urls) {
        const list = Array.isArray(urls) ? urls : [urls];
        let lastErr = null;

        for (const url of list) {
            try {
                return await this.loadGLTF(url);
            } catch (err) {
                lastErr = err;
            }
        }

        throw lastErr ?? new Error('No GLTF model URLs succeeded');
    }

    extractAnimationMap(clips = [], explicitMap = null) {
        const map = {};

        if (explicitMap) {
            for (const [key, clip] of Object.entries(explicitMap)) {
                if (clip) map[key] = clip;
            }
            return map;
        }

        for (const clip of clips) {
            const key = normalizeAnimationName(clip?.name);
            if (!key) continue;
            if (!map[key]) {
                map[key] = clip;
            }
        }

        return map;
    }

    async loadCharacterBase({ modelUrls, animationUrlsMap = null }) {
        const modelGltf = await this.loadFirstAvailable(modelUrls);

        let explicitMap = null;
        if (animationUrlsMap) {
            explicitMap = {};
            for (const [key, url] of Object.entries(animationUrlsMap)) {
                try {
                    const animGltf = await this.loadGLTF(url);
                    explicitMap[key] = animGltf?.animations?.[0] ?? null;
                } catch {
                    explicitMap[key] = null;
                }
            }
        }

        const animationMap = this.extractAnimationMap(modelGltf?.animations ?? [], explicitMap);

        return {
            gltf: modelGltf,
            animationMap,
        };
    }

    createInstance(baseGltf, { alignHips = true } = {}) {
        const scene = cloneSkinned(baseGltf.scene);
        scene.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        if (alignHips) {
            alignSceneToHips(scene);
        }

        return {
            scene,
            materials: collectMaterials(scene),
        };
    }
}
