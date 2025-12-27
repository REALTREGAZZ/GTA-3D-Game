/**
 * Decal System
 * Tiny pooled ground decals for heavy impacts (cracks/scorches).
 */

import * as THREE from 'three';

export function createDecalSystem(scene, maxDecals = 20) {
    const decalPool = [];
    const activeDecals = [];

    const sharedGeometry = new THREE.PlaneGeometry(2, 2);

    function createDecalMesh() {
        const mat = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(sharedGeometry, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.userData.lifetime = 0;
        mesh.userData.maxLifetime = 5.0;
        return mesh;
    }

    for (let i = 0; i < maxDecals; i++) {
        decalPool.push(createDecalMesh());
    }

    function recycleDecal(decal) {
        if (!decal) return;
        decal.visible = false;
        decal.userData.lifetime = 0;
        decal.material.opacity = 0;
        scene?.remove?.(decal);
        decalPool.push(decal);
    }

    return {
        spawnDecal(position, lifetime = 5.0) {
            if (!scene || !position) return;

            let decal = null;

            if (decalPool.length > 0) {
                decal = decalPool.pop();
            } else if (activeDecals.length > 0) {
                decal = activeDecals.shift();
                scene.remove(decal);
            } else {
                decal = createDecalMesh();
            }

            decal.visible = true;
            decal.position.copy(position);
            decal.position.y += 0.01; // critical: avoid Z-fighting
            decal.rotation.z = Math.random() * Math.PI * 2;

            decal.userData.lifetime = 0;
            decal.userData.maxLifetime = lifetime;
            decal.material.opacity = 0.7;

            scene.add(decal);
            activeDecals.push(decal);
        },

        update(deltaTime) {
            for (let i = activeDecals.length - 1; i >= 0; i--) {
                const decal = activeDecals[i];
                decal.userData.lifetime += deltaTime;

                const progress = decal.userData.lifetime / Math.max(0.0001, decal.userData.maxLifetime);
                decal.material.opacity = 0.7 * (1 - Math.min(1, progress));

                if (progress >= 1.0) {
                    activeDecals.splice(i, 1);
                    recycleDecal(decal);
                }
            }
        },

        dispose() {
            for (let i = activeDecals.length - 1; i >= 0; i--) {
                const decal = activeDecals[i];
                scene?.remove?.(decal);
                decal.material?.dispose?.();
            }
            activeDecals.length = 0;

            for (let i = decalPool.length - 1; i >= 0; i--) {
                decalPool[i].material?.dispose?.();
            }
            decalPool.length = 0;

            sharedGeometry.dispose();
        },

        setMaxDecals(count) {
            // Dynamic scaling: adjust max decals
            const currentMax = decalPool.length + activeDecals.length;
            if (count < currentMax) {
                // Reduce: remove excess decals from pool
                while (decalPool.length > count && decalPool.length > 0) {
                    const decal = decalPool.pop();
                    decal.material?.dispose?.();
                }
            } else if (count > currentMax) {
                // Increase: create more decals
                const needed = count - decalPool.length;
                for (let i = 0; i < needed; i++) {
                    decalPool.push(createDecalMesh());
                }
            }
        },
    };
}
