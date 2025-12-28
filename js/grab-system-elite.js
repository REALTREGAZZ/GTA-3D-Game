/**
 * Grab System Elite
 * Enhanced grab & launch with physics springs, hitstop, and screen shake integration
 */

import * as THREE from 'three';
import { GRAB_SYSTEM_CONFIG } from './config.js';
import { audioEngine } from './audio-engine.js';

export class GrabSystemElite {
    constructor(player, camera, scene, gameState, options = {}) {
        this.player = player;
        this.camera = camera;
        this.scene = scene;
        this.gameState = gameState;

        const {
            npcSystem = null,
            hitstopManager = null,
            screenShakeManager = null,
            postProcessing = null,
        } = options;

        this.npcSystem = npcSystem;
        this.hitstopManager = hitstopManager;
        this.screenShakeManager = screenShakeManager;
        this.postProcessing = postProcessing;

        const config = GRAB_SYSTEM_CONFIG;

        // Grab state
        this.isGrabbing = false;
        this.grabbedObject = null;
        this.grabbedObjectType = null;
        this.chargeLevel = 0;
        this.maxCharge = config.MAX_CHARGE;
        this.holdPosition = new THREE.Vector3();

        // Physics spring (for vibration effect)
        this.springVelocity = new THREE.Vector3();
        this.springForce = 5.0;
        this.springDamping = 0.8;

        // Charge audio
        this.chargeOscillator = null;
        this.chargeGain = null;

        // Glitch effect
        this.glitchFrames = 0;

        console.log('[GrabSystemElite] Initialized');
    }

    /**
     * Find nearest grabbable object
     */
    findGrabbableObject() {
        const playerPos = this.player.getPosition ? this.player.getPosition() : this.player.position;
        const cameraDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDir);

        const raycaster = new THREE.Raycaster(playerPos, cameraDir, 0, config.GRAB_RANGE);

        // Check NPCs
        if (this.npcSystem) {
            const npcs = this.npcSystem.getAllActiveNPCs ? this.npcSystem.getAllActiveNPCs() :
                        (this.npcSystem.state?.active || []);

            for (const npc of npcs) {
                if (!npc.state?.active || npc.state?.state === 'DEAD') continue;

                const npcMesh = npc.mesh || npc.group;
                const dist = npcMesh.position.distanceTo(playerPos);

                if (dist <= config.GRAB_RANGE) {
                    // Check if in front of player
                    const toNPC = npcMesh.position.clone().sub(playerPos).normalize();
                    const dot = toNPC.dot(cameraDir);

                    if (dot > 0.7) {
                        return { object: npc, type: 'NPC', mesh: npcMesh };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Start grabbing an object
     */
    startGrab() {
        if (this.isGrabbing) return;

        const target = this.findGrabbableObject();

        if (!target) {
            console.log('[GrabSystemElite] No grabbable object found');
            return false;
        }

        this.isGrabbing = true;
        this.grabbedObject = target.object;
        this.grabbedObjectType = target.type;
        this.chargeLevel = 0;
        this.springVelocity.set(0, 0, 0);

        console.log(`[GrabSystemElite] Grabbed ${target.type}`);

        // Start charging audio
        this.startChargeAudio();

        // Put NPC in ragdoll and set panic
        if (target.type === 'NPC') {
            if (target.object.enterRagdoll) {
                target.object.enterRagdoll(999);
            }
            if (target.object.setEmotion) {
                target.object.setEmotion('panic', 99999);
            }
            if (target.object.state) {
                target.object.state.isRagdoll = true;
            }
        }

        // Play SFX
        audioEngine.playSFX('grab_start', 0.5);

        return true;
    }

    /**
     * Update grab system (call each frame)
     */
    update(deltaTime) {
        if (!this.isGrabbing || !this.grabbedObject) return;

        const playerPos = this.player.getPosition ? this.player.getPosition() : this.player.position;

        // Calculate hold position (in front of player)
        const holdOffset = new THREE.Vector3(0, 1, 1.5);
        holdOffset.applyQuaternion(this.camera.quaternion);

        const targetPos = playerPos.clone().add(holdOffset);

        // Physics spring vibration
        const objectMesh = this.grabbedObject.mesh || this.grabbedObject.group;
        const diff = targetPos.clone().sub(objectMesh.position);

        const spring = diff.multiplyScalar(this.springForce);
        const damping = this.springVelocity.clone().multiplyScalar(-this.springDamping);

        const totalForce = spring.add(damping);
        this.springVelocity.add(totalForce.multiplyScalar(deltaTime));

        // Apply velocity
        objectMesh.position.add(this.springVelocity.clone().multiplyScalar(deltaTime));

        // Update charge level
        if (this.chargeLevel < this.maxCharge) {
            this.chargeLevel += deltaTime * config.CHARGE_RATE;
            this.chargeLevel = Math.min(this.chargeLevel, this.maxCharge);
        }

        // Update charge audio
        this.updateChargeAudio();
    }

    /**
     * Charge up the grab (hold G key)
     */
    charge(deltaTime) {
        if (!this.isGrabbing || !this.grabbedObject) return;

        if (this.chargeLevel < this.maxCharge) {
            this.chargeLevel += deltaTime * config.CHARGE_RATE;
            this.chargeLevel = Math.min(this.chargeLevel, this.maxCharge);
        }
    }

    /**
     * Launch the grabbed object
     */
    launch() {
        if (!this.isGrabbing || !this.grabbedObject) return;

        console.log(`[GrabSystemElite] Launched with charge: ${this.chargeLevel.toFixed(2)}`);

        // Calculate launch direction and force
        const cameraDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDir);

        const baseForce = config.LAUNCH_FORCE_BASE;
        const chargeMultiplier = config.LAUNCH_FORCE_MULTIPLIER || 1.0;
        const totalForce = baseForce + (this.chargeLevel * chargeMultiplier);

        const launchVelocity = cameraDir.multiplyScalar(totalForce);

        // Apply velocity to object
        const objectMesh = this.grabbedObject.mesh || this.grabbedObject.group;

        if (this.grabbedObject.velocity) {
            this.grabbedObject.velocity.copy(launchVelocity);
        } else {
            this.grabbedObject.velocity = launchVelocity.clone();
        }

        // Set ragdoll
        if (this.grabbedObject.setRagdoll) {
            this.grabbedObject.setRagdoll(true);
        }
        if (this.grabbedObject.state) {
            this.grabbedObject.state.isRagdoll = true;
        }

        // Apply impulse physics
        this.grabbedObject.launchVelocity = launchVelocity;

        // Trigger hitstop
        if (this.hitstopManager) {
            this.hitstopManager.trigger(5);
        }

        // Trigger screen shake
        if (this.screenShakeManager) {
            this.screenShakeManager.trigger(0.2, 3, 'explosion');
        }

        // Trigger chromatic aberration
        if (this.postProcessing && this.postProcessing.triggerChromaticAberration) {
            this.postProcessing.triggerChromaticAberration();
        }

        // Play SFX
        audioEngine.playSFX('grab_launch', 0.8);

        // Reset grab state
        this.stopChargeAudio();
        this.grabbedObject = null;
        this.grabbedObjectType = null;
        this.isGrabbing = false;
        this.chargeLevel = 0;
        this.springVelocity.set(0, 0, 0);
    }

    /**
     * Release the grabbed object without launching
     */
    release() {
        if (!this.isGrabbing) return;

        this.stopChargeAudio();

        // Reset NPC ragdoll
        if (this.grabbedObject?.exitRagdoll) {
            this.grabbedObject.exitRagdoll();
        }
        if (this.grabbedObject?.state) {
            this.grabbedObject.state.isRagdoll = false;
        }

        this.grabbedObject = null;
        this.grabbedObjectType = null;
        this.isGrabbing = false;
        this.chargeLevel = 0;
        this.springVelocity.set(0, 0, 0);

        audioEngine.playSFX('grab_release', 0.3);
    }

    /**
     * Start charge audio
     */
    startChargeAudio() {
        if (this.chargeOscillator) return;

        try {
            const audioCtx = audioEngine.getContext?.();
            if (!audioCtx) return;

            this.chargeOscillator = audioCtx.createOscillator();
            this.chargeGain = audioCtx.createGain();

            this.chargeOscillator.type = 'sawtooth';
            this.chargeOscillator.frequency.setValueAtTime(100, audioCtx.currentTime);

            this.chargeGain.gain.setValueAtTime(0.1, audioCtx.currentTime);

            this.chargeOscillator.connect(this.chargeGain);
            this.chargeGain.connect(audioCtx.destination);

            this.chargeOscillator.start();
        } catch (err) {
            console.warn('[GrabSystemElite] Failed to start charge audio:', err);
        }
    }

    /**
     * Update charge audio (pitch increases with charge)
     */
    updateChargeAudio() {
        if (!this.chargeOscillator || !this.chargeGain) return;

        try {
            const audioCtx = audioEngine.getContext?.();
            if (!audioCtx) return;

            const chargeRatio = this.chargeLevel / this.maxCharge;
            const targetFreq = 100 + (chargeRatio * 200);
            const targetGain = 0.1 + (chargeRatio * 0.2);

            this.chargeOscillator.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
            this.chargeGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
        } catch (err) {
            // Ignore audio errors
        }
    }

    /**
     * Stop charge audio
     */
    stopChargeAudio() {
        if (!this.chargeOscillator) return;

        try {
            const audioCtx = audioEngine.getContext?.();
            if (!audioCtx) return;

            this.chargeOscillator.stop();
            this.chargeOscillator.disconnect();
            this.chargeGain.disconnect();

            this.chargeOscillator = null;
            this.chargeGain = null;
        } catch (err) {
            // Ignore audio errors
        }
    }

    /**
     * Check if currently grabbing
     */
    isCurrentlyGrabbing() {
        return this.isGrabbing;
    }

    /**
     * Get grabbed object
     */
    getGrabbedObject() {
        return this.grabbedObject;
    }

    /**
     * Get current charge level (0-1)
     */
    getChargeLevel() {
        return this.chargeLevel / this.maxCharge;
    }

    /**
     * Reset system state
     */
    reset() {
        this.release();
    }
}

/**
 * Factory function to create elite grab system
 */
export function createGrabSystemElite(player, camera, scene, gameState, options = {}) {
    return new GrabSystemElite(player, camera, scene, gameState, options);
}
