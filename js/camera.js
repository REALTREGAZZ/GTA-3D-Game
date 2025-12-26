/**
 * Camera System
 * Third-person camera with smooth following, shake, and replay mode
 */

import * as THREE from 'three';
import { CAMERA_CONFIG, INPUT_CONFIG } from './config.js';

export function createThirdPersonCamera(camera, player) {
    const state = {
        distance: CAMERA_CONFIG.THIRD_PERSON.DEFAULT_DISTANCE,
        horizontalAngle: 0,
        verticalAngle: CAMERA_CONFIG.THIRD_PERSON.DEFAULT_VERTICAL_ANGLE,

        // Current smoothed position
        currentPosition: new THREE.Vector3(),
        currentLookAt: new THREE.Vector3(),

        // Target position
        targetPosition: new THREE.Vector3(),
        targetLookAt: new THREE.Vector3(),

        // Mouse control
        isMouseControlEnabled: true, // Enabled by default
        pointerLocked: false,
        lastMouseInputTime: 0,

        // Shake state
        shakeIntensity: 0,
        shakeDuration: 0,
        shakeTime: 0,
        shakeDecay: CAMERA_CONFIG.SHAKE.DECAY_RATE,

        // Recoil
        recoilPitch: 0,
        recoilYaw: 0,
        recoilRecovery: 5.0,

        // Replay mode
        isReplayMode: false,
        replayPosition: new THREE.Vector3(),
        replayLookAt: new THREE.Vector3(),
    };

    // Initialize camera position
    const playerPos = player.getPosition();
    state.currentPosition.set(
        playerPos.x,
        playerPos.y + CAMERA_CONFIG.THIRD_PERSON.HEIGHT_OFFSET,
        playerPos.z + state.distance
    );
    state.currentLookAt.copy(player.getCameraTarget());

    camera.position.copy(state.currentPosition);
    camera.lookAt(state.currentLookAt);

    // Setup pointer lock for mouse control (optional)
    function enableMouseControl(canvas) {
        if (!canvas) return;

        canvas.addEventListener('click', () => {
            if (!state.pointerLocked && !state.isReplayMode) {
                canvas.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            state.pointerLocked = document.pointerLockElement === canvas;
            state.isMouseControlEnabled = state.pointerLocked;
        });

        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock error');
        });
    }

    function addShake(intensity, duration) {
        state.shakeIntensity = Math.max(state.shakeIntensity, intensity);
        state.shakeDuration = Math.max(state.shakeDuration, duration);
        state.shakeTime = duration;
    }

    function updateShake(deltaTime) {
        if (state.shakeTime > 0) {
            state.shakeTime -= deltaTime;

            // Calculate shake amount
            const shakeAmount = state.shakeIntensity * (state.shakeTime / state.shakeDuration);
            state.shakeIntensity = shakeAmount;

            if (state.shakeTime <= 0) {
                state.shakeIntensity = 0;
            }
        }
    }

    function applyShake() {
        if (state.shakeIntensity <= 0) return;

        const shakeX = (Math.random() - 0.5) * 2 * state.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * 2 * state.shakeIntensity;
        const shakeZ = (Math.random() - 0.5) * 2 * state.shakeIntensity;

        camera.position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
    }

    function updateRecoil(deltaTime) {
        // Recover from recoil
        if (state.recoilPitch > 0) {
            state.recoilPitch -= state.recoilRecovery * deltaTime;
            if (state.recoilPitch < 0) state.recoilPitch = 0;
        }
        if (state.recoilYaw > 0) {
            state.recoilYaw -= state.recoilRecovery * deltaTime;
            if (state.recoilYaw < 0) state.recoilYaw = 0;
        }
    }

    function applyRecoil() {
        if (state.recoilPitch <= 0 && state.recoilYaw <= 0) return;

        camera.rotation.x += state.recoilPitch;
        camera.rotation.y += state.recoilYaw;
    }

    function update(deltaTime, mouseInput = null) {
        // Update shake and recoil first
        updateShake(deltaTime);
        updateRecoil(deltaTime);

        // In replay mode, use replay camera
        if (state.isReplayMode) {
            camera.position.copy(state.replayPosition);
            camera.lookAt(state.replayLookAt);
            applyShake();
            return;
        }

        // Get player position and rotation
        const playerPos = player.getPosition();
        const playerRotation = player.getRotation();

        const sensitivity = CAMERA_CONFIG.CONTROLS?.MOUSE_SENSITIVITY || 0.005;
        const autoFollowDelay = CAMERA_CONFIG.CONTROLS?.AUTO_FOLLOW_DELAY || 2.0;

        // Update camera angles based on mouse input
        if (mouseInput && (mouseInput.deltaX !== 0 || mouseInput.deltaY !== 0)) {
            state.horizontalAngle -= mouseInput.deltaX * sensitivity;
            state.verticalAngle += mouseInput.deltaY * sensitivity;

            state.lastMouseInputTime = performance.now() / 1000;

            // Clamp vertical angle ±60°
            const limit = Math.PI / 3; // 60 degrees
            state.verticalAngle = Math.max(-limit, Math.min(limit, state.verticalAngle));
        } else {
            // Auto-follow after delay
            const currentTime = performance.now() / 1000;
            if (currentTime - state.lastMouseInputTime > autoFollowDelay) {
                // Smoothly interpolate back to player rotation
                let angleDiff = playerRotation - state.horizontalAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                state.horizontalAngle += angleDiff * deltaTime * 2.0;
                
                // Also reset vertical angle slowly
                state.verticalAngle += (CAMERA_CONFIG.THIRD_PERSON.DEFAULT_VERTICAL_ANGLE - state.verticalAngle) * deltaTime;
            }
        }

        // Calculate target camera position based on angles
        const horizontalDistance = state.distance * Math.cos(state.verticalAngle);
        const verticalDistance = state.distance * Math.sin(state.verticalAngle);

        state.targetPosition.set(
            playerPos.x + horizontalDistance * Math.sin(state.horizontalAngle + Math.PI),
            playerPos.y + CAMERA_CONFIG.THIRD_PERSON.HEIGHT_OFFSET + verticalDistance,
            playerPos.z + horizontalDistance * Math.cos(state.horizontalAngle + Math.PI)
        );

        // Camera look-at target (player's head/eye level)
        state.targetLookAt.copy(player.getCameraTarget());

        // Smooth camera movement (frame-rate independent)
        const smoothing = CAMERA_CONFIG.THIRD_PERSON.SMOOTHING_FACTOR;
        const t = 1 - Math.pow(1 - smoothing, Math.min(1, deltaTime * 60));
        state.currentPosition.lerp(state.targetPosition, t);
        state.currentLookAt.lerp(state.targetLookAt, t);

        // Apply to camera (base position)
        camera.position.copy(state.currentPosition);
        camera.lookAt(state.currentLookAt);

        // Apply shake after lookAt
        applyShake();

        // Apply recoil after shake
        applyRecoil();

        // Reset mouse deltas (they should be reset each frame)
        if (mouseInput) {
            mouseInput.deltaX = 0;
            mouseInput.deltaY = 0;
        }
    }

    // Replay camera mode
    function enterReplayMode(position, lookAt) {
        state.isReplayMode = true;
        state.replayPosition.copy(position);
        state.replayLookAt.copy(lookAt);
        camera.position.copy(position);
        camera.lookAt(lookAt);
    }

    function updateReplayCamera(position, lookAt) {
        if (!state.isReplayMode) return;
        state.replayPosition.copy(position);
        state.replayLookAt.copy(lookAt);
        camera.position.copy(position);
        camera.lookAt(lookAt);
    }

    function exitReplayMode() {
        state.isReplayMode = false;
    }

    function setDistance(newDistance) {
        state.distance = Math.max(
            CAMERA_CONFIG.THIRD_PERSON.MIN_DISTANCE,
            Math.min(CAMERA_CONFIG.THIRD_PERSON.MAX_DISTANCE, newDistance)
        );
    }

    function zoomIn(amount = 1) {
        setDistance(state.distance - amount * CAMERA_CONFIG.THIRD_PERSON.ZOOM_SPEED);
    }

    function zoomOut(amount = 1) {
        setDistance(state.distance + amount * CAMERA_CONFIG.THIRD_PERSON.ZOOM_SPEED);
    }

    function getState() {
        return { ...state };
    }

    function toggleMouseControl() {
        state.isMouseControlEnabled = !state.isMouseControlEnabled;
        return state.isMouseControlEnabled;
    }

    return {
        state,
        update,
        setDistance,
        zoomIn,
        zoomOut,
        getState,
        enableMouseControl,
        toggleMouseControl,
        addShake,
        enterReplayMode,
        updateReplayCamera,
        exitReplayMode,
    };
}

// Alternative: Simple follow camera (no mouse control)
export function createSimpleFollowCamera(camera, player) {
    const offset = new THREE.Vector3(0, 5, 8);
    const smoothing = 0.1;
    const currentPosition = new THREE.Vector3();
    const currentLookAt = new THREE.Vector3();

    // Initialize
    const playerPos = player.getPosition();
    currentPosition.copy(playerPos).add(offset);
    currentLookAt.copy(playerPos);
    camera.position.copy(currentPosition);
    camera.lookAt(currentLookAt);

    function update(deltaTime) {
        const playerPos = player.getPosition();
        const playerRotation = player.getRotation();

        // Calculate offset rotated by player rotation
        const rotatedOffset = offset.clone();
        rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);

        // Target position
        const targetPosition = playerPos.clone().add(rotatedOffset);
        const targetLookAt = player.getCameraTarget();

        // Smooth follow
        currentPosition.lerp(targetPosition, smoothing);
        currentLookAt.lerp(targetLookAt, smoothing);

        camera.position.copy(currentPosition);
        camera.lookAt(currentLookAt);
    }

    return {
        update,
        offset,
    };
}
