/**
 * Animation Controller Elite
 * Advanced animation blending with root motion support
 */

import * as THREE from 'three';

export class EliteAnimationController {
    constructor(mixer, skeleton, animationMap) {
        this.mixer = mixer;
        this.skeleton = skeleton;
        this.animationMap = animationMap;

        // Actions map
        this.actions = {};

        // Load all animations
        this.loadAnimations();

        // Current state
        this.currentAction = null;
        this.currentAnimationName = null;
        this.isTransitioning = false;
        this.transitionDuration = 0.3;

        // Root motion state
        this.rootMotionEnabled = false;
        this.lastRootPosition = new THREE.Vector3();
        this.rootMotionVelocity = new THREE.Vector3();

        // Movement state tracking
        this.movementState = 'idle';
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
    }

    /**
     * Load all animations from map
     */
    loadAnimations() {
        if (!this.animationMap) {
            console.warn('[EliteAnimationController] No animation map provided');
            return;
        }

        Object.entries(this.animationMap).forEach(([name, clip]) => {
            if (clip) {
                this.actions[name] = this.mixer.clipAction(clip);
            }
        });

        console.log(`[EliteAnimationController] Loaded ${Object.keys(this.actions).length} animations`);
    }

    /**
     * Check if animation exists
     */
    hasAnimation(name) {
        return this.actions[name] !== undefined;
    }

    /**
     * Play animation immediately (no fade)
     */
    play(name, reset = true) {
        if (!this.actions[name]) {
            console.warn(`[EliteAnimationController] Animation '${name}' not found`);
            return false;
        }

        // Stop all other actions
        Object.values(this.actions).forEach(action => {
            if (action !== this.actions[name]) {
                action.stop();
            }
        });

        const action = this.actions[name];

        if (reset) {
            action.reset();
        }

        action.play();
        this.currentAction = action;
        this.currentAnimationName = name;
        this.isTransitioning = false;

        return true;
    }

    /**
     * Transition to animation with fade
     */
    transitionTo(name, fadeDuration = null) {
        if (!this.actions[name]) {
            console.warn(`[EliteAnimationController] Animation '${name}' not found`);
            return false;
        }

        // If already playing this animation, skip
        if (this.currentAnimationName === name && !this.isTransitioning) {
            return true;
        }

        const duration = fadeDuration ?? this.transitionDuration;

        // Fade out current action
        if (this.currentAction) {
            this.currentAction.fadeOut(duration);
        }

        // Fade in new action
        const nextAction = this.actions[name];
        nextAction.reset();
        nextAction.fadeIn(duration);
        nextAction.play();

        this.currentAction = nextAction;
        this.currentAnimationName = name;
        this.isTransitioning = true;

        // Clear transition flag after duration
        setTimeout(() => {
            this.isTransitioning = false;
        }, duration * 1000);

        return true;
    }

    /**
     * Set movement state based on velocity
     */
    setMovementState(velocity, direction = null) {
        this.velocity.copy(velocity);

        if (direction) {
            this.direction.copy(direction);
        }

        const speed = velocity.length();
        let targetAnimation = 'idle';

        // Determine target animation based on speed
        if (speed < 0.1) {
            targetAnimation = 'idle';
        } else if (speed < 2.0) {
            targetAnimation = 'walk';
        } else if (speed < 5.0) {
            targetAnimation = 'run';
        } else {
            targetAnimation = 'run';
        }

        // Only transition if state changed
        if (targetAnimation !== this.movementState) {
            this.transitionTo(targetAnimation, 0.25);
            this.movementState = targetAnimation;
        }
    }

    /**
     * Enable or disable root motion
     */
    setRootMotionEnabled(enabled) {
        this.rootMotionEnabled = enabled;
        if (enabled) {
            this.lastRootPosition.copy(this.getRootBoneWorldPosition());
        }
    }

    /**
     * Get root bone world position
     */
    getRootBoneWorldPosition() {
        if (!this.skeleton || !this.skeleton.bones[0]) {
            return new THREE.Vector3();
        }

        const rootBone = this.skeleton.bones[0];
        const worldPos = new THREE.Vector3();
        rootBone.getWorldPosition(worldPos);

        return worldPos;
    }

    /**
     * Apply root motion (extract translation from root bone)
     */
    applyRootMotion(deltaTime) {
        if (!this.rootMotionEnabled) return new THREE.Vector3();

        const currentRootPos = this.getRootBoneWorldPosition();
        const delta = currentRootPos.clone().sub(this.lastRootPosition);

        // Remove Y component (gravity handles that)
        delta.y = 0;

        // Calculate velocity
        this.rootMotionVelocity.copy(delta).divideScalar(Math.max(deltaTime, 0.001));

        // Update last position
        this.lastRootPosition.copy(currentRootPos);

        return this.rootMotionVelocity;
    }

    /**
     * Get root motion velocity
     */
    getRootMotionVelocity() {
        return this.rootMotionVelocity;
    }

    /**
     * Update animation system
     */
    update(deltaTime) {
        // Update mixer
        this.mixer.update(deltaTime);

        // Apply root motion if enabled
        if (this.rootMotionEnabled) {
            this.applyRootMotion(deltaTime);
        }
    }

    /**
     * Stop all animations
     */
    stop() {
        Object.values(this.actions).forEach(action => action.stop());
        this.currentAction = null;
        this.currentAnimationName = null;
    }

    /**
     * Get current animation name
     */
    getCurrentAnimation() {
        return this.currentAnimationName;
    }

    /**
     * Check if currently transitioning
     */
    isTransitionActive() {
        return this.isTransitioning;
    }

    /**
     * Get animation speed scale
     */
    getSpeed() {
        return this.currentAction ? this.currentAction.getEffectiveTimeScale() : 0;
    }

    /**
     * Set animation speed scale
     */
    setSpeed(scale) {
        if (this.currentAction) {
            this.currentAction.setEffectiveTimeScale(scale);
        }
    }

    /**
     * Get all available animation names
     */
    getAvailableAnimations() {
        return Object.keys(this.actions);
    }
}

/**
 * Create elite animation controller
 */
export function createEliteAnimationController(mixer, skeleton, animationMap) {
    return new EliteAnimationController(mixer, skeleton, animationMap);
}

/**
 * Simple factory for player
 */
export async function createPlayerAnimationController(playerAvatar) {
    if (!playerAvatar || !playerAvatar.mixer) {
        console.error('[AnimationController] Invalid player avatar');
        return null;
    }

    return createEliteAnimationController(
        playerAvatar.mixer,
        playerAvatar.skeleton,
        playerAvatar.animationMap
    );
}

/**
 * Simple factory for NPC
 */
export async function createNPCAnimationController(npcAvatar) {
    if (!npcAvatar || !npcAvatar.mixer) {
        console.error('[AnimationController] Invalid NPC avatar');
        return null;
    }

    return createEliteAnimationController(
        npcAvatar.mixer,
        npcAvatar.skeleton,
        npcAvatar.animationMap
    );
}
