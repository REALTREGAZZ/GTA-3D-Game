/**
 * Enhanced Player System with Humanoid Animations & Audio
 * Features:
 * - Procedural rigged humanoid character (not blocky)
 * - Animation state machine with smooth transitions
 * - Footstep sounds synchronized to animation
 * - Ambient audio environment
 * - Proper capsule collision for character model
 */

import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';
import { createProceduralRiggedCharacter, generateProceduralAnimations } from './procedural-rigged-character.js';
import { createCapsuleCollider, resolveCapsuleCollisions, snapToGroundY } from './collision-system.js';
import { audioEngine } from './audio-engine.js';

export function createEnhancedPlayer({ position = new THREE.Vector3(0, 2, 0) } = {}) {
    // Create procedural rigged humanoid character (NOT a block!)
    const colorPreset = {
        torso: 0x3366ff,
        arms: 0x2255cc,
        legs: 0x113366,
    };
    
    const characterData = createProceduralRiggedCharacter(colorPreset);
    const group = characterData.scene;
    group.name = 'EnhancedPlayer';
    
    // Get skinned mesh and skeleton for animations
    const skinnedMesh = characterData.skinnedMesh;
    const skeleton = characterData.skeleton;
    const boneMap = characterData.boneMap;
    
    // Setup AnimationMixer for skeletal animation
    const mixer = new THREE.AnimationMixer(skinnedMesh);
    const animations = characterData.animations;
    
    // Create animation clips from procedural animations
    const idleClip = animations.idle;
    const walkClip = animations.walk;
    const runClip = animations.run;
    const jumpClip = animations.jump;
    
    // Create animation actions
    const idleAction = mixer.clipAction(idleClip);
    const walkAction = mixer.clipAction(walkClip);
    const runAction = mixer.clipAction(runClip);
    const jumpAction = mixer.clipAction(jumpClip);
    
    // Animation state
    let currentAction = idleAction;
    let previousAction = null;
    let fadeTime = 0.3; // Cross-fade duration in seconds
    
    // Set initial animation
    idleAction.play();
    
    // Proper capsule collider for humanoid character
    const capsule = createCapsuleCollider({
        radius: 0.35,
        height: 1.8,
        offset: new THREE.Vector3(0, 0, 0),
    });
    const FOOT_OFFSET = 0.05;
    
    // Player state
    const state = {
        velocity: new THREE.Vector3(),
        rotation: 0, // Y-axis rotation in radians
        isGrounded: true,
        isMoving: false,
        isRunning: false,
        isSprinting: false,
        isRolling: false,
        invulnerable: false,
        currentSpeed: 0,
        targetSpeed: 0,
        jumpCooldown: 0,
        rollTimer: 0,
        rollCooldown: 0,
        rollIFrameTimer: 0,
        rollDirection: new THREE.Vector3(0, 0, 1),
        stamina: GAME_CONFIG.PLAYER.MAX_STAMINA,
        _prevRollKeyDown: false,
        
        // Combat state
        flashTime: 0,
        recoil: 0,
        isDead: false,
        ragdollTime: 0,
        ragdollSpin: 0,
        
        // Health
        health: GAME_CONFIG.PLAYER.MAX_HEALTH,
        lastDamageTime: 0,
        
        // Animation state
        currentAnimation: 'idle',
        animationTime: 0,
        lastFootstepTime: 0,
    };
    
    // Audio state
    const audioState = {
        ambientPlaying: false,
        ambientVolume: 0.3,
        footstepVolume: 0.5,
        lastFootstepAnimProgress: 0,
    };
    
    // Movement vectors
    const moveDirection = new THREE.Vector3();
    const _movement = new THREE.Vector3();
    const _facing = new THREE.Vector3();
    const _capBottom = new THREE.Vector3();
    const _capTop = new THREE.Vector3();
    
    // Constants
    const ROLL_DURATION = 0.35;
    const ROLL_IFRAMES = 0.22;
    const ROLL_COOLDOWN = 0.5;
    const ROLL_SPEED = 14.0;
    
    const WALK_THRESHOLD = 0.5;
    const RUN_THRESHOLD = 3.5;
    
    // Initialize ambient audio
    function initAmbientAudio() {
        if (audioState.ambientPlaying) return;
        
        audioEngine.init();
        // Note: We'll use synthesized ambient sounds since we don't have audio files
        audioState.ambientPlaying = true;
        console.log('[EnhancedPlayer] Ambient audio initialized');
    }
    
    // Play footstep sound
    function playFootstep(speed) {
        const now = performance.now();
        
        // Don't play footsteps too rapidly
        if (now - audioState.lastFootstepAnimProgress < 150) return;
        
        audioState.lastFootstepAnimProgress = now;
        
        // Synthesize footstep sound
        const volume = Math.min(0.6, 0.3 + (speed / 18) * 0.3);
        
        // Create footstep sound synthesis
        if (audioEngine.audioContext) {
            const ctx = audioEngine.audioContext;
            const gainNode = ctx.createGain();
            
            // Connect to master gain
            gainNode.connect(audioEngine.masterGain || ctx.destination);
            
            // Create noise burst for footstep
            const bufferSize = ctx.sampleRate * 0.1;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
            }
            
            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = buffer;
            
            // Lowpass filter for muddy footstep sound
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400 + Math.random() * 200;
            
            // Envelope
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            
            noiseSource.connect(filter);
            filter.connect(gainNode);
            noiseSource.start(ctx.currentTime);
            noiseSource.stop(ctx.currentTime + 0.1);
        }
    }
    
    // Switch animation with cross-fade
    function switchAnimation(action, animationName) {
        if (currentAction === action) return;
        
        previousAction = currentAction;
        currentAction = action;
        state.currentAnimation = animationName;
        
        if (previousAction) {
            previousAction.fadeOut(fadeTime);
        }
        currentAction.reset().fadeIn(fadeTime).play();
    }
    
    // Update animation based on movement state
    function updateAnimation(deltaTime) {
        state.animationTime += deltaTime;
        
        // Determine target animation based on state
        let targetAction = idleAction;
        let targetAnimationName = 'idle';
        
        if (!state.isGrounded) {
            targetAction = jumpAction;
            targetAnimationName = 'jump';
        } else if (state.isMoving) {
            const speed = state.currentSpeed;
            
            if (speed >= RUN_THRESHOLD) {
                targetAction = runAction;
                targetAnimationName = 'run';
            } else if (speed > WALK_THRESHOLD) {
                targetAction = walkAction;
                targetAnimationName = 'walk';
            } else {
                targetAction = idleAction;
                targetAnimationName = 'idle';
            }
        } else {
            targetAction = idleAction;
            targetAnimationName = 'idle';
        }
        
        // Switch animation with cross-fade
        switchAnimation(targetAction, targetAnimationName);
        
        // Sync animation speed to movement velocity
        if (state.currentAnimation === 'walk' || state.currentAnimation === 'run') {
            const baseSpeed = state.currentAnimation === 'run' ? 12 : 5;
            const speedRatio = state.currentSpeed / baseSpeed;
            currentAction.timeScale = Math.max(0.5, Math.min(1.5, speedRatio));
        } else {
            currentAction.timeScale = 1.0;
        }
        
        // Update mixer
        mixer.update(deltaTime);
        
        // Check for footstep events
        checkFootsteps();
    }
    
    // Check animation progress for footstep triggers
    function checkFootsteps() {
        if (state.currentAnimation !== 'walk' && state.currentAnimation !== 'run') return;
        if (!state.isGrounded) return;
        
        // Get animation progress (0-1)
        const clip = currentAction.getClip();
        if (!clip) return;
        
        const duration = clip.duration * (currentAction.timeScale || 1);
        if (duration <= 0) return;
        
        const currentTime = mixer.time % duration;
        const progress = currentTime / duration;
        
        // Footsteps at ~33% and ~67% of animation cycle
        const leftFootStep = 0.33;
        const rightFootStep = 0.67;
        
        const lastProgress = state.lastFootstepAnimProgress;
        state.lastFootstepAnimProgress = progress;
        
        // Check if we crossed a footstep threshold
        if ((lastProgress < leftFootStep && progress >= leftFootStep) ||
            (lastProgress < rightFootStep && progress >= rightFootStep)) {
            playFootstep(state.currentSpeed);
        }
    }
    
    function update(deltaTime, inputKeys, colliders = [], terrainHeightAt = 0, cameraAngle = 0) {
        // Initialize audio on first update
        initAmbientAudio();
        
        // If dead, update ragdoll
        if (state.isDead) {
            updateRagdoll(deltaTime);
            mixer.update(deltaTime);
            return;
        }
        
        // Update flash effect
        if (state.flashTime > 0) {
            state.flashTime -= deltaTime;
        }
        
        // Update recoil
        if (state.recoil > 0) {
            state.recoil -= deltaTime * 5;
            if (state.recoil < 0) state.recoil = 0;
        }
        
        const getGroundY = typeof terrainHeightAt === 'function'
            ? terrainHeightAt
            : () => terrainHeightAt;
        
        // Roll timers / i-frames
        state.rollCooldown = Math.max(0, state.rollCooldown - deltaTime);
        state.rollTimer = Math.max(0, state.rollTimer - deltaTime);
        state.rollIFrameTimer = Math.max(0, state.rollIFrameTimer - deltaTime);
        state.invulnerable = state.rollIFrameTimer > 0;
        if (state.isRolling && state.rollTimer <= 0) {
            state.isRolling = false;
        }
        
        // Reset movement flags
        state.isMoving = false;
        state.isRunning = false;
        state.isSprinting = false;
        
        // Calculate movement direction from input
        moveDirection.set(0, 0, 0);
        
        // Relative to camera angles
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
        const right = new THREE.Vector3(1, 0, 0);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
        
        // Check forward/backward
        if (inputKeys.KeyW || inputKeys.ArrowUp) {
            moveDirection.add(forward);
        }
        if (inputKeys.KeyS || inputKeys.ArrowDown) {
            moveDirection.sub(forward);
        }
        
        // Check left/right
        if (inputKeys.KeyA || inputKeys.ArrowLeft) {
            moveDirection.sub(right);
        }
        if (inputKeys.KeyD || inputKeys.ArrowRight) {
            moveDirection.add(right);
        }
        
        // Normalize movement direction
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize();
            state.isMoving = true;
            
            const wantsRun = inputKeys.ShiftLeft || inputKeys.ShiftRight;
            const wantsSprint = wantsRun && (inputKeys.ControlLeft || inputKeys.ControlRight);
            
            if (wantsSprint && state.stamina > 0.5) {
                state.isSprinting = true;
                state.targetSpeed = GAME_CONFIG.PLAYER.SPRINT_SPEED;
            } else if (wantsRun) {
                state.isRunning = true;
                state.targetSpeed = GAME_CONFIG.PLAYER.RUN_SPEED;
            } else {
                state.targetSpeed = GAME_CONFIG.PLAYER.WALK_SPEED;
            }
        } else {
            state.targetSpeed = 0;
        }
        
        // Smooth speed transition
        const acceleration = 15.0;
        const deceleration = 20.0;
        if (state.targetSpeed > state.currentSpeed) {
            state.currentSpeed = Math.min(
                state.targetSpeed,
                state.currentSpeed + acceleration * deltaTime
            );
        } else {
            state.currentSpeed = Math.max(
                state.targetSpeed,
                state.currentSpeed - deceleration * deltaTime
            );
        }
        
        // Stamina
        const maxStamina = GAME_CONFIG.PLAYER.MAX_STAMINA;
        if (state.isSprinting && state.isMoving) {
            state.stamina = Math.max(0, state.stamina - GAME_CONFIG.PLAYER.STAMINA_DRAIN_RATE * deltaTime);
        } else {
            state.stamina = Math.min(maxStamina, state.stamina + GAME_CONFIG.PLAYER.STAMINA_REGEN_RATE * deltaTime);
        }
        
        // Rotate player to face movement direction
        if (state.isMoving && moveDirection.lengthSq() > 0) {
            const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
            
            // Smooth rotation
            let rotationDiff = targetRotation - state.rotation;
            
            // Normalize angle difference to [-PI, PI]
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
            
            const rotationSpeed = 10.0;
            state.rotation += rotationDiff * Math.min(1.0, rotationSpeed * deltaTime);
            
            group.rotation.y = state.rotation;
        }
        
        // Roll input
        const rollKeyDown = !!inputKeys.KeyQ;
        const rollPressed = rollKeyDown && !state._prevRollKeyDown;
        state._prevRollKeyDown = rollKeyDown;
        
        if (
            rollPressed &&
            state.isGrounded &&
            !state.isRolling &&
            state.rollCooldown <= 0 &&
            state.stamina >= GAME_CONFIG.PLAYER.SPRINT_STAMINA_COST
        ) {
            state.isRolling = true;
            state.rollTimer = ROLL_DURATION;
            state.rollIFrameTimer = ROLL_IFRAMES;
            state.rollCooldown = ROLL_COOLDOWN;
            state.stamina = Math.max(0, state.stamina - GAME_CONFIG.PLAYER.SPRINT_STAMINA_COST);
            
            if (state.isMoving) {
                state.rollDirection.copy(moveDirection);
            } else {
                _facing.set(Math.sin(state.rotation), 0, Math.cos(state.rotation));
                if (_facing.lengthSq() < 1e-6) _facing.set(0, 0, 1);
                _facing.normalize();
                state.rollDirection.copy(_facing);
            }
        }
        
        // Apply movement
        _movement.set(0, 0, 0);
        if (state.isRolling) {
            _movement.copy(state.rollDirection).multiplyScalar(ROLL_SPEED * deltaTime);
        } else if (state.currentSpeed > 0) {
            _movement.copy(moveDirection).multiplyScalar(state.currentSpeed * deltaTime);
        }
        
        if (_movement.lengthSq() > 0) {
            group.position.add(_movement);
            resolveCapsuleCollisions(group.position, capsule, colliders, { iterations: 2 });
        }
        
        // Apply gravity
        if (!state.isGrounded) {
            state.velocity.y -= GAME_CONFIG.PLAYER.GRAVITY * deltaTime;
        } else {
            state.velocity.y = 0;
        }
        
        // Jump
        if (inputKeys.Space && state.isGrounded && state.jumpCooldown <= 0) {
            state.velocity.y = GAME_CONFIG.PLAYER.JUMP_FORCE;
            state.isGrounded = false;
            state.jumpCooldown = GAME_CONFIG.PLAYER.JUMP_COOLDOWN;
        }
        
        // Update jump cooldown
        if (state.jumpCooldown > 0) {
            state.jumpCooldown -= deltaTime;
        }
        
        // Apply vertical velocity
        group.position.y += state.velocity.y * deltaTime;
        
        // Ground check
        const groundLevel = getGroundY(group.position.x, group.position.z);
        const targetY = groundLevel + FOOT_OFFSET;
        
        if (group.position.y <= targetY) {
            group.position.y = targetY;
            state.isGrounded = true;
            state.velocity.y = 0;
        } else {
            state.isGrounded = false;
        }
        
        // Snap to terrain when walking over small height changes
        if (state.isGrounded) {
            group.position.y = snapToGroundY(group.position.y, groundLevel, {
                footOffset: FOOT_OFFSET,
                dt: deltaTime,
            });
        }
        
        // Keep within terrain bounds
        const maxDistance = 280;
        if (Math.abs(group.position.x) > maxDistance) {
            group.position.x = Math.sign(group.position.x) * maxDistance;
        }
        if (Math.abs(group.position.z) > maxDistance) {
            group.position.z = Math.sign(group.position.z) * maxDistance;
        }
        
        // Update animations
        updateAnimation(deltaTime);
    }
    
    function updateRagdoll(deltaTime) {
        state.ragdollTime += deltaTime;
        state.ragdollSpin += GAME_CONFIG.COMBAT.RAGDOLL_SPIN_SPEED * deltaTime;
        
        // Slow fall during death
        const slowFall = 0.5;
        group.position.y -= 2 * deltaTime * slowFall;
        
        // Spin the body
        group.rotation.x = Math.sin(state.ragdollTime * 3) * 0.3;
        group.rotation.y = state.ragdollSpin * Math.PI / 180;
        group.rotation.z = Math.cos(state.ragdollTime * 2) * 0.2;
        
        // Keep within bounds
        const maxDistance = 280;
        if (Math.abs(group.position.x) > maxDistance) {
            group.position.x = Math.sign(group.position.x) * maxDistance;
        }
        if (Math.abs(group.position.z) > maxDistance) {
            group.position.z = Math.sign(group.position.z) * maxDistance;
        }
        
        // Floor collision
        if (group.position.y < 0) {
            group.position.y = 0;
        }
    }
    
    function checkCollision(position, colliders) {
        if (!colliders || colliders.length === 0) return false;
        
        _capBottom.copy(position).add(capsule.offset);
        _capTop.copy(_capBottom);
        _capBottom.y += capsule.radius;
        _capTop.y += capsule.height - capsule.radius;
        
        for (const collider of colliders) {
            const box = collider?.box;
            if (!box) continue;
            
            if (box.distanceToPoint(_capBottom) <= capsule.radius) return true;
            if (box.distanceToPoint(_capTop) <= capsule.radius) return true;
        }
        
        return false;
    }
    
    function getPosition() {
        return group.position.clone();
    }
    
    function getRotation() {
        return state.rotation;
    }
    
    function getState() {
        return { ...state };
    }
    
    function getCameraTarget() {
        const target = group.position.clone();
        target.y += GAME_CONFIG.PLAYER.CAMERA_HEIGHT;
        return target;
    }
    
    function takeDamage(amount, direction) {
        if (state.invulnerable) return;
        state.health -= amount;
        state.lastDamageTime = 0;
        
        // Flash effect
        state.flashTime = GAME_CONFIG.COMBAT.IMPACT_FLASH_DURATION;
        
        // Apply knockback
        const knockback = new THREE.Vector3(direction.x, 0, direction.z);
        const magnitude = Math.min(amount * GAME_CONFIG.COMBAT.KNOCKBACK_MULTIPLIER, GAME_CONFIG.COMBAT.MAX_KNOCKBACK);
        knockback.normalize().multiplyScalar(magnitude);
        
        group.position.add(knockback);
        
        // Check for death
        if (state.health <= 0) {
            state.health = 0;
            triggerDeath();
        }
    }
    
    function triggerDeath() {
        if (state.isDead) return;
        
        state.isDead = true;
        state.ragdollTime = 0;
        state.ragdollSpin = 0;
    }
    
    function respawn(position) {
        state.health = GAME_CONFIG.PLAYER.MAX_HEALTH;
        state.isDead = false;
        state.ragdollTime = 0;
        state.ragdollSpin = 0;
        state.flashTime = 0;
        state.recoil = 0;
        state.velocity.set(0, 0, 0);
        state.isGrounded = true;
        state.stamina = GAME_CONFIG.PLAYER.MAX_STAMINA;
        state.isRolling = false;
        state.invulnerable = false;
        state.rollTimer = 0;
        state.rollCooldown = 0;
        state.rollIFrameTimer = 0;
        
        // Reset to idle animation
        switchAnimation(idleAction, 'idle');
        
        group.position.copy(position);
        group.rotation.set(0, 0, 0);
    }
    
    function getHealth() {
        return state.health;
    }
    
    function setColliders(colliders) {
        group.userData.colliders = colliders;
    }
    
    return {
        mesh: group,
        skinnedMesh,
        skeleton,
        boneMap,
        state,
        get colliders() { return group.userData.colliders || []; },
        update,
        checkCollision,
        getPosition,
        getRotation,
        getState,
        getCameraTarget,
        takeDamage,
        triggerDeath,
        respawn,
        getHealth,
        setColliders,
    };
}
