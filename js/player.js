/**
 * Player System
 * Handles player model, movement, rotation, collision detection, and combat mechanics
 */

import * as THREE from 'three';
import { GAME_CONFIG, PHYSICS_CONFIG, GRAPHICS_PRESETS } from './config.js';
import { applyToonMaterial } from './world.js';
import { createLowPolyHumanoid, createPlayerCloth, EMOTIONS } from './lowpoly-characters.js';
import { createCapsuleCollider, resolveCapsuleCollisions, snapToGroundY } from './collision-system.js';

export function createPlayer({ position = new THREE.Vector3(0, 2, 0) } = {}) {
    // Create low-poly humanoid for player (with unique appearance)
    const playerColorPreset = {
        torso: 0x444444,
        arms: 0x555555,
        legs: 0x222222,
    };
    const humanoid = createLowPolyHumanoid(playerColorPreset, true); // true = isPlayer
    const group = humanoid.group;
    group.name = 'Player';

    // Get references to body parts
    const body = humanoid.torso;
    const head = humanoid.head;
    const face = humanoid.face;
    const leftArm = humanoid.leftArm;
    const rightArm = humanoid.rightArm;
    const leftLeg = humanoid.leftLeg;
    const rightLeg = humanoid.rightLeg;
    const materials = humanoid.materials;

    // Create feet group for animation system (wraps both legs)
    // Note: leftLeg and rightLeg are already added to group by createLowPolyHumanoid
    // We create feet group but don't reparent the legs to maintain hierarchy
    const feet = new THREE.Group();
    feet.position.set(0, 0, 0);
    feet.rotation.set(0, 0, 0);
    feet.scale.set(1, 1, 1);
    group.add(feet);

    // Direction indicator
    const indicatorGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.4);
    const indicatorMaterial = new THREE.MeshToonMaterial({
        color: 0x333333,
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(0, 1.1, 0.5);
    group.add(indicator);

    // Create optional cloth cape
    const cloth = createPlayerCloth(group);

    // Set initial position
    group.position.copy(position);

    // Original materials for flash effect
    const originalBodyMaterial = materials.body.clone();
    const originalHeadMaterial = materials.head.clone();
    const originalArmMaterial = materials.arm.clone();
    const originalLegMaterial = materials.leg.clone();

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

        // Health (visual-only; actual gameplay health lives in GameState)
        health: GAME_CONFIG.PLAYER.MAX_HEALTH,
        lastDamageTime: 0,
    };

    // Proper capsule collider (feet-origin character)
    const capsule = createCapsuleCollider({
        radius: 0.4,
        height: 1.8,
        offset: new THREE.Vector3(0, 0, 0),
    });
    const FOOT_OFFSET = 0.05;

    const ROLL_DURATION = 0.35;
    const ROLL_IFRAMES = 0.22;
    const ROLL_COOLDOWN = 0.5;
    const ROLL_SPEED = 14.0;

    // Player movement
    const moveDirection = new THREE.Vector3();
    const _movement = new THREE.Vector3();
    const _facing = new THREE.Vector3();
    const _capBottom = new THREE.Vector3();
    const _capTop = new THREE.Vector3();

    function update(deltaTime, inputKeys, colliders = [], terrainHeightAt = 0, cameraAngle = 0) {
        // If dead and in ragdoll mode
        if (state.isDead) {
            updateRagdoll(deltaTime);
            return;
        }

        // Update flash effect
        if (state.flashTime > 0) {
            state.flashTime -= deltaTime;
            if (state.flashTime <= 0) {
                // Restore original materials
                materials.body = originalBodyMaterial;
                materials.head = originalHeadMaterial;
                materials.arm = originalArmMaterial;
                materials.leg = originalLegMaterial;
            } else {
                // Flash white
                materials.body.color.setHex(0xffffff);
                materials.head.color.setHex(0xffffff);
                materials.arm.color.setHex(0xffffff);
                materials.leg.color.setHex(0xffffff);
            }
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

        // Apply movement (in world space)
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

        // Ground check (terrain height)
        const groundLevel = getGroundY(group.position.x, group.position.z);
        const targetY = groundLevel + FOOT_OFFSET;

        if (group.position.y <= targetY) {
            group.position.y = targetY;
            state.isGrounded = true;
            state.velocity.y = 0;
        } else {
            state.isGrounded = false;
        }

        // If grounded, keep glued to the terrain when walking over small height changes
        if (state.isGrounded) {
            group.position.y = snapToGroundY(group.position.y, groundLevel, {
                footOffset: FOOT_OFFSET,
                dt: deltaTime,
            });
        }

        // Keep player within terrain bounds
        const maxDistance = 280;
        if (Math.abs(group.position.x) > maxDistance) {
            group.position.x = Math.sign(group.position.x) * maxDistance;
        }
        if (Math.abs(group.position.z) > maxDistance) {
            group.position.z = Math.sign(group.position.z) * maxDistance;
        }

        // Update cloth simulation
        if (cloth && state.isMoving) {
            cloth.update(deltaTime, moveDirection);
        }
    }

    function updateRagdoll(deltaTime) {
        // Ragdoll spin animation (exaggerated)
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
        // Return position at eye level for camera to look at
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

        // Apply knockback in XZ plane only (no vertical fly)
        const knockback = new THREE.Vector3(direction.x, 0, direction.z);
        const magnitude = Math.min(amount * GAME_CONFIG.COMBAT.KNOCKBACK_MULTIPLIER, GAME_CONFIG.COMBAT.MAX_KNOCKBACK);
        knockback.normalize().multiplyScalar(magnitude);

        // Apply to position directly (simple knockback)
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

        // Change materials to show death
        materials.body.color.setHex(0x444444);
        materials.head.color.setHex(0x444444);
        materials.arm.color.setHex(0x444444);
        materials.leg.color.setHex(0x444444);
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

        // Restore materials
        materials.body = originalBodyMaterial;
        materials.head = originalHeadMaterial;
        materials.arm = originalArmMaterial;
        materials.leg = originalLegMaterial;

        // Reset position
        group.position.copy(position);
        group.rotation.set(0, 0, 0);
    }

    function getHealth() {
        return state.health;
    }

    function setColliders(colliders) {
        // Store colliders for collision checking
        group.userData.colliders = colliders;
    }

    return {
        mesh: group,
        body,
        head,
        face,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        feet,
        indicator,
        state,
        get colliders() { return group.userData.colliders || []; },
        update,
        getPosition,
        getRotation,
        getState,
        getCameraTarget,
        checkCollision,
        takeDamage,
        triggerDeath,
        respawn,
        getHealth,
        setColliders,
    };
}
