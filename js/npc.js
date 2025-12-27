/**
 * NPC Model
 * Simple, dumb and entertaining AI for emergent chaos.
 */

import * as THREE from 'three';
import { GAME_CONFIG, GRAPHICS_PRESETS, SATIRICAL_TEXTS } from './config.js';
import { applyToonMaterial } from './world.js';
import { audioEngine } from './audio-engine.js';

const NPC_STATES = {
    IDLE: 'IDLE',
    WANDER: 'WANDER',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK',
    FLEE: 'FLEE',
    DEAD: 'DEAD',
};

const ZERO_VEC = new THREE.Vector3();

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function pickRandomXZDirection() {
    const a = Math.random() * Math.PI * 2;
    return new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
}

export function createNPC(position = new THREE.Vector3()) {
    const group = new THREE.Group();
    group.name = 'NPC';

    const bodyHeight = 1.1;
    const radius = 0.45;

    const bodyGeometry = new THREE.CylinderGeometry(radius, radius, bodyHeight, 7);
    const body = new THREE.Mesh(bodyGeometry);
    applyToonMaterial(body, 'NPC_HOSTILE', 1.1);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = bodyHeight / 2 + radius * 0.8;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(radius * 0.75, 7, 7);
    const head = new THREE.Mesh(headGeometry);
    applyToonMaterial(head, 'NPC_HOSTILE', 1.15);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.y = bodyHeight + radius * 1.55;
    group.add(head);

    const indicatorGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.35);
    const indicatorMaterial = new THREE.MeshToonMaterial({
        color: 0x222222,
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(0, bodyHeight / 2 + radius * 0.8, radius + 0.2);
    group.add(indicator);

    group.position.copy(position);

    const state = {
        id: `npc_${Math.random().toString(16).slice(2)}`,
        active: true,
        health: 60,
        maxHealth: 60,
        state: NPC_STATES.WANDER,
        velocity: new THREE.Vector3(),
        desiredDir: pickRandomXZDirection(),
        timeToChangeDir: randRange(3, 5),
        attackCooldown: randRange(0.2, 0.6),
        mood: Math.random(), // 0..1, if low -> more aggressive
        lastDamagedBy: null,
        lastDamageTime: 999,
        targetNPC: null,
        targetPlayer: null,
        dieTimer: 0,
        despawnTimer: 0,
        ragdollSpin: randRange(-1, 1),
        ragdollTilt: new THREE.Vector3(randRange(-1, 1), 0, randRange(-1, 1)).normalize(),
        baseColor: body.material.color.clone(),

        // Furia System (Venganza Física)
        lastAttacker: null,      // Quién me golpeó por última vez
        lastHitTime: 0,          // Cuándo fue el último golpe
        furia: 0,                // Timer de "furia ciega" (segundos)

        // Ragdoll-Lite state
        isRagdoll: false,
        ragdollTimer: 0,
        savedState: null, // Store state before ragdoll to restore later
        justEnteredRagdoll: false,
        ragdollImpactSpeed: 0,

        // Suspension state (for Gravity Blast)
        isSuspended: false,
        suspensionTimer: 0,

        // Collision feedback
        collisionShakeCooldown: 0,
    };

    function getPosition() {
        return group.position.clone();
    }

    function setActive(active) {
        state.active = active;
        group.visible = active;
        if (!active) {
            state.targetNPC = null;
            state.targetPlayer = null;
        }
    }

    function reset(newPosition) {
        state.health = state.maxHealth;
        state.state = NPC_STATES.WANDER;
        state.velocity.set(0, 0, 0);
        state.desiredDir.copy(pickRandomXZDirection());
        state.timeToChangeDir = randRange(3, 5);
        state.attackCooldown = randRange(0.2, 0.6);
        state.mood = Math.random();
        state.lastDamagedBy = null;
        state.lastDamageTime = 999;
        state.targetNPC = null;
        state.targetPlayer = null;
        state.dieTimer = 0;
        state.despawnTimer = 0;
        state.isRagdoll = false;
        state.ragdollTimer = 0;
        state.savedState = null;
        state.justEnteredRagdoll = false;
        state.ragdollImpactSpeed = 0;
        state.collisionShakeCooldown = 0;
        
        // Furia System reset
        state.lastAttacker = null;
        state.lastHitTime = 0;
        state.furia = 0;
        
        body.material.color.copy(state.baseColor);
        head.material.color.copy(state.baseColor);
        group.rotation.set(0, 0, 0);
        group.position.copy(newPosition);
        setActive(true);
    }

    function enterRagdoll(duration) {
        if (state.state === NPC_STATES.DEAD) return;
        
        // Save current state to restore later
        state.savedState = state.state;
        state.isRagdoll = true;
        state.ragdollTimer = duration;
        state.justEnteredRagdoll = true;
        state.ragdollImpactSpeed = state.velocity.length();
        
        // Visual feedback: flash white or different color
        body.material.color.setHex(0xaaaaaa);

        // Play ARGH sound (pain/grunt)
        const intensity = Math.min(1.0, state.ragdollImpactSpeed / 15);
        audioEngine.playSynthSound('ARGH', group.position, 0.7 + intensity * 0.3);

        // Show satirical ragdoll text
        if (typeof SATIRICAL_TEXTS !== 'undefined' && typeof OverlaySystem !== 'undefined') {
            const ragdollText = SATIRICAL_TEXTS.RAGDOLL[
                Math.floor(Math.random() * SATIRICAL_TEXTS.RAGDOLL.length)
            ];
            OverlaySystem.show(ragdollText, 2.0);
        }
    }

    function exitRagdoll() {
        state.isRagdoll = false;
        state.ragdollTimer = 0;
        
        // Restore previous state or default to wander
        state.state = state.savedState || NPC_STATES.WANDER;
        state.savedState = null;
        
        // Reset rotation (NPC stands up)
        group.rotation.set(0, group.rotation.y, 0);
        
        // Restore color
        body.material.color.copy(state.baseColor);
    }

    function enterSuspension(duration) {
        state.isSuspended = true;
        state.suspensionTimer = duration;
    }

    function exitSuspension() {
        state.isSuspended = false;
        state.suspensionTimer = 0;
    }

    function takeDamage(amount, source = null, impulse = 0) {
        if (state.state === NPC_STATES.DEAD) return;

        state.health -= amount;
        state.lastDamageTime = 0;
        state.lastDamagedBy = source;

        body.material.color.setHex(0xffffff);

        // Furia System: Register last attacker and set furia if impulse is significant
        const IMPULSE_THRESHOLD = GAME_CONFIG.COMBAT.FURIA?.IMPULSE_THRESHOLD || 5.0;
        if (impulse > IMPULSE_THRESHOLD) {
            state.lastAttacker = source;
            state.lastHitTime = performance.now();
            state.furia = GAME_CONFIG.COMBAT.FURIA?.FURIA_DURATION || 3.0;
        }

        // Angry reaction: lock target if we can
        if (source && source.mesh) {
            state.targetNPC = source;
            state.targetPlayer = null;
            state.state = NPC_STATES.CHASE;
        }

        if (source && source.getPosition && !source.mesh) {
            // Player-style object (expected: player)
            state.targetPlayer = source;
            state.targetNPC = null;
            state.state = NPC_STATES.CHASE;
        }

        if (state.health <= 0) {
            state.health = 0;
            die();
        }
    }

    function attack(target) {
        if (state.state === NPC_STATES.DEAD) return false;
        if (state.attackCooldown > 0) return false;
        if (!target) return false;

        const targetPos = target.getPosition ? target.getPosition() : target.position;
        if (!targetPos) return false;

        // Simple hit check by distance
        const dist = targetPos.distanceTo(group.position);
        if (dist > 2.0) return false;

        const damage = randRange(6, 12);
        const dir = targetPos.clone().sub(group.position).setY(0);

        // Exaggerated punch animation: quick scale / indicator flash
        indicator.material.emissiveIntensity = 1.0;

        if (typeof target.takeDamage === 'function') {
            if (target.mesh) {
                target.takeDamage(damage, api);
            } else {
                const normDir = dir.lengthSq() > 0 ? dir.clone().normalize() : new THREE.Vector3(1, 0, 0);
                target.takeDamage(damage, normDir, api);
            }
        }

        // Chaotic recoil in opposite direction
        if (dir.lengthSq() > 0) {
            const recoil = dir.clone().normalize().multiplyScalar(-randRange(2, 6));
            state.velocity.add(recoil);
        }

        state.attackCooldown = randRange(0.45, 0.85);
        return true;
    }

    function die() {
        if (state.state === NPC_STATES.DEAD) return;
        state.state = NPC_STATES.DEAD;
        state.despawnTimer = 5.0;
        state.dieTimer = 0;
        state.velocity.set(0, 0, 0);

        body.material.color.setHex(0x555555);
        head.material.color.setHex(0x555555);
        indicator.visible = false;

        // Play ARGH sound (death scream - maximum intensity)
        audioEngine.playSynthSound('ARGH', group.position, 1.0);

        // Show satirical death text
        if (typeof SATIRICAL_TEXTS !== 'undefined' && typeof OverlaySystem !== 'undefined') {
            const deathText = SATIRICAL_TEXTS.DEATH[
                Math.floor(Math.random() * SATIRICAL_TEXTS.DEATH.length)
            ];
            OverlaySystem.show(deathText, 2.5);
        }
    }

    function update(dt, allNPCs, buildings, context = {}) {
        if (!state.active) return;

        const {
            player = null,
            terrainHeightAt = null,
            isInView = null,
            attackPlayerRadius = 2.2,
            fleePlayerRadius = 4.0,
            detectionRadius = 20,
            feedback = null,
        } = context;

        if (typeof isInView === 'function' && !isInView(group.position)) {
            // Still tick cooldowns lightly to avoid freezing forever.
            state.attackCooldown = Math.max(0, state.attackCooldown - dt);
            state.timeToChangeDir = Math.max(0, state.timeToChangeDir - dt);
            state.collisionShakeCooldown = Math.max(0, state.collisionShakeCooldown - dt);
            state.lastDamageTime += dt;
            return;
        }

        state.lastDamageTime += dt;
        state.collisionShakeCooldown = Math.max(0, state.collisionShakeCooldown - dt);

        // Furia System: Update furia timer
        if (state.furia > 0) {
            state.furia -= dt;
        }

        // Handle ragdoll-lite state
        if (state.isRagdoll) {
            if (state.justEnteredRagdoll) {
                state.justEnteredRagdoll = false;

                const impact = Math.min(1.0, state.ragdollImpactSpeed / 20.0);
                feedback?.applyHitstop?.(0.4 + 0.4 * impact);
                feedback?.applyScreenShake?.(impact, GAME_CONFIG.COMBAT.SCREEN_SHAKE_DURATION);
                
                // Show satirical ragdoll overlay
                if (typeof SATIRICAL_TEXTS !== 'undefined' && typeof OverlaySystem !== 'undefined') {
                    const ragdollText = SATIRICAL_TEXTS.RAGDOLL[
                        Math.floor(Math.random() * SATIRICAL_TEXTS.RAGDOLL.length)
                    ];
                    OverlaySystem.show(ragdollText, 1.5);
                }
            }

            state.ragdollTimer -= dt;
            
            // Apply gravity (stronger during ragdoll)
            const gravity = GAME_CONFIG.COMBAT.RAGDOLL_GRAVITY_SCALE || 1.2;
            state.velocity.y -= 9.8 * gravity * dt;
            
            // Apply friction to horizontal movement
            const friction = GAME_CONFIG.COMBAT.KNOCKBACK_FRICTION || 0.92;
            state.velocity.x *= Math.pow(friction, dt * 60);
            state.velocity.z *= Math.pow(friction, dt * 60);
            
            // Move with physics
            group.position.add(state.velocity.clone().multiplyScalar(dt));
            
            // Check collision with buildings
            if (buildings?.colliders?.length) {
                for (let i = 0; i < buildings.colliders.length; i++) {
                    const collider = buildings.colliders[i];
                    if (!collider?.box) continue;
                    
                    const d = collider.box.distanceToPoint(group.position);
                    if (d < 0.6) {
                        // Bounce off building
                        const center = new THREE.Vector3();
                        collider.box.getCenter(center);
                        const away = group.position.clone().sub(center).setY(0);
                        if (away.lengthSq() > 0.001) {
                            away.normalize();
                            group.position.add(away.multiplyScalar(0.6 - d));
                            // Bounce velocity
                            state.velocity.x *= -0.3;
                            state.velocity.z *= -0.3;
                        }
                        break;
                    }
                }
            }
            
            // Snap to ground
            if (typeof terrainHeightAt === 'function') {
                const groundY = terrainHeightAt(group.position.x, group.position.z);
                if (group.position.y < groundY + 1.0) {
                    group.position.y = groundY + 1.0;
                    // Stop falling when hitting ground
                    if (state.velocity.y < 0) {
                        state.velocity.y = 0;
                    }
                }
            }
            
            // Ragdoll visual: tilt while flying
            const horizontalSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
            if (horizontalSpeed > 1.0) {
                const tiltAmount = Math.min(horizontalSpeed / 15.0, 0.8);
                group.rotation.x = tiltAmount * Math.PI * 0.4;
            } else {
                // Gradually return to standing when slowed down
                group.rotation.x *= 0.9;
            }
            
            // Check if ragdoll time is over
            if (state.ragdollTimer <= 0) {
                exitRagdoll();
            }
            
            return; // Skip normal AI when in ragdoll
        }

        // Furia System: If in furia state, override normal AI and chase attacker
        if (state.furia > 0 && state.lastAttacker) {
            // Check if attacker is still valid
            let attackerValid = false;
            if (state.lastAttacker) {
                if (state.lastAttacker.state) {
                    // NPC attacker
                    attackerValid = state.lastAttacker.state.active && state.lastAttacker.state.state !== NPC_STATES.DEAD;
                } else if (state.lastAttacker.health !== undefined) {
                    // Player attacker (check if player is alive)
                    attackerValid = state.lastAttacker.health > 0;
                } else {
                    // Assume valid if we can't determine otherwise
                    attackerValid = true;
                }
            }
            
            if (attackerValid) {
                // Movement directo hacia atacante
                const attackerPos = state.lastAttacker.getPosition ? state.lastAttacker.getPosition() : state.lastAttacker.position;
                if (attackerPos) {
                    const dir = attackerPos.clone().sub(group.position).setY(0);
                    const dist = dir.length();
                    
                    if (dist > 0.001) {
                        dir.normalize();
                        const FURIA_ACCEL = GAME_CONFIG.COMBAT.FURIA?.FURIA_ACCELERATION || 25.0;
                        state.velocity.add(dir.multiplyScalar(FURIA_ACCEL * dt));
                    }

                    // Intentar atacar si está cerca
                    const MELEE_RANGE = 2.0;
                    if (dist < MELEE_RANGE && state.attackCooldown <= 0) {
                        attack(state.lastAttacker);
                    }
                }
            } else {
                // Attacker is no longer valid, clear furia
                state.furia = 0;
                state.lastAttacker = null;
            }
            
            // Update attack cooldown during furia
            state.attackCooldown = Math.max(0, state.attackCooldown - dt);
        }

        // Visual hit flash decay
        if (state.lastDamageTime > 0.08) {
            body.material.color.copy(state.baseColor);
            indicator.material.emissiveIntensity = 0.25;
            indicator.visible = state.state !== NPC_STATES.DEAD;
        }

        if (state.state === NPC_STATES.DEAD) {
            state.dieTimer += dt;
            state.despawnTimer -= dt;

            // Simple ragdoll: fall and tilt
            const t = Math.min(state.dieTimer / 0.8, 1);
            group.rotation.x = state.ragdollTilt.x * t * Math.PI * 0.5;
            group.rotation.z = state.ragdollTilt.z * t * Math.PI * 0.5;
            group.rotation.y += state.ragdollSpin * dt * 2.5;

            if (state.despawnTimer <= 0) {
                setActive(false);
            }
            return;
        }

        // Decide player interaction
        const playerPos = player?.getPosition?.();
        const distToPlayer = playerPos ? playerPos.distanceTo(group.position) : Infinity;

        if (player && distToPlayer < fleePlayerRadius && state.lastDamagedBy !== player) {
            const isBadMood = state.mood < 0.35;
            if (isBadMood && Math.random() < 0.45) {
                state.state = NPC_STATES.CHASE;
                state.targetPlayer = player;
                state.targetNPC = null;
            } else {
                state.state = NPC_STATES.FLEE;
                state.targetPlayer = player;
                state.targetNPC = null;
            }
        }

        if (player && (state.lastDamagedBy === player || distToPlayer < detectionRadius * 0.6)) {
            // If player is close, some NPCs get brave and attack
            if (distToPlayer < detectionRadius * 0.4 && Math.random() < 0.1) {
                state.targetPlayer = player;
                state.targetNPC = null;
                state.state = NPC_STATES.CHASE;
            }
        }

        // Pick NPC targets for emergent fighting
        if (!state.targetNPC && !state.targetPlayer) {
            const isBadMood = state.mood < 0.35;
            if (isBadMood) {
                let best = null;
                let bestDist = detectionRadius;
                for (let i = 0; i < allNPCs.length; i++) {
                    const other = allNPCs[i];
                    if (!other || other === api || !other.state?.active || other.state?.state === NPC_STATES.DEAD) continue;
                    const d = other.mesh.position.distanceTo(group.position);
                    if (d < bestDist) {
                        bestDist = d;
                        best = other;
                    }
                }
                if (best) {
                    state.targetNPC = best;
                    state.state = NPC_STATES.CHASE;
                }
            }
        }

        const maxSpeed = state.state === NPC_STATES.FLEE ? 8.5 : 5.2;

        // Behavior state machine
        if (state.state === NPC_STATES.WANDER || state.state === NPC_STATES.IDLE) {
            state.timeToChangeDir -= dt;
            if (state.timeToChangeDir <= 0) {
                state.desiredDir.copy(pickRandomXZDirection());
                state.timeToChangeDir = randRange(3, 5);
                state.mood = Math.min(1, Math.max(0, state.mood + randRange(-0.2, 0.2)));
            }

            state.velocity.add(state.desiredDir.clone().multiplyScalar(2.0 * dt));
        }

        if (state.state === NPC_STATES.CHASE) {
            const target = state.targetNPC || state.targetPlayer;
            if (!target || (target.state?.active === false) || (target.state?.state === NPC_STATES.DEAD)) {
                state.targetNPC = null;
                state.targetPlayer = null;
                state.state = NPC_STATES.WANDER;
            } else {
                const targetPos2 = target.getPosition ? target.getPosition() : target.mesh?.position;
                if (targetPos2) {
                    const to = targetPos2.clone().sub(group.position).setY(0);
                    const dist = to.length();
                    if (dist > 0.001) {
                        to.normalize();
                        state.velocity.add(to.multiplyScalar(5.5 * dt));
                    }

                    // If close, attack
                    state.attackCooldown = Math.max(0, state.attackCooldown - dt);
                    if (dist < attackPlayerRadius) {
                        state.state = NPC_STATES.ATTACK;
                    }
                }
            }
        }

        if (state.state === NPC_STATES.ATTACK) {
            const target = state.targetNPC || state.targetPlayer;
            if (!target) {
                state.state = NPC_STATES.WANDER;
            } else {
                const targetPos2 = target.getPosition ? target.getPosition() : target.mesh?.position;
                const dist = targetPos2 ? targetPos2.distanceTo(group.position) : Infinity;

                state.attackCooldown = Math.max(0, state.attackCooldown - dt);

                // Chaotic strafing while punching
                const strafe = pickRandomXZDirection().multiplyScalar(1.8 * dt);
                state.velocity.add(strafe);

                if (dist < attackPlayerRadius) {
                    attack(target);
                } else {
                    state.state = NPC_STATES.CHASE;
                }
            }
        }

        if (state.state === NPC_STATES.FLEE) {
            const awayFrom = playerPos ? group.position.clone().sub(playerPos).setY(0) : pickRandomXZDirection();
            if (awayFrom.lengthSq() > 0.001) {
                awayFrom.normalize();
                state.velocity.add(awayFrom.multiplyScalar(7.5 * dt));
                // Extra erratic wiggle
                state.velocity.add(pickRandomXZDirection().multiplyScalar(2.0 * dt));
            }

            if (distToPlayer > fleePlayerRadius * 1.3) {
                state.targetPlayer = null;
                state.state = state.targetNPC ? NPC_STATES.CHASE : NPC_STATES.WANDER;
            }
        }

        // Avoid buildings: crude - if close to any collider, turn around
        if (buildings?.colliders?.length) {
            for (let i = 0; i < buildings.colliders.length; i++) {
                const collider = buildings.colliders[i];
                if (!collider?.box) continue;

                const d = collider.box.distanceToPoint(group.position);
                if (d < 0.6) {
                    state.desiredDir.multiplyScalar(-1);
                    state.velocity.add(state.desiredDir.clone().multiplyScalar(6.0 * dt));
                    group.rotation.y += Math.PI;
                    break;
                }
            }
        }

        // Suspension logic (for Gravity Blast)
        if (state.isSuspended) {
            state.suspensionTimer -= dt;
            
            // Block horizontal movement during suspension
            state.velocity.x = 0;
            state.velocity.z = 0;
            
            // Apply gravity to Y
            const gravity = GAME_CONFIG.PLAYER.GRAVITY || 30.0;
            state.velocity.y -= gravity * dt;
            
            // Exit suspension when timer expires
            if (state.suspensionTimer <= 0) {
                exitSuspension();
            }
        } else {
            // Normal velocity processing (not suspended)
            // Clamp speed + apply basic damping
            state.velocity.y = 0;
            const speed = state.velocity.length();
            if (speed > maxSpeed) {
                state.velocity.multiplyScalar(maxSpeed / speed);
            }
            state.velocity.multiplyScalar(Math.pow(0.88, dt * 60));

            // Furia System: Ragdoll por velocidad alta
            const VELOCITY_RAGDOLL_THRESHOLD = GAME_CONFIG.COMBAT.FURIA?.VELOCITY_RAGDOLL_THRESHOLD || 10.0;
            if (!state.isRagdoll && speed > VELOCITY_RAGDOLL_THRESHOLD) {
                const RAGDOLL_DURATION = GAME_CONFIG.COMBAT.FURIA?.RAGDOLL_DURATION_FROM_VELOCITY || 1.5;
                enterRagdoll(RAGDOLL_DURATION);
            }
        }

        // Move (apply velocity regardless of suspension state)
        group.position.add(state.velocity.clone().multiplyScalar(dt));

        // Face velocity direction
        if (state.velocity.lengthSq() > 0.01) {
            const dir = state.velocity.clone().normalize();
            group.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // Snap to ground if helper exists
        if (typeof terrainHeightAt === 'function') {
            const groundY = terrainHeightAt(group.position.x, group.position.z);
            group.position.y = groundY + 1.0;
        }

        // Gentle separation to avoid stacking
        for (let i = 0; i < allNPCs.length; i++) {
            const other = allNPCs[i];
            if (!other || other === api || !other.state?.active || other.state?.state === NPC_STATES.DEAD) continue;
            const delta = group.position.clone().sub(other.mesh.position);
            delta.y = 0;
            const d = delta.length();
            if (d > 0.001 && d < 0.9) {
                const threshold = GAME_CONFIG.COMBAT.COLLISION_SHAKE_THRESHOLD || 15.0;
                const otherVel = other.state?.velocity || ZERO_VEC;
                const relSpeed = state.velocity.clone().sub(otherVel).length();

                if (
                   feedback?.applyHitstop &&
                   feedback?.applyScreenShake &&
                   state.collisionShakeCooldown <= 0 &&
                   relSpeed > threshold &&
                   state.id < (other.state?.id || '')
                ) {
                   const impact = Math.min(1.0, (relSpeed - threshold) / threshold);

                   feedback.applyHitstop(0.5 + 0.5 * impact);
                   feedback.applyScreenShake(0.3 + 0.7 * impact, GAME_CONFIG.COMBAT.SCREEN_SHAKE_DURATION * 0.75);

                   state.collisionShakeCooldown = 0.25;
                   if (other.state) other.state.collisionShakeCooldown = 0.25;
                }

                // Furia System: Ragdoll collision damage
                if (state.isRagdoll) {
                   const RAGDOLL_COLLISION_DAMAGE = GAME_CONFIG.COMBAT.FURIA?.RAGDOLL_COLLISION_DAMAGE || 5;
                   other.takeDamage(RAGDOLL_COLLISION_DAMAGE, api, relSpeed);

                   // Knockback al otro
                   const dir = delta.clone().normalize();
                   other.state.velocity.add(dir.multiplyScalar(15.0));

                   // Show satirical NPC chain overlay
                   if (typeof SATIRICAL_TEXTS !== 'undefined' && typeof OverlaySystem !== 'undefined') {
                       const chainText = SATIRICAL_TEXTS.NPC_CHAIN[
                           Math.floor(Math.random() * SATIRICAL_TEXTS.NPC_CHAIN.length)
                       ];
                       OverlaySystem.show(chainText, 2.0);
                   }
                }

                group.position.add(delta.normalize().multiplyScalar((0.9 - d) * 0.5));
            }
        }
    }

    const api = {
        mesh: group,
        body,
        head,
        indicator,
        state,
        update,
        takeDamage,
        attack,
        die,
        getPosition,
        reset,
        setActive,
        enterRagdoll,
        exitRagdoll,
        enterSuspension,
        exitSuspension,
        getState: () => ({ ...state }),
    };

    Object.defineProperties(api, {
        position: { get: () => group.position },
        health: { get: () => state.health },
        targetNPC: { get: () => state.targetNPC },
        velocity: { get: () => state.velocity },
    });

    return api;
}
