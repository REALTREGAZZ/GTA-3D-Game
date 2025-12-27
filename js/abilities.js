/**
 * Ability System - Gravity Blast
 * The "Viral Hook" - Launch NPCs into the air for pure emergent fun
 */

import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';
import { audioEngine } from './audio-engine.js';

export function createAbilitySystem(player, scene, camera, gameState, options = {}) {
    const { npcSystem = null, combatSystem = null, chaosCamera = null, postProcessing = null } = options;

    const config = GAME_CONFIG.ABILITY_CONFIG?.GRAVITY_BLAST || {
        COOLDOWN: 5.0,
        RADIUS: 5.0,
        STRENGTH: 35.0,
        UPWARD_FORCE: 40.0,
        SUSPENSION_TIME: 0.5,
        CHARGE_DURATION: 0.3,
        CHARGE_AUDIO_VOLUME: 0.6,
        IMPACT_AUDIO_VOLUME: 1.0,
    };

    const state = {
        gravityBlastCooldown: 0,
        gravityBlastCharge: 0,
        chargeVisual: null,
        isCharging: false,
    };

    // Create charge aura visual (simple glowing ring around player)
    function createChargeAura() {
        const geometry = new THREE.TorusGeometry(1.5, 0.15, 16, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.0,
        });
        const aura = new THREE.Mesh(geometry, material);
        aura.rotation.x = Math.PI / 2;
        aura.visible = false;
        scene.add(aura);
        return aura;
    }

    state.chargeVisual = createChargeAura();

    /**
     * Check if Gravity Blast is ready (not on cooldown)
     */
    function isGravityBlastReady() {
        return state.gravityBlastCooldown <= 0 && !state.isCharging;
    }

    /**
     * Get remaining cooldown in seconds
     */
    function getGravityBlastCooldown() {
        return Math.max(0, state.gravityBlastCooldown);
    }

    /**
     * Get all NPCs in radius from position
     */
    function getAllNPCsInRadius(position, radius) {
        if (!npcSystem) return [];
        
        const npcs = npcSystem.getAllActiveNPCs ? npcSystem.getAllActiveNPCs() : 
                     (npcSystem.state?.active || []);
        
        return npcs.filter(npc => {
            if (!npc || !npc.mesh || !npc.state?.active) return false;
            if (npc.state.state === 'DEAD') return false;
            const distance = npc.mesh.position.distanceTo(position);
            return distance <= radius;
        });
    }

    /**
     * Create expanding shockwave visual effect
     */
    function createShockwave(epicenter) {
        const geometry = new THREE.RingGeometry(0.5, 1.0, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
        });
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.rotation.x = -Math.PI / 2;
        shockwave.position.copy(epicenter);
        shockwave.position.y = 0.1;
        scene.add(shockwave);

        // Animate expansion
        const startTime = Date.now();
        const duration = 300; // 0.3 seconds

        function animateShockwave() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1.0, elapsed / duration);

            if (progress < 1.0) {
                // Expand scale
                const scale = 1.0 + progress * 7.0; // 1.0 → 8.0
                shockwave.scale.set(scale, scale, 1);

                // Fade out
                material.opacity = 1.0 - progress;

                requestAnimationFrame(animateShockwave);
            } else {
                // Remove from scene
                scene.remove(shockwave);
                geometry.dispose();
                material.dispose();
            }
        }

        animateShockwave();
    }

    /**
     * Create energy particles that shoot outward
     */
    function createEnergyParticles(epicenter) {
        const particleCount = 25;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 1.0,
            });
            const particle = new THREE.Mesh(geometry, material);
            
            // Random direction
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 5 + Math.random() * 10; // 5-15 u/s
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * 5, // Some upward component
                Math.sin(angle) * speed
            );

            particle.position.copy(epicenter);
            particle.userData.velocity = velocity;
            particle.userData.lifetime = 0;
            particle.userData.maxLifetime = 1.0;

            scene.add(particle);
            particles.push(particle);
        }

        // Animate particles
        function animateParticles() {
            let anyAlive = false;

            for (const particle of particles) {
                particle.userData.lifetime += 0.016; // ~60fps
                const progress = particle.userData.lifetime / particle.userData.maxLifetime;

                if (progress < 1.0) {
                    anyAlive = true;
                    
                    // Update position
                    particle.position.add(
                        particle.userData.velocity.clone().multiplyScalar(0.016)
                    );

                    // Fade out
                    particle.material.opacity = 1.0 - progress;
                } else {
                    // Cleanup
                    scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                }
            }

            if (anyAlive) {
                requestAnimationFrame(animateParticles);
            }
        }

        animateParticles();
    }

    /**
     * Activate Gravity Blast ability
     */
    function activateGravityBlast() {
        if (!isGravityBlastReady()) {
            console.log('Gravity Blast on cooldown:', state.gravityBlastCooldown.toFixed(1));
            return;
        }

        // Start charging phase
        state.isCharging = true;
        state.gravityBlastCharge = config.CHARGE_DURATION;

        const playerPos = player.getPosition();

        // Show charge aura
        if (state.chargeVisual) {
            state.chargeVisual.visible = true;
            state.chargeVisual.position.copy(playerPos);
            state.chargeVisual.position.y = 0.5;
        }

        // Play charging sound
        audioEngine.playSynthSound('CHARGE', playerPos, config.CHARGE_AUDIO_VOLUME);

        console.log('Gravity Blast charging...');
    }

    /**
     * Execute the Gravity Blast (after charge completes)
     */
    function executeGravityBlast() {
        const playerPos = player.getPosition();
        const playerRotation = player.getRotation();
        
        // Calculate epicenter: 2 meters in front of player
        const forward = new THREE.Vector3(Math.sin(playerRotation), 0, Math.cos(playerRotation));
        const epicenter = playerPos.clone().add(forward.multiplyScalar(2.0));

        // Find all NPCs in radius
        const affectedNPCs = getAllNPCsInRadius(epicenter, config.RADIUS);

        console.log(`Gravity Blast executed! Affected ${affectedNPCs.length} NPCs`);

        // Apply impulse to each NPC
        for (const npc of affectedNPCs) {
            // Calculate direction from epicenter to NPC
            const toNPC = npc.mesh.position.clone().sub(epicenter);
            toNPC.y = 0; // Keep horizontal
            const direction = toNPC.normalize();

            // Dizzy State: 2x damage multiplier for Dizzy NPCs
            let damageMultiplier = 1.0;
            if (npc.state && npc.state.isDizzy) {
                damageMultiplier = 2.0;
                console.log(`Gravity Blast: 2x damage on Dizzy NPC!`);
            }

            // Calculate impulse vector
            const impulseVector = new THREE.Vector3();
            impulseVector.x = direction.x * config.STRENGTH * damageMultiplier;
            impulseVector.y = config.UPWARD_FORCE * damageMultiplier;
            impulseVector.z = direction.z * config.STRENGTH * damageMultiplier;

            // Apply to NPC velocity
            if (npc.state.velocity) {
                npc.state.velocity.copy(impulseVector);
            }

            // Apply extra damage to Dizzy NPCs
            if (damageMultiplier > 1.0 && npc.takeDamage) {
                const bonusDamage = 30 * (damageMultiplier - 1.0); // 30 bonus damage for 2x
                npc.takeDamage(bonusDamage, null, config.STRENGTH * damageMultiplier);
            }

            // Enter ragdoll (real airtime) + then freeze horizontal briefly (anticipation)
            if (npc.enterRagdoll) {
                const ragdollDuration = (GAME_CONFIG.COMBAT.RAGDOLL_DURATION || 2.0) + config.SUSPENSION_TIME;
                // Longer ragdoll for Dizzy NPCs
                const finalRagdollDuration = damageMultiplier > 1.0 ? ragdollDuration * 1.5 : ragdollDuration;
                npc.enterRagdoll(finalRagdollDuration, { playSound: false, showOverlay: false });
            }

            if (npc.enterSuspension) {
                npc.enterSuspension(config.SUSPENSION_TIME);
            } else {
                npc.state.isSuspended = true;
                npc.state.suspensionTimer = config.SUSPENSION_TIME;
            }

            // Play ARGH sound for each NPC (voice culling will limit to 4)
            audioEngine.playSynthSound('ARGH', npc.mesh.position, 1.0);

            // Show satirical text if high count
            if (affectedNPCs.length >= 10 && window.OverlaySystem) {
               window.OverlaySystem.show('CHAOS UNLEASHED', 2.0, true);
            }

            // Trigger viral factory effects for Gravity Blast
            if (window.DopaminePopupSystem) {
                window.DopaminePopupSystem.spawn(npc.mesh.position, 'YEET');
            }
        }

        // Trigger epic viral effects for massive Gravity Blasts
        if (affectedNPCs.length >= 5) {
            // Trigger camera zoom
            if (camera.triggerImpactZoom) {
                camera.triggerImpactZoom(1.2, 0.15);
            }

            // Trigger time freeze
            if (window.GlobalTimeFreeze) {
                window.GlobalTimeFreeze.slowMotion(0.1, 0.15);
            }

            // Trigger epic dopamine popups
            if (window.DopaminePopupSystem) {
                window.DopaminePopupSystem.spawn(epicenter, 'MEGA_YEET');
                if (affectedNPCs.length >= 8) {
                    window.DopaminePopupSystem.spawn(epicenter.clone().add(new THREE.Vector3(3, 0, 0)), 'OCTUPLE_BONK');
                }
            }
        }

        // Visual feedback
        createShockwave(epicenter);
        createEnergyParticles(epicenter);

        // Audio feedback - THWOOM impact
        audioEngine.playSynthSound('THWOOM', epicenter, config.IMPACT_AUDIO_VOLUME);

        // Post-processing punch
        postProcessing?.triggerChromaticAberration?.();

        // Camera effects
        if (chaosCamera && chaosCamera.applyFOVKick) {
            // Dramatic zoom in
            chaosCamera.applyFOVKick(40, 0.2);
            
            // Schedule zoom out
            setTimeout(() => {
                if (chaosCamera.applyFOVKick) {
                    chaosCamera.applyFOVKick(75, 0.3);
                }
            }, 200);
        }

        // Apply screen shake
        if (window.applyScreenShake) {
            window.applyScreenShake(0.8, 0.3);
        }

        // Start cooldown
        state.gravityBlastCooldown = config.COOLDOWN;

        // Hide charge aura
        if (state.chargeVisual) {
            state.chargeVisual.visible = false;
        }

        state.isCharging = false;
    }

    /**
     * Update ability system
     */
    function update(deltaTime) {
        // Update cooldown
        if (state.gravityBlastCooldown > 0) {
            state.gravityBlastCooldown -= deltaTime;
        }

        // Update charging
        if (state.isCharging) {
            state.gravityBlastCharge -= deltaTime;

            // Animate charge aura
            if (state.chargeVisual && state.chargeVisual.visible) {
                const playerPos = player.getPosition();
                state.chargeVisual.position.copy(playerPos);
                state.chargeVisual.position.y = 0.5;
                
                // Pulse effect
                const progress = 1 - (state.gravityBlastCharge / config.CHARGE_DURATION);
                state.chargeVisual.material.opacity = 0.3 + progress * 0.7;
                state.chargeVisual.rotation.z += deltaTime * 5;
            }

            // Execute when charge completes
            if (state.gravityBlastCharge <= 0) {
                executeGravityBlast();
            }
        }
    }

    /**
     * Cleanup
     */
    function dispose() {
        if (state.chargeVisual) {
            scene.remove(state.chargeVisual);
            state.chargeVisual.geometry.dispose();
            state.chargeVisual.material.dispose();
        }
    }

    return {
        state,
        activateGravityBlast,
        isGravityBlastReady,
        getGravityBlastCooldown,
        update,
        dispose,
    };
}
