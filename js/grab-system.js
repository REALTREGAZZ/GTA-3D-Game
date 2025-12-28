/**
 * Grab & Launch Entropy System
 * Transform the player into a "God of Chaos" with absolute freedom
 */

import * as THREE from 'three';
import { GRAB_SYSTEM_CONFIG } from './config.js';
import { audioEngine } from './audio-engine.js';

export function createGrabSystem(player, camera, scene, gameState, options = {}) {
    const { npcSystem = null, chargeParticles = null, impactParticles = null, postProcessing = null } = options;
    
    const config = GRAB_SYSTEM_CONFIG;
    
    const grabState = {
        isGrabbing: false,
        grabObject: null,
        grabObjectType: null, // 'NPC', 'VEHICLE', 'BUILDING'
        chargeLevel: 0,
        maxCharge: config.MAX_CHARGE,
        handPosition: new THREE.Vector3(),
        springVelocity: new THREE.Vector3(),
    };
    
    // Charge audio oscillator
    let chargeOscillator = null;
    let chargeGain = null;
    
    // Glitch effect state
    let glitchFrames = 0;
    
    /**
     * Raycast to find nearest grabbable object
     * @returns {Object|null} - { object, type, mesh }
     */
    function findGrabbableObject() {
        const playerPos = player.getPosition();
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        
        const raycaster = new THREE.Raycaster(playerPos, cameraDir, 0, config.GRAB_RANGE);
        
        // Check NPCs
        if (npcSystem) {
            const npcs = npcSystem.getAllActiveNPCs ? npcSystem.getAllActiveNPCs() : 
                        (npcSystem.state?.active || []);
            
            for (const npc of npcs) {
                if (!npc.state?.active || npc.state?.state === 'DEAD') continue;
                
                const dist = npc.mesh.position.distanceTo(playerPos);
                if (dist <= config.GRAB_RANGE) {
                    // Check if in front of player
                    const toNPC = npc.mesh.position.clone().sub(playerPos).normalize();
                    const dot = toNPC.dot(cameraDir);
                    if (dot > 0.7) { // ~45 degree cone
                        return { object: npc, type: 'NPC', mesh: npc.mesh };
                    }
                }
            }
        }
        
        // TODO: Check for vehicles/props in the future
        // For now, we focus on NPCs as the primary grabbable objects
        
        return null;
    }
    
    /**
     * Start grabbing an object
     */
    function startGrab() {
        if (grabState.isGrabbing) return;
        
        const target = findGrabbableObject();
        if (!target) {
            console.log('[GrabSystem] No grabbable object found in range');
            return;
        }
        
        grabState.isGrabbing = true;
        grabState.grabObject = target.object;
        grabState.grabObjectType = target.type;
        grabState.chargeLevel = 0;
        grabState.springVelocity.set(0, 0, 0);
        
        console.log(`[GrabSystem] Grabbed ${target.type}`);

        // Start charging audio
        startChargeAudio();

        // Put NPC in ragdoll and set panic emotion
        if (target.type === 'NPC') {
            if (target.object.enterRagdoll) {
                target.object.enterRagdoll(999); // Long duration while grabbed
            }
            // Set panic emotion when grabbed
            if (target.object.setEmotion) {
                target.object.setEmotion('panic', 99999); // Infinite panic while grabbed
            }
        }
    }
    
    /**
     * Update grab mechanics (spring physics + charging)
     * @param {number} deltaTime
     */
    function updateGrab(deltaTime) {
        if (!grabState.isGrabbing || !grabState.grabObject) return;
        
        // Increment charge level
        grabState.chargeLevel = Math.min(
            grabState.maxCharge, 
            grabState.chargeLevel + config.CHARGE_RATE
        );
        
        // Update hand position (in front of camera)
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const playerPos = player.getPosition();
        
        grabState.handPosition.copy(playerPos);
        grabState.handPosition.add(cameraDir.multiplyScalar(3)); // 3 units in front
        grabState.handPosition.y += 1.5; // Raise to hand height
        
        // Spring physics to hand position
        const objectPos = grabState.grabObject.mesh.position;
        const displacement = grabState.handPosition.clone().sub(objectPos);
        
        // Spring force: F = -k * x - c * v
        const springForce = displacement.multiplyScalar(config.SPRING_CONSTANT);
        const dampingForce = grabState.springVelocity.clone().multiplyScalar(-config.SPRING_DAMPING);
        const totalForce = springForce.add(dampingForce);
        
        // Update velocity and position (simple integration)
        grabState.springVelocity.add(totalForce.multiplyScalar(deltaTime));
        objectPos.add(grabState.springVelocity.clone().multiplyScalar(deltaTime));
        
        // Update charge audio pitch
        updateChargeAudio();
        
        // Spawn charge particles
        if (chargeParticles) {
            chargeParticles.spawnChargeParticles(objectPos, grabState.chargeLevel);
        }
        
        // Auto-launch at max charge
        if (grabState.chargeLevel >= grabState.maxCharge) {
            launch();
        }
    }
    
    /**
     * Launch the grabbed object
     */
    function launch() {
        if (!grabState.isGrabbing || !grabState.grabObject) return;
        
        const chargeRatio = grabState.chargeLevel / grabState.maxCharge;
        const objectType = grabState.grabObjectType;
        
        // Calculate launch velocity
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        
        let velocity = config.BASE_VELOCITY + chargeRatio * config.MAX_VELOCITY_BONUS;
        
        // Apply object type multiplier
        if (objectType === 'VEHICLE') {
            velocity *= config.VEHICLE_MULTIPLIER;
        } else if (objectType === 'NPC') {
            velocity *= config.NPC_MULTIPLIER;
        }
        
        const launchVelocity = cameraDir.multiplyScalar(velocity);
        
        console.log(`[GrabSystem] Launching ${objectType} at ${velocity.toFixed(1)} u/s (charge: ${grabState.chargeLevel}%)`);

        // Apply velocity to object
        if (grabState.grabObject.state) {
            grabState.grabObject.state.velocity = launchVelocity.clone();
            grabState.grabObject.state.isLaunched = true;
            grabState.grabObject.state.launchChargeLevel = grabState.chargeLevel;
        }

        // Set panic emotion for launched NPC (will auto-recover when they land)
        if (objectType === 'NPC' && grabState.grabObject.setEmotion) {
            grabState.grabObject.setEmotion('panic', 3000); // 3 seconds of panic after launch
        }
        
        // Store launch data for impact handling
        grabState.grabObject.userData = grabState.grabObject.userData || {};
        grabState.grabObject.userData.launchVelocity = launchVelocity.clone();
        grabState.grabObject.userData.launchChargeLevel = grabState.chargeLevel;
        grabState.grabObject.userData.launchObjectType = objectType;
        
        // Play launch audio
        playLaunchAudio(chargeRatio);
        
        // Stop charging audio
        stopChargeAudio();
        
        // Clear charge particles
        if (chargeParticles) {
            chargeParticles.clear();
        }
        
        // Reset grab state
        grabState.isGrabbing = false;
        grabState.grabObject = null;
        grabState.grabObjectType = null;
        grabState.chargeLevel = 0;
    }
    
    /**
     * Handle impact when launched object hits something
     * @param {Object} npc - The launched NPC
     * @param {THREE.Vector3} impactPosition - Impact position
     * @param {Object} hitTarget - What was hit (NPC, building, etc.)
     */
    function handleImpact(npc, impactPosition, hitTarget = null) {
        const chargeLevel = npc.state?.launchChargeLevel || 100;
        const objectType = npc.userData?.launchObjectType || 'NPC';
        const chargeRatio = chargeLevel / 100;
        
        console.log(`[GrabSystem] Impact! ${objectType} at charge ${chargeLevel}%`);
        
        // Determine impact multipliers
        let screenShakeMult = config.SCREEN_SHAKE_NPC;
        let impactFrames = config.IMPACT_FRAMES_NPC;
        let explosionRadius = config.EXPLOSION_RADIUS_BASE;
        let explosionForce = config.EXPLOSION_FORCE_BASE * chargeRatio;
        let particleCount = Math.floor(
            config.IMPACT_PARTICLE_COUNT_MIN + 
            (config.IMPACT_PARTICLE_COUNT_MAX - config.IMPACT_PARTICLE_COUNT_MIN) * chargeRatio
        );
        
        if (objectType === 'VEHICLE') {
            screenShakeMult = config.SCREEN_SHAKE_VEHICLE;
            impactFrames = config.IMPACT_FRAMES_VEHICLE;
            explosionRadius = config.EXPLOSION_RADIUS_VEHICLE;
            explosionForce = config.EXPLOSION_FORCE_VEHICLE * chargeRatio;
            particleCount = config.IMPACT_PARTICLE_COUNT_VEHICLE;
        } else if (hitTarget?.type === 'BUILDING') {
            screenShakeMult = config.SCREEN_SHAKE_BUILDING;
            impactFrames = config.IMPACT_FRAMES_BUILDING;
        }
        
        // Apply screen shake
        if (gameState.applyScreenShake) {
            gameState.applyScreenShake(screenShakeMult * chargeRatio, 0.3);
        }
        
        // Apply impact frames
        triggerImpactFrames(impactFrames);
        
        // Audio ducking for vehicles
        if (objectType === 'VEHICLE' && audioEngine) {
            audioEngine.triggerDucking(config.AUDIO_DUCKING_DURATION);
        }
        
        // Apply explosion force to nearby NPCs
        applyExplosionForce(impactPosition, explosionRadius, explosionForce);
        
        // Spawn gore-neon particles
        if (impactParticles) {
            impactParticles.spawnImpactParticles(impactPosition, particleCount, chargeLevel);
        }
        
        // Play impact audio
        playImpactAudio(chargeRatio);
        
        // Trigger glitch effect
        triggerGlitchEffect();
    }
    
    /**
     * Apply radial explosion force to nearby objects
     */
    function applyExplosionForce(position, radius, force) {
        if (!npcSystem) return;
        
        const npcs = npcSystem.getAllActiveNPCs ? npcSystem.getAllActiveNPCs() : 
                    (npcSystem.state?.active || []);
        
        for (const npc of npcs) {
            if (!npc.state?.active || npc.state?.state === 'DEAD') continue;
            
            const dist = npc.mesh.position.distanceTo(position);
            if (dist <= radius && dist > 0.1) {
                const direction = npc.mesh.position.clone().sub(position).normalize();
                const falloff = 1 - (dist / radius);
                const impulse = direction.multiplyScalar(force * falloff);

                // Apply impulse
                if (npc.state.velocity) {
                    npc.state.velocity.add(impulse.multiplyScalar(0.01)); // Scale for reasonable force
                }

                // Record impact for emotion system
                if (npc.recordImpact) {
                    npc.recordImpact(force * falloff);
                }

                // Put in ragdoll
                if (npc.enterRagdoll) {
                    npc.enterRagdoll(2.0);
                }

                console.log(`[GrabSystem] Applied explosion force to NPC at ${dist.toFixed(1)}m`);
            }
        }
    }
    
    /**
     * Trigger impact frame freeze
     */
    function triggerImpactFrames(frameCount) {
        // Use the global ImpactFrame system
        if (window.triggerImpactFrame) {
            // Trigger multiple times for longer freezes (e.g., 6 frames for vehicles)
            for (let i = 0; i < Math.ceil(frameCount / 3); i++) {
                setTimeout(() => {
                    window.triggerImpactFrame();
                }, i * 50); // Stagger slightly
            }
        }
    }
    
    /**
     * Trigger glitch visual effect
     */
    function triggerGlitchEffect() {
        glitchFrames = config.GLITCH_DURATION;
        
        // Apply chromatic aberration via post-processing if available
        if (postProcessing?.triggerChromaticAberration) {
            postProcessing.triggerChromaticAberration();
        }
    }
    
    /**
     * Update glitch effect
     */
    function updateGlitchEffect() {
        if (glitchFrames > 0) {
            glitchFrames--;
            
            // Apply screen distortion (could be enhanced with shader)
            // For now, we rely on post-processing chromatic aberration
        }
    }
    
    /**
     * Start charge audio tone
     */
    function startChargeAudio() {
        if (!audioEngine || !audioEngine.audioContext) return;
        
        try {
            const ctx = audioEngine.audioContext;
            
            chargeOscillator = ctx.createOscillator();
            chargeGain = ctx.createGain();
            
            chargeOscillator.type = 'sine';
            chargeOscillator.frequency.value = config.AUDIO_FREQ_START;
            chargeGain.gain.value = 0.15;
            
            chargeOscillator.connect(chargeGain);
            chargeGain.connect(audioEngine.masterGain || ctx.destination);
            
            chargeOscillator.start();
            
            console.log('[GrabSystem] Charge audio started');
        } catch (error) {
            console.error('[GrabSystem] Failed to start charge audio:', error);
        }
    }
    
    /**
     * Update charge audio pitch based on charge level
     */
    function updateChargeAudio() {
        if (!chargeOscillator || !audioEngine?.audioContext) return;
        
        const chargeRatio = grabState.chargeLevel / grabState.maxCharge;
        const frequency = config.AUDIO_FREQ_START + 
                         (config.AUDIO_FREQ_END - config.AUDIO_FREQ_START) * chargeRatio;
        
        chargeOscillator.frequency.setValueAtTime(
            frequency, 
            audioEngine.audioContext.currentTime
        );
    }
    
    /**
     * Stop charge audio
     */
    function stopChargeAudio() {
        if (!chargeOscillator) return;
        
        try {
            chargeOscillator.stop();
            chargeOscillator.disconnect();
            chargeGain.disconnect();
            chargeOscillator = null;
            chargeGain = null;
            
            console.log('[GrabSystem] Charge audio stopped');
        } catch (error) {
            console.error('[GrabSystem] Failed to stop charge audio:', error);
        }
    }
    
    /**
     * Play launch audio
     */
    function playLaunchAudio(chargeRatio) {
        if (!audioEngine) return;
        
        const pitch = 1.0 + chargeRatio * 0.3;
        audioEngine.playSFX('launch', null, { pitch, volume: 0.4 });
    }
    
    /**
     * Play impact audio
     */
    function playImpactAudio(chargeRatio) {
        if (!audioEngine) return;
        
        const pitch = config.IMPACT_AUDIO_PITCH_MIN + 
                     (config.IMPACT_AUDIO_PITCH_MAX - config.IMPACT_AUDIO_PITCH_MIN) * chargeRatio;
        
        // Aggressive synth "boing"
        audioEngine.playLowBass(pitch);
    }
    
    /**
     * Check for impacts on launched NPCs
     */
    function checkLaunchedImpacts() {
        if (!npcSystem) return;
        
        const npcs = npcSystem.getAllActiveNPCs ? npcSystem.getAllActiveNPCs() : 
                    (npcSystem.state?.active || []);
        
        for (const npc of npcs) {
            if (!npc.state?.isLaunched) continue;
            
            const velocity = npc.state.velocity;
            if (!velocity) continue;
            
            const speed = velocity.length();
            
            // Check for high-speed collisions
            if (speed > 50 && npc.state.wasOnGround !== npc.state.onGround && npc.state.onGround) {
                // Hit ground
                handleImpact(npc, npc.mesh.position.clone());
                npc.state.isLaunched = false;
            }
            
            // Check collision with other NPCs
            for (const otherNpc of npcs) {
                if (otherNpc === npc || !otherNpc.state?.active) continue;
                
                const dist = npc.mesh.position.distanceTo(otherNpc.mesh.position);
                if (dist < 1.5 && speed > 30) {
                    handleImpact(npc, npc.mesh.position.clone(), { type: 'NPC', object: otherNpc });
                    npc.state.isLaunched = false;
                    break;
                }
            }
            
            // Store previous ground state
            npc.state.wasOnGround = npc.state.onGround;
        }
    }
    
    /**
     * Main update function
     */
    function update(deltaTime) {
        if (grabState.isGrabbing) {
            updateGrab(deltaTime);
        }
        
        updateGlitchEffect();
        checkLaunchedImpacts();
    }
    
    /**
     * Cancel grab (if player releases early or dies)
     */
    function cancelGrab() {
        if (grabState.isGrabbing) {
            stopChargeAudio();
            
            if (chargeParticles) {
                chargeParticles.clear();
            }
            
            grabState.isGrabbing = false;
            grabState.grabObject = null;
            grabState.grabObjectType = null;
            grabState.chargeLevel = 0;
        }
    }
    
    return {
        startGrab,
        launch,
        cancelGrab,
        update,
        handleImpact,
        getState: () => grabState,
        isGrabbing: () => grabState.isGrabbing,
    };
}
