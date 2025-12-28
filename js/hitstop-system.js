/**
 * Hitstop System - Impact Frame Freeze
 * Creates that satisfying "brutal" pause on impacts
 */

export class HitstopManager {
    constructor() {
        this.isActive = false;
        this.frameCount = 0;
        this.totalFrames = 0;
    }

    /**
     * Trigger hitstop for specified number of frames
     * @param {number} frames - Number of frames to pause (typically 3-8)
     */
    trigger(frames) {
        this.isActive = true;
        this.frameCount = 0;
        this.totalFrames = Math.max(1, frames);
    }

    /**
     * Update hitstop state (call once per frame)
     * @returns {boolean} - true if hitstop is active (should pause updates)
     */
    update() {
        if (!this.isActive) return false;

        this.frameCount++;

        if (this.frameCount >= this.totalFrames) {
            this.isActive = false;
            this.frameCount = 0;
            return false;
        }

        return true;
    }

    /**
     * Check if hitstop is currently active
     */
    isHitstopActive() {
        return this.isActive;
    }

    /**
     * Get remaining hitstop frames
     */
    getRemainingFrames() {
        if (!this.isActive) return 0;
        return this.totalFrames - this.frameCount;
    }

    /**
     * Force stop hitstop immediately
     */
    stop() {
        this.isActive = false;
        this.frameCount = 0;
    }

    /**
     * Reset system state
     */
    reset() {
        this.stop();
        this.totalFrames = 0;
    }
}

/**
 * Create and return a new hitstop manager
 */
export function createHitstopSystem() {
    return new HitstopManager();
}
