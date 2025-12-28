/**
 * Grab & Launch Particle Systems
 * Charge trail particles and gore-neon impact particles
 */

import * as THREE from 'three';
import { GRAB_SYSTEM_CONFIG } from './config.js';

/**
 * Charge Particle System
 * Orbital particles around grabbed object with color sync
 */
export function createChargeParticleSystem(scene, maxParticles = 500) {
    const particles = [];
    const config = GRAB_SYSTEM_CONFIG;
    
    function createParticle() {
        const geo = new THREE.SphereGeometry(0.08, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = {
            active: false,
            angle: 0,
            radius: 0,
            speed: 0,
            lifetime: 0,
        };
        scene.add(mesh);
        return mesh;
    }
    
    // Pre-allocate particle pool
    for (let i = 0; i < maxParticles; i++) {
        particles.push(createParticle());
    }
    
    let activeCount = 0;
    
    return {
        /**
         * Spawn orbital particles around target
         * @param {THREE.Vector3} position - Center position
         * @param {number} chargeLevel - 0-100
         */
        spawnChargeParticles(position, chargeLevel) {
            const chargeRatio = chargeLevel / 100;
            const count = Math.floor(config.CHARGE_PARTICLE_COUNT * chargeRatio);
            
            // Get color based on charge level
            let color;
            if (chargeLevel < 50) {
                // White to Yellow
                color = new THREE.Color(config.COLOR_START).lerp(
                    new THREE.Color(config.COLOR_MID),
                    chargeLevel / 50
                );
            } else {
                // Yellow to Red
                color = new THREE.Color(config.COLOR_MID).lerp(
                    new THREE.Color(config.COLOR_END),
                    (chargeLevel - 50) / 50
                );
            }
            
            for (let i = 0; i < count; i++) {
                // Find inactive particle
                let particle = null;
                for (let j = 0; j < particles.length; j++) {
                    if (!particles[j].userData.active) {
                        particle = particles[j];
                        break;
                    }
                }
                if (!particle) continue;
                
                // Initialize orbital motion
                particle.userData.active = true;
                particle.userData.angle = (i / count) * Math.PI * 2;
                particle.userData.radius = config.CHARGE_PARTICLE_RADIUS * (0.8 + Math.random() * 0.4);
                particle.userData.speed = config.CHARGE_PARTICLE_SPEED * (0.8 + Math.random() * 0.4);
                particle.userData.lifetime = 0.5;
                particle.userData.targetPosition = position.clone();
                
                particle.material.color.copy(color);
                particle.material.opacity = 0.8 * chargeRatio;
                
                activeCount++;
            }
        },
        
        /**
         * Update charge particles (orbital motion)
         * @param {number} deltaTime
         */
        update(deltaTime) {
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle.userData.active) continue;
                
                // Update orbital angle
                particle.userData.angle += particle.userData.speed * deltaTime;
                
                // Calculate orbital position
                const x = Math.cos(particle.userData.angle) * particle.userData.radius;
                const y = Math.sin(particle.userData.angle * 2) * 0.5; // Figure-8 motion
                const z = Math.sin(particle.userData.angle) * particle.userData.radius;
                
                particle.position.copy(particle.userData.targetPosition);
                particle.position.x += x;
                particle.position.y += y;
                particle.position.z += z;
                
                // Lifetime decay
                particle.userData.lifetime -= deltaTime;
                if (particle.userData.lifetime <= 0) {
                    particle.userData.active = false;
                    particle.visible = false;
                    activeCount--;
                } else {
                    particle.visible = true;
                }
            }
        },
        
        /**
         * Clear all particles
         */
        clear() {
            for (let i = 0; i < particles.length; i++) {
                particles[i].userData.active = false;
                particles[i].visible = false;
            }
            activeCount = 0;
        },
        
        getActiveCount() {
            return activeCount;
        },
        
        dispose() {
            for (let i = 0; i < particles.length; i++) {
                scene.remove(particles[i]);
                particles[i].geometry.dispose();
                particles[i].material.dispose();
            }
            particles.length = 0;
        }
    };
}

/**
 * Impact Particle System
 * Gore-neon explosion particles with fluorescent colors
 */
export function createImpactParticleSystem(scene, maxParticles = 1000) {
    const particles = [];
    const config = GRAB_SYSTEM_CONFIG;
    
    function createParticle() {
        const geo = new THREE.SphereGeometry(0.12, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 1.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = {
            active: false,
            velocity: new THREE.Vector3(),
            lifetime: 0,
            maxLifetime: 0,
        };
        scene.add(mesh);
        return mesh;
    }
    
    // Pre-allocate particle pool
    for (let i = 0; i < maxParticles; i++) {
        particles.push(createParticle());
    }
    
    let activeCount = 0;
    
    return {
        /**
         * Spawn impact explosion particles
         * @param {THREE.Vector3} position - Impact position
         * @param {number} count - Number of particles
         * @param {number} chargeLevel - 0-100 for velocity scaling
         */
        spawnImpactParticles(position, count, chargeLevel = 100) {
            const chargeRatio = chargeLevel / 100;
            
            for (let i = 0; i < count; i++) {
                // Find inactive particle
                let particle = null;
                for (let j = 0; j < particles.length; j++) {
                    if (!particles[j].userData.active) {
                        particle = particles[j];
                        break;
                    }
                }
                if (!particle) continue;
                
                // Random gore-neon color
                const colorIndex = Math.floor(Math.random() * config.GORE_COLORS.length);
                particle.material.color.setHex(config.GORE_COLORS[colorIndex]);
                
                // Random radial velocity
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const speed = config.IMPACT_PARTICLE_VELOCITY_MIN + 
                             Math.random() * (config.IMPACT_PARTICLE_VELOCITY_MAX - config.IMPACT_PARTICLE_VELOCITY_MIN);
                
                particle.userData.velocity.set(
                    Math.sin(phi) * Math.cos(theta) * speed * chargeRatio,
                    Math.abs(Math.cos(phi)) * speed * chargeRatio * 0.5, // Upward bias
                    Math.sin(phi) * Math.sin(theta) * speed * chargeRatio
                );
                
                particle.position.copy(position);
                particle.userData.active = true;
                particle.userData.lifetime = config.IMPACT_PARTICLE_LIFETIME + 
                                           Math.random() * (config.IMPACT_PARTICLE_LIFETIME_MAX - config.IMPACT_PARTICLE_LIFETIME);
                particle.userData.maxLifetime = particle.userData.lifetime;
                particle.material.opacity = 1.0;
                particle.visible = true;
                
                activeCount++;
            }
        },
        
        /**
         * Update impact particles (gravity + fade)
         * @param {number} deltaTime
         */
        update(deltaTime) {
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle.userData.active) continue;
                
                // Apply gravity
                particle.userData.velocity.y -= 30 * deltaTime; // Gravity
                
                // Update position
                particle.position.add(
                    particle.userData.velocity.clone().multiplyScalar(deltaTime)
                );
                
                // Lifetime decay
                particle.userData.lifetime -= deltaTime;
                const progress = particle.userData.lifetime / particle.userData.maxLifetime;
                
                // Fade out in last 0.5 seconds
                if (particle.userData.lifetime < 0.5) {
                    particle.material.opacity = progress * 2;
                }
                
                if (progress <= 0) {
                    particle.userData.active = false;
                    particle.visible = false;
                    activeCount--;
                }
            }
        },
        
        /**
         * Clear all particles
         */
        clear() {
            for (let i = 0; i < particles.length; i++) {
                particles[i].userData.active = false;
                particles[i].visible = false;
            }
            activeCount = 0;
        },
        
        getActiveCount() {
            return activeCount;
        },
        
        dispose() {
            for (let i = 0; i < particles.length; i++) {
                scene.remove(particles[i]);
                particles[i].geometry.dispose();
                particles[i].material.dispose();
            }
            particles.length = 0;
        }
    };
}
