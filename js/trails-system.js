/**
 * Trails System
 * Motion lines for flying NPCs to amplify impact sensation
 */

import * as THREE from 'three';
import { JUICE_SPRINT_CONFIG } from './config.js';

export function createTrailsSystem(scene, maxTrails = 100) {
    const trails = [];
    const config = JUICE_SPRINT_CONFIG.TRAILS;

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
        return mesh;
    }

    return {
        spawnTrail(position, color = config.COLOR) {
            if (!config.ENABLED) return;

            if (trails.length >= config.MAX_TRAILS) {
                const old = trails.shift();
                scene.remove(old);
                old.geometry.dispose();
                old.material.dispose();
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
                    scene.remove(trail);
                    trail.geometry.dispose();
                    trail.material.dispose();
                    trails.splice(i, 1);
                }
            }
        },

        dispose() {
            for (let i = 0; i < trails.length; i++) {
                scene.remove(trails[i]);
                trails[i].geometry.dispose();
                trails[i].material.dispose();
            }
            trails.length = 0;
        }
    };
}
