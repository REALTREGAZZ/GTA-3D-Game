/**
 * Exaggerated Combat System
 * Designed for VIRALITY - Extreme knockback, feedback, and replay
 */

import * as THREE from 'three';
import { GAME_CONFIG, COMBAT_CONFIG, AUDIO_CONFIG, TARGET_CONFIG } from './config.js';

export function createCombatSystem(player, scene, camera, gameState, ui, options = {}) {
    const { npcSystem = null, playerProxy = null } = options;

    const state = {
        // Weapon state
        currentWeapon: 'MELEE', // 'MELEE' or 'RANGED'
        meleeCooldown: 0,
        rangedCooldown: 0,

        // Combat stats
        totalDamageDealt: 0,
        hitsConnected: 0,
        bestCombo: 0,
        currentCombo: 0,

        // Targeting
        currentTarget: null,
        targetIndicator: null,

        // Death tracking
        deathCause: '',
        deathPosition: null,
        damageBurstCount: 0,
    };

    // Audio context for generating sounds
    let audioContext = null;

    // Projectiles storage
    const bullets = [];
    const damageNumbers = [];
    const particles = [];

    // Knockback state
    const knockbackVelocity = new THREE.Vector3();
    let knockbackTime = 0;

    // Death event recording for replay
    let deathEvent = null;

    const getAllNPCs = () => {
        if (npcSystem?.getAllActiveNPCs) return npcSystem.getAllActiveNPCs();
        if (npcSystem?.state?.active) return npcSystem.state.active;
        return [];
    };

    const getNPCsNear = (position, radius) => {
        if (npcSystem?.getNPCsNear) return npcSystem.getNPCsNear(position, radius);
        const npcs = getAllNPCs();
        return npcs.filter((npc) => npc?.mesh?.position?.distanceTo(position) < radius);
    };

    const npcPlayer = playerProxy;

    // Create target indicator
    function createTargetIndicator() {
        const geometry = new THREE.RingGeometry(0.8, 1.0, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const indicator = new THREE.Mesh(geometry, material);
        indicator.rotation.x = -Math.PI / 2;
        indicator.visible = false;
        scene.add(indicator);
        state.targetIndicator = indicator;
    }

    createTargetIndicator();

    function findAutoTarget() {
        if (state.currentTarget && state.currentTarget.state?.active && state.currentTarget.state?.state !== 'DEAD') {
            const dist = state.currentTarget.mesh.position.distanceTo(player.getPosition());
            if (dist < TARGET_CONFIG.TARGET_RANGE) return; // Keep current target
        }

        const npcs = getAllNPCs();
        const playerPos = player.getPosition();
        const playerRotation = player.getRotation();
        const forward = new THREE.Vector3(Math.sin(playerRotation), 0, Math.cos(playerRotation));

        let bestTarget = null;
        let minDistance = TARGET_CONFIG.TARGET_RANGE;

        for (const npc of npcs) {
            if (!npc.state?.active || npc.state?.state === 'DEAD') continue;
            
            const toNPC = npc.mesh.position.clone().sub(playerPos);
            const distance = toNPC.length();
            if (distance > minDistance) continue;

            const dirToNPC = toNPC.normalize();
            const angle = forward.angleTo(dirToNPC) * (180 / Math.PI);

            if (angle < TARGET_CONFIG.TARGET_CONE / 2) {
                minDistance = distance;
                bestTarget = npc;
            }
        }

        state.currentTarget = bestTarget;
    }

    function switchToNextTarget(direction = 1) {
        const npcs = getAllNPCs().filter(n => n.state?.active && n.state?.state !== 'DEAD');
        if (npcs.length === 0) {
            state.currentTarget = null;
            return;
        }

        if (!state.currentTarget) {
            state.currentTarget = npcs[0];
            return;
        }

        const currentIndex = npcs.indexOf(state.currentTarget);
        let nextIndex = (currentIndex + direction + npcs.length) % npcs.length;
        state.currentTarget = npcs[nextIndex];
    }

    function updateTargeting(dt) {
        if (!state.currentTarget || !state.currentTarget.state?.active || state.currentTarget.state?.state === 'DEAD' || 
            state.currentTarget.mesh.position.distanceTo(player.getPosition()) > TARGET_CONFIG.TARGET_RANGE + 5) {
            findAutoTarget();
        }

        if (state.currentTarget && state.targetIndicator) {
            state.targetIndicator.visible = TARGET_CONFIG.TARGET_VISUAL_INDICATOR;
            state.targetIndicator.position.copy(state.currentTarget.mesh.position);
            state.targetIndicator.position.y = 0.05; // Slightly above ground
            state.targetIndicator.rotation.z += dt * 5; // Spin effect
        } else if (state.targetIndicator) {
            state.targetIndicator.visible = false;
        }
    }

    // Apply knockback and ragdoll to NPC
    function applyKnockbackToNPC(npc, direction, force) {
        if (!npc || !npc.state) return;
        
        // Skip if NPC is already dead
        if (npc.state.state === 'DEAD') return;
        
        // Calculate knockback velocity
        const knockbackDir = direction.clone().normalize();
        const knockbackVel = knockbackDir.multiplyScalar(force);
        
        // Add some upward component for more dramatic effect
        knockbackVel.y = force * 0.4;
        
        // Apply to NPC velocity
        if (npc.state.velocity) {
            npc.state.velocity.copy(knockbackVel);
        }
        
        // Enter ragdoll state
        if (typeof npc.enterRagdoll === 'function') {
            const ragdollDuration = GAME_CONFIG.COMBAT.RAGDOLL_DURATION || 2.0;
            npc.enterRagdoll(ragdollDuration);
        }
        
        // Visual feedback - impact particles at hit location
        const impactPoint = npc.mesh.position.clone();
        impactPoint.y += 1.0;
        createImpactParticles(impactPoint, 'MELEE');
        
        // Play sound effect
        playSound('KNOCKBACK_AIR');
    }

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Generate arcade-style sound using Web Audio API
    function playSound(type) {
        initAudio();
        if (!audioContext) return;

        const volume = AUDIO_CONFIG.COMBAT.MELEE_IMPACT_VOLUME * AUDIO_CONFIG.SFX_VOLUME;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch (type) {
            case 'MELEE_IMPACT':
                // Comic book "BIFF!" - quick punch with low frequency
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
                break;

            case 'RANGED_SHOT':
                // Toy gun "PEW!" - high to low sweep
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(volume * 0.5, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
                break;

            case 'RANGED_IMPACT':
                // "DING!" - metallic spark sound
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
                gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;

            case 'KNOCKBACK_WALL':
                // "CRASH!" - heavy impact
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                break;

            case 'KNOCKBACK_AIR':
                // "WHOOSH!" - air displacement
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;

            case 'DEATH':
                // Arcade game over - pitch down dramatic
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1.0);
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1.0);
                break;

            case 'WEAPON_SWITCH':
                // Soft "CLICK"
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.05);
                break;
        }
    }

    function performMeleeAttack() {
        if (state.meleeCooldown > 0) return false;

        const damage = GAME_CONFIG.COMBAT.MELEE_DAMAGE;
        const meleeRange = GAME_CONFIG.COMBAT.MELEE_RANGE || 2.5;

        // Get player direction
        const playerPos = player.getPosition();
        const playerRotation = player.getRotation();

        // Direction player is facing
        let attackDir = new THREE.Vector3(
            Math.sin(playerRotation),
            0,
            Math.cos(playerRotation)
        ).normalize();

        // Use target if available
        let bestTarget = state.currentTarget;
        if (bestTarget && bestTarget.state?.active && bestTarget.state?.state !== 'DEAD') {
            const dist = bestTarget.mesh.position.distanceTo(playerPos);
            if (dist <= meleeRange + 1.5) {
                // Auto-aim towards target
                const toTarget = bestTarget.mesh.position.clone().sub(playerPos).setY(0).normalize();
                attackDir.copy(toTarget);
                
                // Rotate player towards target
                if (TARGET_CONFIG.AUTO_TARGET_ROTATION) {
                    player.state.rotation = Math.atan2(toTarget.x, toTarget.z);
                    player.mesh.rotation.y = player.state.rotation;
                }
            } else {
                bestTarget = null;
            }
        }

        if (!bestTarget) {
            const candidates = getNPCsNear(playerPos, meleeRange + 1.5);
            let bestScore = -Infinity;

            for (let i = 0; i < candidates.length; i++) {
                const npc = candidates[i];
                if (!npc?.state?.active || npc?.state?.state === 'DEAD') continue;

                const toNPC = npc.mesh.position.clone().sub(playerPos);
                toNPC.y = 0;
                const dist = toNPC.length();
                if (dist <= 0.0001 || dist > meleeRange + 0.4) continue;

                const dirTo = toNPC.clone().normalize();
                const facing = dirTo.dot(attackDir);

                // Only hit things generally in front of player
                if (facing < 0.25) continue;

                const score = facing * 2.0 - dist / meleeRange;
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = npc;
                }
            }
        }

        // Set cooldown even if we miss (swing animation)
        state.meleeCooldown = GAME_CONFIG.COMBAT.MELEE_COOLDOWN;

        // Play effects (always)
        playSound('MELEE_IMPACT');

        // Player recoil animation
        if (player?.state) {
            player.state.recoil = GAME_CONFIG.COMBAT.MELEE_RECOIL;
        } else {
            player.recoil = GAME_CONFIG.COMBAT.MELEE_RECOIL;
        }

        if (!bestTarget) {
            return true;
        }

        const shakeIntensity = Math.min(1.0, damage / 30);
        gameState.applyHitstop?.(0.7);
        gameState.applyScreenShake?.(shakeIntensity, GAME_CONFIG.COMBAT.SCREEN_SHAKE_DURATION);

        const hitPoint = bestTarget.mesh.position.clone();
        hitPoint.y += 1.0;

        // Damage + aggro
        bestTarget.takeDamage(damage, npcPlayer || playerProxy || { getPosition: () => player.getPosition() });

        // Apply knockback and ragdoll
        applyKnockbackToNPC(bestTarget, attackDir, GAME_CONFIG.COMBAT.KNOCKBACK_FORCE);

        // Create damage number
        createDamageNumber(hitPoint, damage, 'MELEE');

        // Update stats
        state.currentCombo++;
        if (state.currentCombo > state.bestCombo) state.bestCombo = state.currentCombo;
        state.hitsConnected++;
        state.totalDamageDealt += damage;

        return true;
    }

    function performRangedAttack() {
        if (state.rangedCooldown > 0) return false;

        const damage = GAME_CONFIG.COMBAT.RANGED_DAMAGE;
        const knockback = GAME_CONFIG.COMBAT.RANGED_KNOCKBACK;

        // Get player direction
        const playerPos = player.getPosition();
        const playerRotation = player.getRotation();

        // Direction player is facing
        let attackDir = new THREE.Vector3(
            Math.sin(playerRotation),
            0,
            Math.cos(playerRotation)
        ).normalize();

        // Use target if available
        const bestTarget = state.currentTarget;
        if (bestTarget && bestTarget.state?.active && bestTarget.state?.state !== 'DEAD') {
            const dist = bestTarget.mesh.position.distanceTo(playerPos);
            if (dist <= 30) {
                const toTarget = bestTarget.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(playerPos.clone().add(new THREE.Vector3(0, 1.2, 0))).normalize();
                attackDir.copy(toTarget);

                // Rotate player towards target
                if (TARGET_CONFIG.AUTO_TARGET_ROTATION) {
                    player.state.rotation = Math.atan2(toTarget.x, toTarget.z);
                    player.mesh.rotation.y = player.state.rotation;
                }
            }
        }

        // Create bullet
        createBullet(playerPos.clone(), attackDir, damage, knockback);

        // Play effects
        playSound('RANGED_SHOT');

        // Camera recoil (pitch down)
        if (camera?.state) {
            camera.state.recoilPitch = GAME_CONFIG.COMBAT.RANGED_RECOIL_PITCH;
        } else if (camera) {
            camera.recoilPitch = GAME_CONFIG.COMBAT.RANGED_RECOIL_PITCH;
        }

        // Update stats
        state.currentCombo++;
        if (state.currentCombo > state.bestCombo) state.bestCombo = state.currentCombo;
        state.hitsConnected++;
        state.totalDamageDealt += damage;

        // Set cooldown
        state.rangedCooldown = GAME_CONFIG.COMBAT.RANGED_COOLDOWN;

        return true;
    }

    function createBullet(startPos, direction, damage, knockback) {
        const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

        // Start position (slightly in front of player)
        bullet.position.copy(startPos);
        bullet.position.y += 1.2;
        bullet.position.add(direction.clone().multiplyScalar(0.5));

        // Add trail
        const trailGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.5, 4);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.x = Math.PI / 2;
        trail.position.z = -0.3;
        bullet.add(trail);

        scene.add(bullet);

        bullets.push({
            mesh: bullet,
            direction: direction.normalize(),
            speed: GAME_CONFIG.COMBAT.BULLET_SPEED,
            damage: damage,
            knockback: knockback,
            lifetime: GAME_CONFIG.COMBAT.BULLET_LIFETIME,
            createdAt: performance.now(),
        });
    }

    function createImpactParticles(position, type) {
        const particleCount = type === 'MELEE' ? 12 : 8;
        const particleSize = type === 'MELEE' ? 0.15 : 0.1;

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(particleSize, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: type === 'MELEE' ? 0xffaa00 : 0xffffff,
                transparent: true,
                opacity: 1.0,
            });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.copy(position);

            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 3,
                (Math.random() - 0.5) * 5
            );

            scene.add(particle);

            particles.push({
                mesh: particle,
                velocity: velocity,
                lifetime: 0.5 + Math.random() * 0.3,
                maxLifetime: 0.5 + Math.random() * 0.3,
            });
        }
    }

    function createDamageNumber(position, damage, type) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        // Draw damage number
        context.font = 'bold 48px Arial';
        context.fillStyle = '#ff0000';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`+${damage}`, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(1, 0.5, 1);

        scene.add(sprite);

        damageNumbers.push({
            mesh: sprite,
            lifetime: GAME_CONFIG.COMBAT.DAMAGE_NUMBER_DURATION,
            maxLifetime: GAME_CONFIG.COMBAT.DAMAGE_NUMBER_DURATION,
            initialScale: 1,
            targetScale: GAME_CONFIG.COMBAT.DAMAGE_NUMBER_GROWTH,
        });
    }

    function applyDamage(amount, direction, type) {
        // Flash player material
        if (player?.state) {
            player.state.flashTime = GAME_CONFIG.COMBAT.IMPACT_FLASH_DURATION;
        } else {
            player.flashTime = GAME_CONFIG.COMBAT.IMPACT_FLASH_DURATION;
        }

        // Apply damage
        gameState.player.health -= amount;

        // Screen flash red
        if (ui && ui.screenFlash) {
            ui.screenFlash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            setTimeout(() => {
                if (ui.screenFlash) ui.screenFlash.style.backgroundColor = 'transparent';
            }, GAME_CONFIG.COMBAT.SCREEN_RED_DURATION * 1000);
        }

        // Track damage burst
        state.damageBurstCount += amount;

        // Check for death
        if (gameState.player.health <= 0) {
            gameState.player.health = 0;
            triggerDeath(amount, direction);
        }

        // Update HUD
        if (ui && ui.updateHealth) {
            ui.updateHealth(gameState.player.health, GAME_CONFIG.PLAYER.MAX_HEALTH);
        }
    }

    function applyKnockback(direction, magnitude) {
        knockbackVelocity.copy(direction).multiplyScalar(magnitude);
        knockbackTime = GAME_CONFIG.COMBAT.KNOCKBACK_DURATION;
    }

    function triggerDeath(finalDamage, direction) {
        playSound('DEATH');

        state.deathCause = finalDamage >= GAME_CONFIG.COMBAT.DEATH_DAMAGE_THRESHOLD
            ? 'KNOCKOUT BLOW'
            : 'COMBAT DAMAGE';
        state.deathPosition = player.getPosition().clone();

        // Record death event for replay
        deathEvent = {
            position: state.deathPosition.clone(),
            direction: direction.clone(),
            damage: finalDamage,
            type: state.currentWeapon,
            time: performance.now(),
            stats: {
                totalDamage: state.totalDamageDealt,
                hitsConnected: state.hitsConnected,
                bestCombo: state.bestCombo,
            },
        };

        // Activate replay system (will be handled by main.js)
        if (gameState.onDeath) {
            gameState.onDeath(deathEvent);
        }
    }

    function switchWeapon() {
        state.currentWeapon = state.currentWeapon === 'MELEE' ? 'RANGED' : 'MELEE';
        playSound('WEAPON_SWITCH');

        // Update HUD
        if (ui && ui.updateWeapon) {
            ui.updateWeapon(state.currentWeapon);
        }
    }

    function getWeapon() {
        return state.currentWeapon;
    }

    function update(deltaTime) {
        // Update targeting
        updateTargeting(deltaTime);

        // Update cooldowns
        if (state.meleeCooldown > 0) state.meleeCooldown -= deltaTime;
        if (state.rangedCooldown > 0) state.rangedCooldown -= deltaTime;

        // Update knockback
        if (knockbackTime > 0) {
            knockbackTime -= deltaTime;

            // Apply knockback velocity to player
            const knockbackMove = knockbackVelocity.clone().multiplyScalar(deltaTime);
            const currentPos = player.getPosition();
            player.mesh.position.add(knockbackMove);

            // Damping
            knockbackVelocity.multiplyScalar(GAME_CONFIG.COMBAT.KNOCKBACK_DAMPING);

            // Check for wall collision
            if (player.checkCollision(player.mesh.position, player.colliders)) {
                playSound('KNOCKBACK_WALL');
                knockbackVelocity.set(0, 0, 0);
                knockbackTime = 0;
            }
        }

        // Update bullets
        updateBullets(deltaTime);

        // Update particles
        updateParticles(deltaTime);

        // Update damage numbers
        updateDamageNumbers(deltaTime);

        // Regenerate health
        if (gameState.player.health < GAME_CONFIG.PLAYER.MAX_HEALTH &&
            state.damageBurstCount === 0) {
            gameState.player.lastDamageTime = (gameState.player.lastDamageTime || 0) + deltaTime;
            if (gameState.player.lastDamageTime >= GAME_CONFIG.PLAYER.HEALTH_REGEN_DELAY) {
                gameState.player.health = Math.min(
                    GAME_CONFIG.PLAYER.MAX_HEALTH,
                    gameState.player.health + GAME_CONFIG.PLAYER.HEALTH_REGEN_RATE * deltaTime
                );
                if (ui && ui.updateHealth) {
                    ui.updateHealth(gameState.player.health, GAME_CONFIG.PLAYER.MAX_HEALTH);
                }
            }
        } else {
            gameState.player.lastDamageTime = 0;
        }

        // Reset damage burst count
        state.damageBurstCount = 0;

        // Reset combo if too much time passed
        if (state.currentCombo > 0 && state.meleeCooldown > 0 && state.rangedCooldown > 0) {
            // Combo continues while attacking
        }
    }

    function updateBullets(deltaTime) {
        const toRemove = [];

        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];
            bullet.lifetime -= deltaTime;

            if (bullet.lifetime <= 0) {
                toRemove.push(i);
                continue;
            }

            // Move bullet
            const move = bullet.direction.clone().multiplyScalar(bullet.speed * deltaTime);
            bullet.mesh.position.add(move);

            // Check collision with NPCs first
            const nearNPCs = getNPCsNear(bullet.mesh.position, 1.5);
            let hitSomething = false;

            for (let j = 0; j < nearNPCs.length; j++) {
                const npc = nearNPCs[j];
                if (!npc?.state?.active || npc?.state?.state === 'DEAD') continue;

                const dist = bullet.mesh.position.distanceTo(npc.mesh.position);
                if (dist < 1.0) {
                    npc.takeDamage(bullet.damage, npcPlayer || playerProxy || { getPosition: () => player.getPosition() });

                    // Apply knockback and ragdoll (ranged is slightly weaker than melee)
                    const rangedKnockbackForce = GAME_CONFIG.COMBAT.KNOCKBACK_FORCE * 0.7;
                    applyKnockbackToNPC(npc, bullet.direction, rangedKnockbackForce);

                    playSound('RANGED_IMPACT');
                    createImpactParticles(bullet.mesh.position.clone(), 'RANGED');
                    createDamageNumber(bullet.mesh.position.clone(), bullet.damage, 'RANGED');

                    const shakeIntensity = Math.min(1.0, bullet.damage / 30);
                    gameState.applyHitstop?.(0.7);
                    gameState.applyScreenShake?.(shakeIntensity, GAME_CONFIG.COMBAT.SCREEN_SHAKE_DURATION);

                    state.currentCombo++;
                    if (state.currentCombo > state.bestCombo) state.bestCombo = state.currentCombo;
                    state.hitsConnected++;
                    state.totalDamageDealt += bullet.damage;

                    hitSomething = true;
                    break;
                }
            }

            if (hitSomething) {
                toRemove.push(i);
                continue;
            }
        }

        // Remove dead bullets (in reverse order to maintain indices)
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const idx = toRemove[i];
            scene.remove(bullets[idx].mesh);
            bullets.splice(idx, 1);
        }
    }

    function updateParticles(deltaTime) {
        const toRemove = [];

        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            particle.lifetime -= deltaTime;

            if (particle.lifetime <= 0) {
                toRemove.push(i);
                continue;
            }

            // Move particle
            particle.velocity.y -= 9.8 * deltaTime; // Gravity
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

            // Fade out
            particle.mesh.material.opacity = particle.lifetime / particle.maxLifetime;
        }

        // Remove dead particles
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const idx = toRemove[i];
            scene.remove(particles[idx].mesh);
            particles[idx].mesh.geometry.dispose();
            particles[idx].mesh.material.dispose();
            particles.splice(idx, 1);
        }
    }

    function updateDamageNumbers(deltaTime) {
        const toRemove = [];

        for (let i = 0; i < damageNumbers.length; i++) {
            const num = damageNumbers[i];
            num.lifetime -= deltaTime;

            if (num.lifetime <= 0) {
                toRemove.push(i);
                continue;
            }

            // Float up
            num.mesh.position.y += deltaTime * 1.5;

            // Scale up then fade
            const progress = 1 - (num.lifetime / num.maxLifetime);
            const scale = num.initialScale + (num.targetScale - num.initialScale) * Math.min(progress * 2, 1);
            num.mesh.scale.set(scale, scale * 0.5, scale);

            // Fade out
            num.mesh.material.opacity = 1 - progress;
        }

        // Remove dead damage numbers
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const idx = toRemove[i];
            scene.remove(damageNumbers[idx].mesh);
            damageNumbers[idx].mesh.material.dispose();
            damageNumbers.splice(idx, 1);
        }
    }

    function getStats() {
        return {
            totalDamage: state.totalDamageDealt,
            hitsConnected: state.hitsConnected,
            bestCombo: state.bestCombo,
            currentCombo: state.currentCombo,
        };
    }

    function reset() {
        state.totalDamageDealt = 0;
        state.hitsConnected = 0;
        state.bestCombo = 0;
        state.currentCombo = 0;
        state.deathCause = '';
        state.deathPosition = null;
        deathEvent = null;

        // Clear bullets
        for (const bullet of bullets) {
            scene.remove(bullet.mesh);
        }
        bullets.length = 0;

        // Clear particles
        for (const particle of particles) {
            scene.remove(particle.mesh);
            particle.mesh.geometry.dispose();
            particle.mesh.material.dispose();
        }
        particles.length = 0;

        // Clear damage numbers
        for (const num of damageNumbers) {
            scene.remove(num.mesh);
            num.mesh.material.dispose();
        }
        damageNumbers.length = 0;
    }

    function getDeathEvent() {
        return deathEvent;
    }

    function damagePlayerFromNPC(amount, direction) {
        if (gameState.isReplaying) return;
        applyDamage(amount, direction || new THREE.Vector3(1, 0, 0), 'NPC');
    }

    return {
        state,
        performMeleeAttack,
        performRangedAttack,
        switchWeapon,
        getWeapon,
        update,
        applyDamage,
        applyKnockback,
        getStats,
        reset,
        getDeathEvent,
        playSound,
        damagePlayerFromNPC,
        switchToNextTarget,
    };
}
