/**
 * Camera System
 * Third-person camera with smooth following and optional mouse rotation
 */

import * as THREE from 'three';
import { CAMERA_CONFIG, INPUT_CONFIG } from './config.js';

export function createThirdPersonCamera(camera, player) {
    const state = {
        distance: CAMERA_CONFIG.THIRD_PERSON.DEFAULT_DISTANCE,
        horizontalAngle: 0, // Rotation around player (Y-axis)
        verticalAngle: CAMERA_CONFIG.THIRD_PERSON.DEFAULT_VERTICAL_ANGLE,
        
        // Current smoothed position
        currentPosition: new THREE.Vector3(),
        currentLookAt: new THREE.Vector3(),
        
        // Target position
        targetPosition: new THREE.Vector3(),
        targetLookAt: new THREE.Vector3(),
        
        // Mouse control
        isMouseControlEnabled: false,
        pointerLocked: false,
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
            if (!state.pointerLocked) {
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

    function update(deltaTime, mouseInput = null) {
        // Get player position and rotation
        const playerPos = player.getPosition();
        const playerRotation = player.getRotation();

        // Update camera angles based on mouse input (if available and enabled)
        if (state.isMouseControlEnabled && mouseInput && (mouseInput.deltaX !== 0 || mouseInput.deltaY !== 0)) {
            state.horizontalAngle -= mouseInput.deltaX * INPUT_CONFIG.MOUSE.SENSITIVITY;
            state.verticalAngle += mouseInput.deltaY * INPUT_CONFIG.MOUSE.SENSITIVITY * (INPUT_CONFIG.MOUSE.INVERT_Y ? -1 : 1);

            // Clamp vertical angle
            state.verticalAngle = Math.max(
                CAMERA_CONFIG.THIRD_PERSON.MIN_VERTICAL_ANGLE,
                Math.min(CAMERA_CONFIG.THIRD_PERSON.MAX_VERTICAL_ANGLE, state.verticalAngle)
            );
        } else {
            // Auto-follow player rotation when not using mouse control
            state.horizontalAngle = playerRotation;
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

        // Apply to camera
        camera.position.copy(state.currentPosition);
        camera.lookAt(state.currentLookAt);

        // Reset mouse deltas (they should be reset each frame)
        if (mouseInput) {
            mouseInput.deltaX = 0;
            mouseInput.deltaY = 0;
        }
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
