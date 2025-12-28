/**
 * Screen Shake System
 * Adds violent camera movement on impacts for visceral feedback
 */

import * as THREE from 'three';

export class ScreenShakeManager {
    constructor(camera) {
        this.camera = camera;
        this.originalPosition = new THREE.Vector3();
        this.intensity = 0;
        this.duration = 0;
        this.elapsed = 0;
        this.isActive = false;
        this.shakeType = 'default'; // 'default', 'explosion', 'impact'
    }

    /**
     * Trigger screen shake
     * @param {number} intensity - Shake amplitude (typically 0.05-0.3)
     * @param {number} durationFrames - Duration in frames (typically 3-10)
     * @param {string} type - Type of shake pattern
     */
    trigger(intensity, durationFrames, type = 'default') {
        // Store current camera position if not already active
        if (!this.isActive) {
            this.originalPosition.copy(this.camera.position);
        }

        this.intensity = Math.max(0, intensity);
        this.duration = Math.max(1, durationFrames);
        this.elapsed = 0;
        this.shakeType = type;
        this.isActive = true;
    }

    /**
     * Update screen shake (call once per frame)
     * @returns {boolean} - true if shake is active
     */
    update() {
        if (!this.isActive) {
            return false;
        }

        this.elapsed++;

        if (this.elapsed >= this.duration) {
            // Restore original position
            this.camera.position.copy(this.originalPosition);
            this.isActive = false;
            this.elapsed = 0;
            return false;
        }

        // Calculate shake offset based on shake type
        let offset;

        switch (this.shakeType) {
            case 'explosion':
                offset = this.getExplosionShake();
                break;
            case 'impact':
                offset = this.getImpactShake();
                break;
            default:
                offset = this.getDefaultShake();
        }

        // Apply offset to camera
        this.camera.position.copy(this.originalPosition).add(offset);

        return true;
    }

    /**
     * Default random shake
     */
    getDefaultShake() {
        return new THREE.Vector3(
            (Math.random() - 0.5) * this.intensity,
            (Math.random() - 0.5) * this.intensity,
            (Math.random() - 0.5) * this.intensity
        );
    }

    /**
     * Impact shake (sharp, directional)
     */
    getImpactShake() {
        const progress = this.elapsed / this.duration;
        const decay = 1 - Math.pow(progress, 2); // Quadratic decay

        return new THREE.Vector3(
            (Math.random() - 0.5) * this.intensity * decay,
            (Math.random() - 0.5) * this.intensity * decay * 0.5,
            (Math.random() - 0.5) * this.intensity * decay
        );
    }

    /**
     * Explosion shake (wide, rolling)
     */
    getExplosionShake() {
        const progress = this.elapsed / this.duration;
        const decay = 1 - progress; // Linear decay
        const time = Date.now() * 0.02;

        return new THREE.Vector3(
            Math.sin(time * 5) * this.intensity * decay,
            Math.cos(time * 7) * this.intensity * decay * 0.8,
            Math.sin(time * 3) * this.intensity * decay * 0.5
        );
    }

    /**
     * Check if shake is currently active
     */
    isShakeActive() {
        return this.isActive;
    }

    /**
     * Stop shake immediately and restore camera
     */
    stop() {
        if (this.isActive) {
            this.camera.position.copy(this.originalPosition);
        }
        this.isActive = false;
        this.elapsed = 0;
    }

    /**
     * Update stored original position (call when camera moves normally)
     */
    updateOriginalPosition() {
        if (!this.isActive) {
            this.originalPosition.copy(this.camera.position);
        }
    }

    /**
     * Reset system state
     */
    reset() {
        this.stop();
        this.intensity = 0;
        this.duration = 0;
    }
}

/**
 * Create and return a new screen shake manager
 */
export function createScreenShakeSystem(camera) {
    return new ScreenShakeManager(camera);
}
