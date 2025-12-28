/**
 * NPC Model
 * Simple, dumb and entertaining AI for emergent chaos.
 */

import * as THREE from 'three';
import { GAME_CONFIG, GRAPHICS_PRESETS, SATIRICAL_TEXTS, DOPAMINE_CONFIG, JUICE_SPRINT_CONFIG } from './config.js';
import { applyToonMaterial } from './world.js';
import { audioEngine } from './audio-engine.js';
import { createLowPolyHumanoid, createEmotionSystem, getRandomColorPreset, EMOTIONS } from './lowpoly-characters.js';

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
    // Create low-poly humanoid mesh with random colors
    const colorPreset = getRandomColorPreset();
    const humanoid = createLowPolyHumanoid(colorPreset, false);
    const group = humanoid.group;
    group.name = 'NPC';

    // Get references to body parts
    const head = humanoid.head;
    const torso = humanoid.torso;
    const body = torso; // Alias for compatibility
    const face = humanoid.face;
    const leftArm = humanoid.leftArm;
    const rightArm = humanoid.rightArm;
    const leftLeg = humanoid.leftLeg;
    const rightLeg = humanoid.rightLeg;
    const materials = humanoid.materials;

    // Create emotion system
    const emotionSystem = createEmotionSystem(face);

    // HEAVY variant visual (larger, darker low-poly humanoid)
    const heavyGroup = new THREE.Group();
    heavyGroup.visible = false;
    heavyGroup.scale.setScalar(1.5);

    // Heavy uses same structure but darker materials
    const heavyColorPreset = {
        torso: 0x333333,
        arms: 0x333333,
        legs: 0x222222,
    };
    const heavyHumanoid = createLowPolyHumanoid(heavyColorPreset, false);
    const heavyMesh = heavyHumanoid.group;
    heavyGroup.add(heavyMesh);
    group.add(heavyGroup);

    // Direction indicator (for attack animations)
    const indicatorGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.35);
    const indicatorMaterial = new THREE.MeshToonMaterial({
        color: 0x222222,
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(0, 1.1, 0.5);
    group.add(indicator);

    group.position.copy(position);

    const state = {
        id: `npc_${Math.random().toString(16).slice(2)}`,
        active: true,
        type: 'BASIC',
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
        baseColor: materials.body.color.clone(),

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
        suspendedVelocity: new THREE.Vector3(),

        // VFX - ground impact decals
        decalCooldown: 0,

        // Collision feedback
        collisionShakeCooldown: 0,

        // Squash & Stretch state
        squashTimer: 0,
        squashIntensity: 0,

        // Dizzy State (Heavy NPC weakness mechanic)
        punches_received: 0,
        isDizzy: false,
        dizzyTimer: 0,
        dizzyDuration: 1.5,

        // Panic System (Game Feel Overhaul)
        isPanic: false,
        panicTimer: 0,
        panicDuration: 3.0,
        consecutiveHits: 0,
        lastHitComboCount: 0,

        // Emotion System
        currentEmotion: EMOTIONS.NEUTRAL,
        emotionDuration: 0,

        // Impact tracking for knocked_out emotion
        recentImpacts: [],
        lastImpactTime: 0,
    };

    const BASIC_MAX_HEALTH = 60;
    const HEAVY_MAX_HEALTH = 150;

    function getVisualMeshes() {
        return state.type === 'HEAVY' ? [heavyMesh] : [torso, head];
    }

    function setVisualColor(color) {
        if (state.type === 'HEAVY') {
            heavyHumanoid.materials.body.color.copy(color);
            heavyHumanoid.materials.arm.color.copy(color);
            heavyHumanoid.materials.leg.color.copy(color);
        } else {
            materials.body.color.copy(color);
            materials.arm.color.copy(color);
        }
    }

    function applyType(type = 'BASIC') {
        state.type = type === 'HEAVY' ? 'HEAVY' : 'BASIC';

        const isHeavy = state.type === 'HEAVY';
        torso.visible = !isHeavy;
        head.visible = !isHeavy;
        leftArm.visible = !isHeavy;
        rightArm.visible = !isHeavy;
        leftLeg.visible = !isHeavy;
        rightLeg.visible = !isHeavy;
        face.visible = !isHeavy;
        indicator.visible = !isHeavy;
        heavyGroup.visible = isHeavy;

        if (isHeavy) {
            group.scale.setScalar(1.5);
            state.maxHealth = HEAVY_MAX_HEALTH;
            state.baseColor.copy(new THREE.Color(0x333333));
            setVisualColor(state.baseColor);
        } else {
            group.scale.setScalar(1.0);
            state.maxHealth = BASIC_MAX_HEALTH;
            state.baseColor.copy(new THREE.Color(colorPreset.torso));
            setVisualColor(state.baseColor);
        }

        state.health = state.maxHealth;
    }

    // Default type
    applyType('BASIC');

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

    function reset(newPosition, options = {}) {
        applyType(options.type || 'BASIC');

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

        state.isSuspended = false;
        state.suspensionTimer = 0;
        state.suspendedVelocity.set(0, 0, 0);

        state.decalCooldown = 0;
        state.collisionShakeCooldown = 0;

        // Squash & Stretch reset
        state.squashTimer = 0;
        state.squashIntensity = 0;

        // Furia System reset
        state.lastAttacker = null;
        state.lastHitTime = 0;
        state.furia = 0;

        // Dizzy State reset
        state.punches_received = 0;
        state.isDizzy = false;
        state.dizzyTimer = 0;

        // Panic System reset
        state.isPanic = false;
        state.panicTimer = 0;
        state.consecutiveHits = 0;
        state.lastHitComboCount = 0;

        // Emotion System reset
        emotionSystem.setEmotion(EMOTIONS.NEUTRAL, 0);
        state.currentEmotion = EMOTIONS.NEUTRAL;
        state.emotionDuration = 0;
        state.recentImpacts = [];
        state.lastImpactTime = 0;

        // Reset mesh scales
        torso.scale.set(1, 1, 1);
        head.scale.set(1, 1, 1);

        indicator.visible = true;
        setVisualColor(state.baseColor);
        group.rotation.set(0, 0, 0);
        group.position.copy(newPosition);
        setActive(true);
    }

    // ============================================
    // EMOTION SYSTEM METHODS
    // ============================================

    /**
     * Set NPC emotion
     * @param {string} emotion - 'neutral', 'panic', 'knocked_out'
     * @param {number} duration - Duration in milliseconds
     */
    function setEmotion(emotion, duration = 2000) {
        emotionSystem.setEmotion(emotion, duration);
        state.currentEmotion = emotion;
        state.emotionDuration = duration;

        // Visual feedback for different emotions
        if (emotion === EMOTIONS.PANIC) {
            // Flash orange briefly on panic
            materials.body.color.setHex(0xffaa00);
            setTimeout(() => {
                if (state.active) {
                    materials.body.color.setHex(state.baseColor.getHex());
                }
            }, 200);
        } else if (emotion === EMOTIONS.KNOCKED_OUT) {
            // Gray out on knocked out
            materials.body.color.setHex(0x666666);
        } else if (emotion === EMOTIONS.NEUTRAL) {
            // Restore normal color
            materials.body.color.copy(state.baseColor);
        }
    }

    /**
     * Update emotion system
     * @param {number} delta - Delta time in milliseconds
     */
    function updateEmotions(delta) {
        emotionSystem.update(delta);

        // Auto-recovery for knocked_out
        if (state.currentEmotion === EMOTIONS.KNOCKED_OUT && state.emotionDuration <= 0) {
            setEmotion(EMOTIONS.NEUTRAL, 0);
        }

        state.emotionDuration = emotionSystem.state.emotionDuration;
        state.currentEmotion = emotionSystem.state.currentEmotion;
    }

    /**
     * Record an impact for knocked_out detection
     * @param {number} force - Impact force magnitude
     */
    function recordImpact(force) {
        const now = performance.now();
        state.recentImpacts.push({ force, time: now });

        // Remove old impacts outside the 2-second window
        state.recentImpacts = state.recentImpacts.filter(
            impact => now - impact.time < 2000
        );

        // Calculate total impact force
        const totalForce = state.recentImpacts.reduce((sum, impact) => sum + impact.force, 0);
        const impactCount = state.recentImpacts.length;

        // Check if should trigger knocked_out (threshold: 200 force OR 3+ hits with 150+ total)
        if (force > 200 || (impactCount >= 3 && totalForce > 150)) {
            setEmotion(EMOTIONS.KNOCKED_OUT, 4000); // 4 seconds

            // Stop AI movement briefly
            state.velocity.multiplyScalar(0.1);

            // Play dizzy effect
            startDizzy();
        }

        state.lastImpactTime = now;
    }

    function enterRagdoll(duration, options = {}) {
        if (state.state === NPC_STATES.DEAD) return;

        const { playSound = true, showOverlay = true } = options;

        // Save current state to restore later
        state.savedState = state.state;
        state.isRagdoll = true;
        state.ragdollTimer = duration;
        state.justEnteredRagdoll = true;
        state.ragdollImpactSpeed = state.velocity.length();

        // Set panic emotion when entering ragdoll
        setEmotion(EMOTIONS.PANIC, duration * 1000);

        if (playSound) {
            const intensity = Math.min(1.0, state.ragdollImpactSpeed / 15);
            audioEngine.playSynthSound('ARGH', group.position, 0.7 + intensity * 0.3);
        }

        if (showOverlay && typeof SATIRICAL_TEXTS !== 'undefined' && typeof OverlaySystem !== 'undefined') {
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

        // Restore color and emotion
        setVisualColor(state.baseColor);
        setEmotion(EMOTIONS.NEUTRAL, 0);
    }

    function enterSuspension(duration) {
        state.isSuspended = true;
        state.suspensionTimer = duration;
        state.suspendedVelocity.set(state.velocity.x, 0, state.velocity.z);
    }

    function exitSuspension() {
        state.isSuspended = false;
        state.suspensionTimer = 0;

        // Restore the stored horizontal impulse after the freeze
        state.velocity.x = state.suspendedVelocity.x;
        state.velocity.z = state.suspendedVelocity.z;
        state.suspendedVelocity.set(0, 0, 0);
    }

    function takeDamage(amount, source = null, impulse = 0, isMelee = false, options = {}) {
        if (state.state === NPC_STATES.DEAD) return;

        state.health -= amount;
        state.lastDamageTime = 0;
        state.lastDamagedBy = source;

        const { comboCount = 0 } = options;

        // Record impact for emotion system
        if (impulse > 0) {
            recordImpact(impulse);
        }

        // Visual validation: Flash white on damage
        setVisualColor(new THREE.Color(0xffffff));

        // Track consecutive hits for panic activation
        if (comboCount > 0 && comboCount >= state.lastHitComboCount) {
            state.consecutiveHits++;
        } else {
            state.consecutiveHits = 1;
        }
        state.lastHitComboCount = comboCount;

        // Panic Mode: If player lands 3+ hits without escape, enter FLEE urgency
        if (state.consecutiveHits >= 3 && !state.isPanic) {
            state.isPanic = true;
            state.panicTimer = state.panicDuration;
            state.state = NPC_STATES.FLEE;

            // Visual panic feedback
            setVisualColor(new THREE.Color(0xffaa00)); // Orange panic color
            indicator.material.color.setHex(0xff0000); // Red indicator

            console.log(`[NPC Panic] ${state.id} entering panic mode after ${state.consecutiveHits} consecutive hits`);
        }

        // Immediate knockback easing (visual validation)
        if (impulse > 0 && typeof impulse === 'number') {
            // Apply scale squash on impact direction
            const squashIntensity = Math.min(0.3, impulse / 50.0);
            body.scale.set(1 - squashIntensity, 1 + squashIntensity, 1 - squashIntensity);
            state.squashTimer = 0.2; // Recover squash over 0.2s
        }

        // Dizzy State: Heavy NPCs become Dizzy after 3 melee punches
        if (state.type === 'HEAVY' && isMelee && amount > 0) {
            state.punches_received++;
            if (state.punches_received >= 3) {
                state.isDizzy = true;
                state.dizzyTimer = state.dizzyDuration;
                state.punches_received = 0;

                // Visual feedback for Dizzy state
                setVisualColor(new THREE.Color(0xff6666));
            }
        }

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
        indicator.material.color.setHex(0xffffff);
        setTimeout(() => {
            if (state.active) {
                indicator.material.color.setHex(0x222222);
            }
        }, 100);

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

        setVisualColor(new THREE.Color(0x555555));
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
            decalSystem = null,
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
        state.decalCooldown = Math.max(0, state.decalCooldown - dt);

        // Update emotion system
        updateEmotions(dt * 1000); // Convert to milliseconds

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
            
            // Suspension during ragdoll (Gravity Blast anticipation): freeze horizontal, then restore
            let stillSuspended = state.isSuspended;
            if (stillSuspended) {
                state.suspensionTimer -= dt;
                if (state.suspensionTimer <= 0) {
                    exitSuspension();
                    stillSuspended = false;
                }
            }

            if (stillSuspended) {
                state.velocity.x = 0;
                state.velocity.z = 0;
            } else {
                // Apply friction to horizontal movement
                const friction = GAME_CONFIG.COMBAT.KNOCKBACK_FRICTION || 0.92;
                state.velocity.x *= Math.pow(friction, dt * 60);
                state.velocity.z *= Math.pow(friction, dt * 60);
            }

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

                            // Spawn dust on building impact
                            const impactIntensity = Math.min(state.velocity.length() / 30, 1.0);
                            if (context?.dustEmitterSystem && impactIntensity > 0.5) {
                                context.dustEmitterSystem.spawnDustCloud(
                                    group.position.clone(),
                                    Math.floor(impactIntensity * JUICE_SPRINT_CONFIG.DUST_EMITTER.PARTICLES_PER_IMPACT)
                                );
                            }
                        }
                        break;
                    }
                }
            }
            
            // Snap to ground + impact decals + squash & stretch
            if (typeof terrainHeightAt === 'function') {
                const groundY = terrainHeightAt(group.position.x, group.position.z);
                const desiredY = groundY + 1.0;

                if (group.position.y < desiredY) {
                    const impactSpeed = -state.velocity.y;

                    // Squash & Stretch on ground impact
                    if (impactSpeed > JUICE_SPRINT_CONFIG.SQUASH_STRETCH.MIN_IMPACT_VELOCITY) {
                        const impactIntensity = Math.min(impactSpeed / 30, 1.0);
                        state.squashTimer = JUICE_SPRINT_CONFIG.SQUASH_STRETCH.DURATION;
                        state.squashIntensity = impactIntensity;
                    }

                    if (
                        decalSystem &&
                        state.decalCooldown <= 0 &&
                        impactSpeed > (DOPAMINE_CONFIG.DECAL_SPAWN_VELOCITY_THRESHOLD || 20.0)
                    ) {
                        decalSystem.spawnDecal(
                            new THREE.Vector3(group.position.x, groundY, group.position.z),
                            DOPAMINE_CONFIG.DECAL_LIFETIME || 5.0
                        );
                        state.decalCooldown = 0.2;
                    }

                    group.position.y = desiredY;
                    if (state.velocity.y < 0) {
                        state.velocity.y = 0;
                    }
                }
            }

            // Spawn trails when flying fast (motion lines)
            const horizontalSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
            if (context?.trailsSystem && horizontalSpeed > JUICE_SPRINT_CONFIG.TRAILS.SPAWN_THRESHOLD_VELOCITY) {
                // Spawn trail every few frames to avoid too many particles
                if (Math.random() < 0.3) {
                    context.trailsSystem.spawnTrail(group.position.clone(), JUICE_SPRINT_CONFIG.TRAILS.COLOR);
                }
            }

            // Ragdoll visual: tilt while flying
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

        // Dizzy State update: countdown timer and visual feedback
        if (state.isDizzy) {
            state.dizzyTimer -= dt;
            if (state.dizzyTimer <= 0) {
                state.isDizzy = false;
                setVisualColor(state.baseColor);
            } else {
                // Visual feedback: wobble effect during Dizzy
                const wobble = Math.sin(state.dizzyTimer * 20) * 0.1;
                group.rotation.y = wobble;
            }
        }

        // Panic System update timer
        if (state.isPanic) {
            state.panicTimer -= dt;
            if (state.panicTimer <= 0) {
                state.isPanic = false;
                state.consecutiveHits = 0;
                setVisualColor(state.baseColor);
                console.log(`[NPC Panic] ${state.id} exiting panic mode`);
            }
        }

        // Visual hit flash decay
        if (state.lastDamageTime > 0.08) {
            setVisualColor(state.baseColor);
            indicator.visible = state.state !== NPC_STATES.DEAD;
        }

        // Update squash & stretch recovery (knockback easing)
        if (state.squashTimer > 0) {
            state.squashTimer -= dt;

            // Smooth recovery from squashed to normal scale
            const recoveryProgress = 1.0 - (state.squashTimer / 0.2);
            const scaleXZ = (1.0 - 0.3) + (0.3 * recoveryProgress);
            const scaleY = (1.0 + 0.3) - (0.3 * recoveryProgress);

            if (state.type === 'HEAVY') {
                heavyHumanoid.torso.scale.set(scaleXZ, scaleY, scaleXZ);
                heavyHumanoid.head.scale.set(scaleXZ * 0.9, scaleY * 0.9, scaleXZ * 0.9);
            } else {
                torso.scale.set(scaleXZ, scaleY, scaleXZ);
                head.scale.set(scaleXZ * 0.9, scaleY * 0.9, scaleXZ * 0.9);
            }
        } else {
            // Ensure normal scale
            if (state.type === 'HEAVY') {
                heavyHumanoid.torso.scale.set(1, 1, 1);
                heavyHumanoid.head.scale.set(1, 1, 1);
            } else {
                torso.scale.set(1, 1, 1);
                head.scale.set(1, 1, 1);
            }
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
            // Panic urgency: faster flee speed when in panic mode
            const fleeSpeed = state.isPanic ? 10.0 : 7.5;

            const awayFrom = playerPos ? group.position.clone().sub(playerPos).setY(0) : pickRandomXZDirection();
            if (awayFrom.lengthSq() > 0.001) {
                awayFrom.normalize();
                state.velocity.add(awayFrom.multiplyScalar(fleeSpeed * dt));
                // Extra erratic wiggle - more intense when panicked
                const wiggleIntensity = state.isPanic ? 4.0 : 2.0;
                state.velocity.add(pickRandomXZDirection().multiplyScalar(wiggleIntensity * dt));
            }

            // Panic urgency: flee further before giving up
            const safeDistance = state.isPanic ? fleePlayerRadius * 2.0 : fleePlayerRadius * 1.3;
            if (distToPlayer > safeDistance) {
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
        face,
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
        setEmotion,
        recordImpact,
        getState: () => ({ ...state }),
    };

    Object.defineProperties(api, {
        position: { get: () => group.position },
        health: { get: () => state.health },
        type: { get: () => state.type },
        targetNPC: { get: () => state.targetNPC },
        velocity: { get: () => state.velocity },
    });

    return api;
}
