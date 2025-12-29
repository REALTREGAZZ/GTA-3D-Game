/**
 * Boss Visual Effects System
 * Epic visual effects for legendary bosses: Gore-Neon particles, screen shake, hitstop, decals
 */

import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';

export class BossVisualEffects {
    constructor(scene) {
        this.scene = scene;
        this.particleSystems = new Map();
        this.activeParticles = [];
        this.maxParticles = 500;

        // Boss-specific colors
        this.bossColors = {
            malakor: { color: 0xFF6B00, emissive: 0xFF3300 },   // Orange fire
            sylphira: { color: 0x9933FF, emissive: 0x6600FF },  // Purple magic
            voideater: { color: 0x1a1a1a, emissive: 0xFF0000 }  // Black with red flash
        };

        console.log('[BossVFX] Visual effects system initialized');
    }

    /**
     * Spawn attack particles for a boss
     */
    spawnAttackParticles(boss, position, options = {}) {
        const {
            count = 30,
            color = null,
            speed = 5,
            spread = 0.5,
            lifetime = 1.0,
            size = 0.3
        } = options;

        const bossColor = color || this.getBossColor(boss.name);
        const particles = this.createParticleSystem(boss.name + '_attack', {
            color: bossColor,
            count: Math.min(count, this.maxParticles - this.activeParticles.length),
            speed,
            spread,
            lifetime,
            size,
            isGlowing: true
        });

        // Emit particles from attack position
        this.emitParticles(particles, position, options.direction || new THREE.Vector3(0, 1, 0));
    }

    /**
     * Spawn hit impact effects
     */
    spawnHitEffects(position, intensity = 1.0, boss = null) {
        const count = Math.floor(20 * intensity);

        // Gore-neon particles
        this.spawnAttackParticles(boss, position, {
            count: count,
            speed: 8 * intensity,
            lifetime: 0.5,
            size: 0.2 * intensity
        });

        // Trigger global effects if available
        if (typeof window.applyScreenShake === 'function') {
            window.applyScreenShake(0.5, 0.15);
        }

        if (typeof window.triggerImpactFrame === 'function') {
            window.triggerImpactFrame();
        }
    }

    /**
     * Create a particle system
     */
    createParticleSystem(name, options = {}) {
        const {
            color = 0xFFFFFF,
            count = 50,
            speed = 5,
            spread = 0.5,
            lifetime = 1.0,
            size = 0.3,
            isGlowing = false
        } = options;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            velocities[i * 3] = (Math.random() - 0.5) * spread * speed;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * spread * speed;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * spread * speed;

            lifetimes[i] = Math.random() * lifetime;
            sizes[i] = size * (0.5 + Math.random() * 0.5);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: color,
            size: size,
            transparent: true,
            opacity: 0.8,
            blending: isGlowing ? THREE.AdditiveBlending : THREE.NormalBlending,
            depthWrite: false
        });

        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.userData = {
            velocities,
            lifetimes,
            maxLifetime: lifetime,
            isActive: true,
            name
        };

        this.scene.add(particleSystem);
        this.particleSystems.set(name, particleSystem);
        this.activeParticles.push(particleSystem);

        return particleSystem;
    }

    /**
     * Emit particles from a position
     */
    emitParticles(particleSystem, position, direction) {
        if (!particleSystem || !particleSystem.userData.isActive) return;

        const positions = particleSystem.geometry.attributes.position.array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
        }

        particleSystem.geometry.attributes.position.needsUpdate = true;
        particleSystem.userData.direction = direction.clone().normalize();
    }

    /**
     * Update all particle systems
     */
    update(deltaTime) {
        for (const [name, particleSystem] of this.particleSystems) {
            if (!particleSystem.userData.isActive) continue;

            const positions = particleSystem.geometry.attributes.position.array;
            const velocities = particleSystem.geometry.attributes.velocity.array;
            const lifetimes = particleSystem.geometry.attributes.lifetime.array;
            const direction = particleSystem.userData.direction || new THREE.Vector3(0, 1, 0);

            let activeCount = 0;

            for (let i = 0; i < lifetimes.length; i++) {
                lifetimes[i] += deltaTime;

                if (lifetimes[i] < particleSystem.userData.maxLifetime) {
                    // Update position based on velocity
                    positions[i * 3] += velocities[i * 3] * deltaTime;
                    positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
                    positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;

                    // Add some gravity
                    velocities[i * 3 + 1] -= 2.0 * deltaTime;

                    // Add slight direction influence
                    velocities[i * 3] += direction.x * deltaTime;
                    velocities[i * 3 + 1] += direction.y * deltaTime;
                    velocities[i * 3 + 2] += direction.z * deltaTime;

                    // Dampen velocity
                    velocities[i * 3] *= 0.98;
                    velocities[i * 3 + 1] *= 0.98;
                    velocities[i * 3 + 2] *= 0.98;

                    activeCount++;
                }
            }

            particleSystem.geometry.attributes.position.needsUpdate = true;
            particleSystem.geometry.attributes.lifetime.needsUpdate = true;

            // Fade out near end
            const opacity = particleSystem.material.opacity;
            const fadeStart = particleSystem.userData.maxLifetime * 0.7;
            for (let i = 0; i < lifetimes.length; i++) {
                if (lifetimes[i] > fadeStart) {
                    particleSystem.material.opacity = opacity * (1 - (lifetimes[i] - fadeStart) / (particleSystem.userData.maxLifetime - fadeStart));
                    break;
                }
            }

            // Deactivate if all particles are dead
            if (activeCount === 0) {
                this.deactivateParticleSystem(name);
            }
        }

        // Enforce particle limit
        this.enforceParticleLimit();
    }

    /**
     * Deactivate a particle system
     */
    deactivateParticleSystem(name) {
        const particleSystem = this.particleSystems.get(name);
        if (particleSystem) {
            particleSystem.userData.isActive = false;
            this.scene.remove(particleSystem);
            this.particleSystems.delete(name);
            this.activeParticles = this.activeParticles.filter(p => p !== particleSystem);

            // Dispose
            particleSystem.geometry.dispose();
            particleSystem.material.dispose();
        }
    }

    /**
     * Enforce maximum particle limit
     */
    enforceParticleLimit() {
        while (this.activeParticles.length > this.maxParticles) {
            const oldest = this.activeParticles.shift();
            if (oldest && oldest.userData.name) {
                this.deactivateParticleSystem(oldest.userData.name);
            }
        }
    }

    /**
     * Get boss color scheme
     */
    getBossColor(bossName) {
        const key = bossName?.toLowerCase().replace(/\s+/g, '');
        if (this.bossColors[key]) {
            return this.bossColors[key].color;
        }
        return 0xFFFFFF;
    }

    /**
     * Get boss emissive color
     */
    getBossEmissive(bossName) {
        const key = bossName?.toLowerCase().replace(/\s+/g, '');
        if (this.bossColors[key]) {
            return this.bossColors[key].emissive;
        }
        return 0x000000;
    }

    /**
     * Clear all effects
     */
    clear() {
        for (const [name] of this.particleSystems) {
            this.deactivateParticleSystem(name);
        }
        this.activeParticles = [];
    }
}

/**
 * Screen shake system for boss impacts
 */
export class ScreenShakeSystem {
    constructor() {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeDecay = 8.0;
        this.currentOffset = new THREE.Vector3();
        this.targetOffset = new THREE.Vector3();
    }

    /**
     * Trigger screen shake
     */
    shake(intensity = 0.5, duration = 0.15) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    /**
     * Update shake
     */
    update(deltaTime) {
        if (this.shakeDuration <= 0) {
            this.currentOffset.set(0, 0, 0);
            return;
        }

        this.shakeDuration -= deltaTime;
        this.shakeIntensity *= Math.exp(-this.shakeDecay * deltaTime);

        if (this.shakeDuration <= 0 || this.shakeIntensity < 0.001) {
            this.currentOffset.set(0, 0, 0);
            return;
        }

        // Random offset
        this.targetOffset.set(
            (Math.random() - 0.5) * 2 * this.shakeIntensity,
            (Math.random() - 0.5) * 2 * this.shakeIntensity,
            (Math.random() - 0.5) * 2 * this.shakeIntensity
        );

        // Smooth interpolation
        const smoothing = 0.35;
        const lerpFactor = 1 - Math.pow(1 - smoothing, deltaTime * 60);
        this.currentOffset.lerp(this.targetOffset, lerpFactor);
    }

    /**
     * Get current shake offset
     */
    getOffset() {
        return this.currentOffset.clone();
    }
}

/**
 * Hitstop system for dramatic impacts
 */
export class HitstopSystem {
    constructor() {
        this.freezeRemaining = 0;
        this.recoveryRemaining = 0;
        this.baseDuration = 0.05;
        this.recoveryTime = 0.1;
    }

    /**
     * Trigger hitstop
     */
    trigger(intensity = 1.0) {
        const duration = this.baseDuration * (0.5 + 0.5 * intensity);
        this.freezeRemaining = Math.max(this.freezeRemaining, duration);
        this.recoveryRemaining = 0;
    }

    /**
     * Update hitstop
     */
    update(deltaTime) {
        if (this.freezeRemaining > 0) {
            this.freezeRemaining -= deltaTime;
            if (this.freezeRemaining <= 0) {
                this.recoveryRemaining = this.recoveryTime;
            }
            return 0; // Time scale = 0 during freeze
        }

        if (this.recoveryRemaining > 0) {
            this.recoveryRemaining -= deltaTime;
            const t = Math.max(0, 1 - this.recoveryRemaining / this.recoveryTime);
            return t * t; // Smooth recovery
        }

        return 1.0; // Normal time
    }
}
