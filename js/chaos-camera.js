/**
 * Chaos Camera System
 * Cinematic camera direction: FOV kicks, NPC tracking, and kill-cam
 */

import * as THREE from 'three';
import { CAMERA_CONFIG, GAME_CONFIG } from './config.js';

export function createChaosCamera() {
    const state = {
        // FOV Kick state
        baseFieldOfView: CAMERA_CONFIG.CHAOS_CAMERA.FOV_NORMAL,
        currentFieldOfView: CAMERA_CONFIG.CHAOS_CAMERA.FOV_NORMAL,
        targetFieldOfView: CAMERA_CONFIG.CHAOS_CAMERA.FOV_NORMAL,
        fovKickTimer: 0,
        fovKickDuration: CAMERA_CONFIG.CHAOS_CAMERA.FOV_KICK_DURATION,
        originalFovDuration: 0,

        // NPC Tracking state
        trackedNPC: null,
        trackingDuration: 0,
        trackingActive: false,

        // Kill Cam state
        isInKillCam: false,
        killCamTarget: null,
        killCamTimer: 0,
        killCamDuration: CAMERA_CONFIG.CHAOS_CAMERA.KILLCAM_DURATION,
        killCamRotation: 0,
        previousTimeScale: 1.0,
    };

    // Initialize player lastAttacker in GameState if it doesn't exist
    if (!GAME_CONFIG.player) {
        GAME_CONFIG.player = {};
    }
    if (typeof window.GameState !== 'undefined' && !window.GameState.player.lastAttacker) {
        window.GameState.player.lastAttacker = null;
    }

    function applyFOVKick(newFOV = CAMERA_CONFIG.CHAOS_CAMERA.FOV_KICK_SINGLE, duration = CAMERA_CONFIG.CHAOS_CAMERA.FOV_KICK_DURATION) {
        state.targetFieldOfView = newFOV;
        state.fovKickTimer = duration;
        state.fovKickDuration = duration;
        state.originalFovDuration = duration;
    }

    function startTracking(npc, duration = 2.0) {
        state.trackedNPC = npc;
        state.trackingDuration = duration;
        state.trackingActive = true;
    }

    function stopTracking() {
        state.trackedNPC = null;
        state.trackingDuration = 0;
        state.trackingActive = false;
    }

    function startKillCam(culprit) {
        if (state.isInKillCam) return;

        state.isInKillCam = true;
        state.killCamTarget = culprit || null;
        state.killCamTimer = state.killCamDuration;
        state.killCamRotation = 0;

        // Save previous timeScale and set slow motion
        if (typeof window.GameState !== 'undefined') {
            state.previousTimeScale = window.GameState.timeScale;
            window.GameState.timeScale = CAMERA_CONFIG.CHAOS_CAMERA.KILLCAM_SLOW_MOTION;
        }

        // Show overlay
        if (typeof window.OverlaySystem !== 'undefined') {
            window.OverlaySystem.show('SKILL ISSUE', state.killCamDuration, true);
        }

        // Disable player controls
        if (typeof window.GameState !== 'undefined') {
            window.GameState.playerControlsDisabled = true;
        }
    }

    function stopKillCam() {
        if (!state.isInKillCam) return;

        state.isInKillCam = false;
        state.killCamTarget = null;
        state.killCamTimer = 0;

        // Restore timeScale
        if (typeof window.GameState !== 'undefined') {
            window.GameState.timeScale = state.previousTimeScale;
            window.GameState.playerControlsDisabled = false;
        }
    }

    function updateFOV(deltaTime, camera) {
        if (state.fovKickTimer > 0) {
            state.fovKickTimer -= deltaTime;

            // Interpolate from current to target during kick
            const progress = 1 - (state.fovKickTimer / state.originalFovDuration);
            state.currentFieldOfView = THREE.MathUtils.lerp(
                state.currentFieldOfView,
                state.targetFieldOfView,
                progress
            );
        } else {
            // Smoothly recover to base FOV
            state.currentFieldOfView = THREE.MathUtils.lerp(
                state.currentFieldOfView,
                state.baseFieldOfView,
                CAMERA_CONFIG.CHAOS_CAMERA.FOV_RECOVERY_SPEED
            );
        }

        // Apply to camera
        camera.fov = state.currentFieldOfView;
        camera.updateProjectionMatrix();
    }

    function updateTracking(deltaTime, playerCamera) {
        if (!state.trackingActive || !state.trackedNPC || state.trackingDuration <= 0) {
            stopTracking();
            return;
        }

        state.trackingDuration -= deltaTime;

        const npcPosition = state.trackedNPC.position || state.trackedNPC.mesh?.position;
        if (!npcPosition) {
            stopTracking();
            return;
        }

        // Get NPC velocity to check if they're still flying
        const npcState = state.trackedNPC.getState ? state.trackedNPC.getState() : null;
        const velocity = npcState?.velocity?.length() || 0;

        // End tracking if NPC is on the ground (low velocity) or duration ended
        if (velocity < 3 || state.trackedNPC.getState && npcState?.isRagdoll === false) {
            stopTracking();
            return;
        }

        // Calculate epic camera angle offset
        const targetPos = npcPosition.clone();
        const trackingOffset = new THREE.Vector3(
            CAMERA_CONFIG.CHAOS_CAMERA.TRACKING_DISTANCE,
            CAMERA_CONFIG.CHAOS_CAMERA.TRACKING_HEIGHT,
            CAMERA_CONFIG.CHAOS_CAMERA.TRACKING_DISTANCE
        );

        // Smoothly move camera target to follow NPC
        const camState = playerCamera.state || playerCamera;
        if (camState.targetPosition) {
            camState.targetPosition.lerp(
                targetPos.clone().add(trackingOffset),
                CAMERA_CONFIG.CHAOS_CAMERA.TRACKING_SMOOTHING
            );
        }
    }

    function updateKillCam(deltaTime, playerCamera, camera) {
        if (!state.isInKillCam) return;

        state.killCamTimer -= deltaTime;

        if (state.killCamTimer <= 0) {
            stopKillCam();
            // Trigger restart after kill cam finishes
            if (typeof window.GameState !== 'undefined' && typeof window.Player !== 'undefined') {
                setTimeout(() => {
                    restartGame();
                }, 500);
            }
            return;
        }

        // Rotate camera around the target
        state.killCamRotation += deltaTime * CAMERA_CONFIG.CHAOS_CAMERA.KILLCAM_ROTATION_SPEED;

        let targetPos;

        // If we have a culprit (the enemy who killed the player), orbit around them
        if (state.killCamTarget) {
            targetPos = state.killCamTarget.position || state.killCamTarget.mesh?.position;
        } else {
            // Otherwise, orbit around the player's body
            if (typeof window.Player !== 'undefined') {
                targetPos = window.Player.getPosition();
            }
        }

        if (!targetPos) return;

        const angle = state.killCamRotation * (Math.PI / 180);
        const distance = CAMERA_CONFIG.CHAOS_CAMERA.KILLCAM_DISTANCE;
        const height = CAMERA_CONFIG.CHAOS_CAMERA.KILLCAM_HEIGHT;

        // Calculate orbiting camera position
        const cameraPos = new THREE.Vector3(
            targetPos.x + Math.cos(angle) * distance,
            targetPos.y + height,
            targetPos.z + Math.sin(angle) * distance
        );

        // Directly update camera position (bypass normal camera update)
        camera.position.lerp(cameraPos, 0.1);
        camera.lookAt(targetPos);
    }

    function detectChaosTriggers(npcSystem) {
        if (!npcSystem || !npcSystem.state) return;

        const activeNpcs = npcSystem.state.active || [];
        if (activeNpcs.length === 0) return;

        let maxVelocity = 0;
        let fastNpcCount = 0;
        let fastestNpc = null;

        for (const npc of activeNpcs) {
            const npcState = npc.getState ? npc.getState() : null;
            if (!npcState || !npcState.velocity) continue;

            const vel = npcState.velocity.length();

            if (vel > 20) {
                fastNpcCount++;
                if (vel > maxVelocity) {
                    maxVelocity = vel;
                    fastestNpc = npc;
                }
            }
        }

        // Apply FOV kick based on chaos level
        if (fastNpcCount === 1 && fastestNpc) {
            applyFOVKick(CAMERA_CONFIG.CHAOS_CAMERA.FOV_KICK_SINGLE, 0.5);
            if (state.trackingDuration <= 0) {
                startTracking(fastestNpc, 2.0);
            }
        } else if (fastNpcCount === 2) {
            applyFOVKick(CAMERA_CONFIG.CHAOS_CAMERA.FOV_KICK_DOUBLE, 0.5);
        } else if (fastNpcCount >= 3) {
            applyFOVKick(CAMERA_CONFIG.CHAOS_CAMERA.FOV_KICK_TRIPLE, 0.7);
        }
    }

    function checkPlayerDeath(gameState, camera, playerCamera) {
        if (!gameState || !gameState.player) return;

        if (gameState.player.health <= 0 && !state.isInKillCam) {
            const culprit = gameState.player.lastAttacker || null;
            startKillCam(culprit);
        }
    }

    function restartGame() {
        if (typeof window.Player !== 'undefined') {
            const spawnPos = new THREE.Vector3(0, 5, 0);
            window.Player.respawn(spawnPos);
        }

        if (typeof window.CombatSystem !== 'undefined') {
            window.CombatSystem.reset();
        }

        if (typeof window.GameState !== 'undefined') {
            window.GameState.player.health = GAME_CONFIG.PLAYER.MAX_HEALTH;
            window.GameState.player.armor = GAME_CONFIG.PLAYER.MAX_ARMOR;
            window.GameState.player.lastAttacker = null;
            window.GameState.playerControlsDisabled = false;
            window.GameState.timeScale = 1.0;
        }

        // Show restart overlay
        if (typeof window.OverlaySystem !== 'undefined') {
            window.OverlaySystem.show('REINICIANDO...', 1.5, false);
        }

        console.log('Game restarted');
    }

    function update(deltaTime, npcSystem, camera, playerCamera, gameState) {
        // Update FOV (always active)
        if (camera) {
            updateFOV(deltaTime, camera);
        }

        // Skip other updates if in kill cam
        if (state.isInKillCam) {
            updateKillCam(deltaTime, playerCamera, camera);
            return;
        }

        // Update NPC tracking
        if (playerCamera && !state.isInKillCam) {
            updateTracking(deltaTime, playerCamera);
        }

        // Detect chaos triggers for FOV kicks
        if (npcSystem && !state.isInKillCam) {
            detectChaosTriggers(npcSystem);
        }

        // Check for player death (kill cam trigger)
        if (gameState && !state.isInKillCam) {
            checkPlayerDeath(gameState, camera, playerCamera);
        }
    }

    function reset() {
        state.currentFieldOfView = state.baseFieldOfView;
        state.targetFieldOfView = state.baseFieldOfView;
        state.fovKickTimer = 0;
        stopTracking();
        stopKillCam();
    }

    function getState() {
        return { ...state };
    }

    return {
        state,
        update,
        applyFOVKick,
        startTracking,
        stopTracking,
        startKillCam,
        stopKillCam,
        restartGame,
        reset,
        getState,
    };
}
