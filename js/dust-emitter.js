/**
 * Dust Emitter System
 * Particle effects for building impacts to add weight and consequence
 */

import * as THREE from 'three';
import { JUICE_SPRINT_CONFIG } from './config.js';

export function createDustEmitterSystem(scene, maxDust = 50) {
    const dustParticles = [];
    const config = JUICE_SPRINT_CONFIG.DUST_EMITTER;

    function createDustParticle(position) {
        const geo = new THREE.SphereGeometry(0.05, 3, 3);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 5,
            (Math.random() - 0.5) * 5
        );
        mesh.userData.lifetime = config.LIFETIME;
        mesh.userData.maxLifetime = config.LIFETIME;
        scene.add(mesh);
        return mesh;
    }

    return {
        spawnDustCloud(position, count = config.PARTICLES_PER_IMPACT) {
            if (!config.ENABLED) return;

            for (let i = 0; i < count; i++) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 1.0,
                    0,
                    (Math.random() - 0.5) * 1.0
                );
                if (dustParticles.length >= config.MAX_PARTICLES) {
                    const old = dustParticles.shift();
                    scene.remove(old);
                    old.geometry.dispose();
                    old.material.dispose();
                }
                const particle = createDustParticle(position.clone().add(offset));
                dustParticles.push(particle);
            }
        },

        update(deltaTime) {
            for (let i = dustParticles.length - 1; i >= 0; i--) {
                const dust = dustParticles[i];

                // Simple physics
                dust.userData.velocity.y -= deltaTime * 5; // Gravity
                dust.position.add(dust.userData.velocity.clone().multiplyScalar(deltaTime));

                // Fade out
                dust.userData.lifetime -= deltaTime;
                const progress = dust.userData.lifetime / dust.userData.maxLifetime;
                dust.material.opacity = 0.6 * progress;

                if (progress <= 0) {
                    scene.remove(dust);
                    dust.geometry.dispose();
                    dust.material.dispose();
                    dustParticles.splice(i, 1);
                }
            }
        },

        dispose() {
            for (let i = 0; i < dustParticles.length; i++) {
                scene.remove(dustParticles[i]);
                dustParticles[i].geometry.dispose();
                dustParticles[i].material.dispose();
            }
            dustParticles.length = 0;
        }
    };
}
