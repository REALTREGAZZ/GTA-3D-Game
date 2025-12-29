/**
 * Particle Manager
 * Centralized particle system with 500 particle limit for 60 FPS optimization
 */

import * as THREE from 'three';

export const PARTICLE_CONFIG = {
    MAX_PARTICLES: 500,
    SYSTEM_LIFETIME: 5.0, // Auto-cleanup systems after 5 seconds
    GPU_PARTICLE_THRESHOLD: 100, // Use GPU instancing for >100 particles
};

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        this.particles = [];
        this.activeCount = 0;
    }

    /**
     * Create a new particle system
     */
    createSystem(name, options = {}) {
        const {
            maxParticles = 50,
            color = 0xFFFFFF,
            size = 0.1,
            lifetime = 1.0,
            speed = 5,
            spread = 0.5,
            blending = THREE.AdditiveBlending,
            gravity = -2.0,
            texture = null,
        } = options;

        // Check if we can add more particles
        if (this.activeCount + maxParticles > PARTICLE_CONFIG.MAX_PARTICLES) {
            console.warn(`[ParticleManager] Particle limit reached (${PARTICLE_CONFIG.MAX_PARTICLES}), removing oldest systems`);
            this.cleanupOldSystems();
        }

        // Use InstancedMesh for better performance with many particles
        const useInstancing = maxParticles > PARTICLE_CONFIG.GPU_PARTICLE_THRESHOLD;

        let geometry, material, mesh;

        if (useInstancing) {
            geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(maxParticles * 3);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            material = new THREE.PointsMaterial({
                color,
                size,
                transparent: true,
                opacity: 0.8,
                blending,
                depthWrite: false,
                sizeAttenuation: true,
            });

            mesh = new THREE.InstancedMesh(geometry, material, maxParticles);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        } else {
            geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(maxParticles * 3);
            const velocities = new Float32Array(maxParticles * 3);
            const lifetimes = new Float32Array(maxParticles);

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
            geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

            material = new THREE.PointsMaterial({
                color,
                size,
                transparent: true,
                opacity: 0.8,
                blending,
                depthWrite: false,
                sizeAttenuation: true,
            });

            mesh = new THREE.Points(geometry, material);
        }

        mesh.userData = {
            name,
            maxParticles,
            usedParticles: 0,
            velocities: useInstancing ? null : new Float32Array(maxParticles * 3),
            lifetimes: new Float32Array(maxParticles),
            creationTime: Date.now(),
            gravity,
            speed,
            spread,
            useInstancing,
            isActive: true,
        };

        this.scene.add(mesh);
        this.systems.push(mesh);
        this.activeCount += maxParticles;

        console.log(`[ParticleManager] Created system "${name}" with ${maxParticles} particles (total: ${this.activeCount})`);

        return mesh;
    }

    /**
     * Emit particles from a position
     */
    emit(system, position, count = 1, direction = new THREE.Vector3(0, 1, 0)) {
        if (!system || !system.userData.isActive) return null;

        const data = system.userData;
        if (data.usedParticles + count > data.maxParticles) {
            count = Math.max(0, data.maxParticles - data.usedParticles);
        }

        const positions = system.geometry.attributes.position.array;

        for (let i = 0; i < count; i++) {
            const idx = data.usedParticles + i;
            const baseIdx = idx * 3;

            // Set position
            positions[baseIdx] = position.x;
            positions[baseIdx + 1] = position.y;
            positions[baseIdx + 2] = position.z;

            // Set velocity (direction + random spread)
            if (!data.useInstancing) {
                const velIdx = idx * 3;
                data.velocities[velIdx] = direction.x * data.speed + (Math.random() - 0.5) * data.spread;
                data.velocities[velIdx + 1] = direction.y * data.speed + (Math.random() - 0.5) * data.spread;
                data.velocities[velIdx + 2] = direction.z * data.speed + (Math.random() - 0.5) * data.spread;
            }

            // Set lifetime
            data.lifetimes[idx] = Math.random() * data.lifetime || 1.0;
        }

        data.usedParticles += count;

        // Mark geometry for update
        system.geometry.attributes.position.needsUpdate = true;
        if (!data.useInstancing && system.geometry.attributes.velocity) {
            system.geometry.attributes.velocity.needsUpdate = true;
        }
        if (system.geometry.attributes.lifetime) {
            system.geometry.attributes.lifetime.needsUpdate = true;
        }

        return system;
    }

    /**
     * Update all particle systems
     */
    update(deltaTime) {
        const now = Date.now();

        for (let i = this.systems.length - 1; i >= 0; i--) {
            const system = this.systems[i];
            const data = system.userData;

            if (!data.isActive) continue;

            // Auto-cleanup old systems
            if (now - data.creationTime > PARTICLE_CONFIG.SYSTEM_LIFETIME * 1000) {
                this.removeSystem(i);
                continue;
            }

            const positions = system.geometry.attributes.position.array;
            const gravity = data.gravity;

            // Update each particle
            for (let j = 0; j < data.usedParticles; j++) {
                data.lifetimes[j] -= deltaTime;

                if (data.lifetimes[j] <= 0) {
                    // Remove particle by swapping with last
                    this.removeParticle(system, j);
                    j--;
                    continue;
                }

                const idx = j * 3;

                if (!data.useInstancing) {
                    // Update velocity with gravity
                    const velIdx = j * 3;
                    data.velocities[velIdx + 1] += gravity * deltaTime;

                    // Update position
                    positions[idx] += data.velocities[velIdx] * deltaTime;
                    positions[idx + 1] += data.velocities[velIdx + 1] * deltaTime;
                    positions[idx + 2] += data.velocities[velIdx + 2] * deltaTime;
                }
            }

            // Update geometry
            system.geometry.attributes.position.needsUpdate = true;
            if (!data.useInstancing && system.geometry.attributes.velocity) {
                system.geometry.attributes.velocity.needsUpdate = true;
            }
            system.geometry.attributes.lifetime.needsUpdate = true;

            // Update draw range
            system.geometry.setDrawRange(0, data.usedParticles);
        }
    }

    /**
     * Remove a single particle from system
     */
    removeParticle(system, index) {
        const data = system.userData;
        const lastIndex = data.usedParticles - 1;

        if (index === lastIndex) {
            data.usedParticles--;
            return;
        }

        // Swap with last
        const positions = system.geometry.attributes.position.array;
        const lastIdx = lastIndex * 3;
        const idx = index * 3;

        positions[idx] = positions[lastIdx];
        positions[idx + 1] = positions[lastIdx + 1];
        positions[idx + 2] = positions[lastIdx + 2];

        if (!data.useInstancing) {
            const velocities = system.geometry.attributes.velocity.array;
            const velIdx = index * 3;
            const lastVelIdx = lastIndex * 3;

            velocities[velIdx] = velocities[lastVelIdx];
            velocities[velIdx + 1] = velocities[lastVelIdx + 1];
            velocities[velIdx + 2] = velocities[lastVelIdx + 2];
        }

        data.lifetimes[index] = data.lifetimes[lastIndex];
        data.usedParticles--;
    }

    /**
     * Remove oldest systems when at particle limit
     */
    cleanupOldSystems() {
        while (this.activeCount > PARTICLE_CONFIG.MAX_PARTICLES && this.systems.length > 0) {
            // Find oldest active system
            let oldestIdx = -1;
            let oldestTime = Infinity;

            for (let i = 0; i < this.systems.length; i++) {
                const system = this.systems[i];
                if (system.userData.isActive && system.userData.creationTime < oldestTime) {
                    oldestTime = system.userData.creationTime;
                    oldestIdx = i;
                }
            }

            if (oldestIdx >= 0) {
                const removed = this.systems[oldestIdx];
                this.activeCount -= removed.userData.maxParticles;
                this.removeSystem(oldestIdx);
            }
        }
    }

    /**
     * Remove a system by index
     */
    removeSystem(index) {
        const system = this.systems[index];
        if (!system) return;

        this.scene.remove(system);
        this.activeCount -= system.userData.maxParticles;

        system.geometry.dispose();
        system.material.dispose();

        this.systems.splice(index, 1);
    }

    /**
     * Clear all particle systems
     */
    clear() {
        for (let i = this.systems.length - 1; i >= 0; i--) {
            this.removeSystem(i);
        }
        this.systems = [];
        this.activeCount = 0;
    }

    /**
     * Get active particle count
     */
    getActiveCount() {
        return this.activeCount;
    }

    /**
     * Get system count
     */
    getSystemCount() {
        return this.systems.length;
    }
}

/**
 * Quick particle burst utility
 */
export function createQuickBurst(scene, position, options = {}) {
    const {
        color = 0xFF6B00,
        count = 20,
        speed = 5,
        lifetime = 0.5,
        size = 0.2,
    } = options;

    const manager = new ParticleManager(scene);
    const system = manager.createSystem('burst', {
        maxParticles: count,
        color,
        size,
        speed,
        lifetime,
        blending: THREE.AdditiveBlending,
    });

    manager.emit(system, position, count);

    // Auto-cleanup after burst
    setTimeout(() => {
        manager.clear();
    }, (lifetime * 1000) + 100);

    return manager;
}
