/**
 * Time Freeze System - Impact Pause
 * Creates cinematic slow-motion effects for viral moments
 */

import * as THREE from 'three';

export const GlobalTimeFreeze = {
    isActive: false,
    duration: 0,
    durationRemaining: 0,
    factor: 1.0,  // 1.0 = normal, 0.1 = 90% ralentizado
    targetFactor: 1.0,
    
    slowMotion(factor = 0.1, duration = 0.15) {
        if (this.isActive) return;  // No stack freezes
        
        this.isActive = true;
        this.factor = factor;
        this.targetFactor = factor;
        this.duration = duration;
        this.durationRemaining = duration;
        
        console.log(`⏱️ TIME FREEZE: ${(factor * 100).toFixed(0)}% speed for ${(duration * 1000).toFixed(0)}ms`);
    },
    
    update(dt) {
        if (!this.isActive) return;
        
        this.durationRemaining -= dt;
        
        if (this.durationRemaining <= 0) {
            this.isActive = false;
            this.factor = 1.0;
            this.targetFactor = 1.0;
            this.durationRemaining = 0;
        }
        
        // Smooth lerp back to normal speed
        const recoverSpeed = 0.1;  // How fast we return to 1.0
        this.factor = THREE.MathUtils.lerp(this.factor, this.targetFactor, recoverSpeed);
    },
};

// Export globally for easy access
window.GlobalTimeFreeze = GlobalTimeFreeze;