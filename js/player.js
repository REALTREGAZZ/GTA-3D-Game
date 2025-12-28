/**
 * Player System
 * Handles player model, movement, rotation, collision detection, and combat mechanics
 */

import * as THREE from 'three';
import { GAME_CONFIG, PHYSICS_CONFIG, GRAPHICS_PRESETS } from './config.js';
import { applyToonMaterial } from './world.js';
import { createLowPolyHumanoid, createPlayerCloth, EMOTIONS } from './lowpoly-characters.js';

export function createPlayer({ position = new THREE.Vector3(0, 2, 0) } = {}) {
    // Create low-poly humanoid for player (with unique appearance)
    const playerColorPreset = {
        torso: 0xffffff,
        arms: 0xffffff,
        legs: 0x333333,
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
        currentSpeed: 0,
        targetSpeed: 0,
        jumpCooldown: 0,

        // Combat state
        flashTime: 0,
        recoil: 0,
        isDead: false,
        ragdollTime: 0,
        ragdollSpin: 0,

        // Health
        health: GAME_CONFIG.PLAYER.MAX_HEALTH,
        lastDamageTime: 0,
    };

    // Player movement
    const moveDirection = new THREE.Vector3();

    function update(deltaTime, inputKeys, colliders = [], groundY = 0, cameraAngle = 0) {
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

            // Determine speed based on input
            if (inputKeys.ShiftLeft || inputKeys.ShiftRight) {
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

        // Apply movement (in world space)
        if (state.currentSpeed > 0) {
            const movement = moveDirection.clone().multiplyScalar(state.currentSpeed * deltaTime);

            // Check collision before moving
            const newPosition = group.position.clone().add(movement);
            if (!checkCollision(newPosition, colliders)) {
                group.position.copy(newPosition);
            } else {
                // Try sliding along walls
                const slideX = new THREE.Vector3(movement.x, 0, 0);
                const testPosX = group.position.clone().add(slideX);
                if (!checkCollision(testPosX, colliders)) {
                    group.position.copy(testPosX);
                }

                const slideZ = new THREE.Vector3(0, 0, movement.z);
                const testPosZ = group.position.clone().add(slideZ);
                if (!checkCollision(testPosZ, colliders)) {
                    group.position.copy(testPosZ);
                }
            }
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
        const groundLevel = groundY;
        if (group.position.y <= groundLevel) {
            group.position.y = groundLevel;
            state.isGrounded = true;
            state.velocity.y = 0;
        } else {
            state.isGrounded = false;
        }

        // If grounded, keep glued to the terrain when walking over small height changes
        if (state.isGrounded) {
            group.position.y = groundLevel;
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

        const playerRadius = GAME_CONFIG.PLAYER.RADIUS * 1.2; // Slightly larger for safety
        const playerCenter = position.clone();
        playerCenter.y += GAME_CONFIG.PLAYER.HEIGHT / 2;

        for (const collider of colliders) {
            const distance = collider.box.distanceToPoint(playerCenter);
            if (distance <= playerRadius) {
                return true;
            }
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
        indicator,
        state,
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
