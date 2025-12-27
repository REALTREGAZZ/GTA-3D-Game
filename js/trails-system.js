/**
 * Trails System
 * Motion lines for flying NPCs to amplify impact sensation
 */

import * as THREE from 'three';
import { JUICE_SPRINT_CONFIG } from './config.js';

export function createTrailsSystem(scene, maxTrails = 100) {
    const trails = [];
    const config = JUICE_SPRINT_CONFIG.TRAILS;
    let activeTrailCount = 0;

    function createTrailParticle(position, color = config.COLOR) {
        const geo = new THREE.SphereGeometry(0.1, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.userData.lifetime = config.LIFETIME;
        mesh.userData.maxLifetime = config.LIFETIME;
        scene.add(mesh);
        activeTrailCount++;
        return mesh;
    }

    function disposeTrail(trail) {
        scene.remove(trail);
        if (trail.geometry) trail.geometry.dispose();
        if (trail.material) trail.material.dispose();
        activeTrailCount--;
    }

    return {
        spawnTrail(position, color = config.COLOR) {
            if (!config.ENABLED) return;

            if (trails.length >= config.MAX_TRAILS) {
                const old = trails.shift();
                disposeTrail(old);
            }
            const particle = createTrailParticle(position, color);
            trails.push(particle);
        },

        update(deltaTime) {
            for (let i = trails.length - 1; i >= 0; i--) {
                const trail = trails[i];
                trail.userData.lifetime -= deltaTime;

                // Fade out
                const progress = trail.userData.lifetime / trail.userData.maxLifetime;
                trail.material.opacity = 0.8 * progress;

                if (progress <= 0) {
                    disposeTrail(trail);
                    trails.splice(i, 1);
                }
            }
        },

        getActiveCount() {
            return activeTrailCount;
        },

        setMaxParticles(count) {
            // Dynamic scaling: adjust max particles
            config.MAX_TRAILS = count;
        },

        clear() {
            while (trails.length > 0) {
                const trail = trails.pop();
                disposeTrail(trail);
            }
            console.log('TrailsSystem.clear() - All trails disposed');
        },

        dispose() {
            this.clear();
        }
    };
}
