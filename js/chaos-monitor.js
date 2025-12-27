/**
 * Chaos Monitor System
 * Detects epic moments and triggers cinematic camera angles
 */

import * as THREE from 'three';

export function createChaosMonitor() {
    const state = {
        ragdollCount: 0,
        epicThreshold: 5,
        isInCinematicMode: false,
        cinematicTimer: 0,
        cinematicDuration: 1.2,
        originalCamPosition: new THREE.Vector3(),
        originalCamTarget: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        originalFOV: 60,
    };
    
    function update(dt, npcSystem, playerCamera, player) {
        if (!npcSystem || !playerCamera) return;
        
        // Count ragdoll NPCs
        state.ragdollCount = 0;
        const activeNPCs = npcSystem.getAllActiveNPCs();
        
        for (let i = 0; i < activeNPCs.length; i++) {
            if (activeNPCs[i].state?.isRagdoll) {
                state.ragdollCount++;
            }
        }
        
        // Trigger cinematic mode if threshold reached
        if (state.ragdollCount >= state.epicThreshold && !state.isInCinematicMode) {
            enterCinematicMode(player, playerCamera);
        }
        
        // Update cinematic timer
        if (state.isInCinematicMode) {
            state.cinematicTimer -= dt;
            if (state.cinematicTimer <= 0) {
                exitCinematicMode(playerCamera);
            }
        }
    }
    
    function enterCinematicMode(player, playerCamera) {
        state.isInCinematicMode = true;
        state.cinematicTimer = state.cinematicDuration;
        
        console.log(`🎬 CINEMATIC MODE ACTIVATED! ${state.ragdollCount} NPCs in the air!`);
        
        // Store original camera state
        state.originalCamPosition.copy(playerCamera.camera.position);
        state.originalCamTarget.copy(playerCamera.target || player.getPosition());
        state.originalFOV = playerCamera.camera.fov;
        
        // Calculate offset position (lateral or top-down angle)
        const playerPos = player.getPosition();
        const offsetDistance = 15;
        
        // Randomly choose lateral or top-down
        const isSideAngle = Math.random() > 0.5;
        
        if (isSideAngle) {
            // Lateral angle
            state.targetPos = new THREE.Vector3(
                playerPos.x - offsetDistance,
                playerPos.y + 5,
                playerPos.z
            );
        } else {
            // Top-down angle
            state.targetPos = new THREE.Vector3(
                playerPos.x,
                playerPos.y + 20,
                playerPos.z + 10
            );
        }
        
        // Increase FOV for dramatic effect
        playerCamera.camera.fov = 35;  // More zoom for drama
        playerCamera.camera.updateProjectionMatrix();
    }
    
    function exitCinematicMode(playerCamera) {
        state.isInCinematicMode = false;
        
        console.log(`🎬 CINEMATIC MODE END. Back to normal.`);
        
        // Restore camera
        playerCamera.camera.fov = state.originalFOV;
        playerCamera.camera.updateProjectionMatrix();
    }
    
    function getState() {
        return {
            isInCinematicMode: state.isInCinematicMode,
            ragdollCount: state.ragdollCount,
            targetPos: state.targetPos,
        };
    }
    
    return {
        update,
        getState,
    };
}