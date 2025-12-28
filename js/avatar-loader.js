/**
 * Avatar Loader
 * Optional GLB-based player avatar loading.
 *
 * This project ships with a procedural fallback player model. If you add Mixamo
 * assets under /assets/models, this loader can be wired to swap the player mesh.
 */

import * as THREE from 'three';

export async function loadAvatarGLB(url) {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

    return new Promise((resolve) => {
        const loader = new GLTFLoader();
        loader.load(
            url,
            (gltf) => resolve(gltf),
            undefined,
            () => resolve(null)
        );
    });
}

export function applyAvatarShadows(root) {
    if (!root) return;
    root.traverse((obj) => {
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.frustumCulled = true;
            if (obj.material && 'side' in obj.material) {
                obj.material.side = THREE.FrontSide;
            }
        }
    });
}
