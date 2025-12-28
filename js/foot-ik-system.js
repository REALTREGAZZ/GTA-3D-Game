/**
 * Foot IK System
 * Inverse kinematics for realistic foot placement on uneven terrain
 */

import * as THREE from 'three';

export class FootIKSystem {
    constructor(skeleton, scene, terrain = null) {
        this.skeleton = skeleton;
        this.scene = scene;
        this.terrain = terrain;

        // Bone references
        this.leftFootBone = null;
        this.rightFootBone = null;
        this.hipBone = null;

        // IK settings
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 1.5; // Max IK reach distance
        this.raycaster.near = 0.01;

        // IK state
        this.leftFootTarget = new THREE.Vector3();
        this.rightFootTarget = new THREE.Vector3();
        this.leftFootPlantHeight = 0;
        this.rightFootPlantHeight = 0;
        this.leftFootOffset = new THREE.Vector3();
        this.rightFootOffset = new THREE.Vector3();

        // Animation phase tracking
        this.phase = 0; // 0 = left planted, 1 = right planted

        // Enable/disable
        this.enabled = true;
        this.updateInterval = 2; // Update every N frames for performance
        this.frameCounter = 0;

        // Find bones
        this.findBones();
    }

    /**
     * Find foot and hip bones
     */
    findBones() {
        if (!this.skeleton) {
            console.warn('[FootIK] No skeleton provided');
            return;
        }

        // Try common bone name patterns
        const leftFootNames = ['LeftFoot', 'lFoot', 'leftFoot', 'foot_l', 'LFoot'];
        const rightFootNames = ['RightFoot', 'rFoot', 'rightFoot', 'foot_r', 'RFoot'];
        const hipNames = ['Hips', 'hip', 'root', 'Root', 'mixamorigHips'];

        for (const name of leftFootNames) {
            this.leftFootBone = this.skeleton.getBoneByName(name);
            if (this.leftFootBone) break;
        }

        for (const name of rightFootNames) {
            this.rightFootBone = this.skeleton.getBoneByName(name);
            if (this.rightFootBone) break;
        }

        for (const name of hipNames) {
            this.hipBone = this.skeleton.getBoneByName(name);
            if (this.hipBone) break;
        }

        const found = [
            this.leftFootBone ? 'Left foot' : 'No left foot',
            this.rightFootBone ? 'Right foot' : 'No right foot',
            this.hipBone ? 'Hip' : 'No hip',
        ].filter(Boolean).join(', ');

        console.log(`[FootIK] Found bones: ${found}`);
    }

    /**
     * Get foot ground position via raycast
     */
    getFootGroundPosition(footBone) {
        if (!footBone || !this.hipBone) return null;

        // Get foot world position
        const footWorldPos = new THREE.Vector3();
        footBone.getWorldPosition(footWorldPos);

        // Raycast from above foot downwards
        const rayOrigin = footWorldPos.clone();
        rayOrigin.y = Math.max(rayOrigin.y, this.hipBone.position.y);

        this.raycaster.set(
            rayOrigin,
            new THREE.Vector3(0, -1, 0)
        );

        // Check against terrain if available, otherwise all scene meshes
        const targets = this.terrain ? [this.terrain] : this.scene.children;
        const intersects = this.raycaster.intersectObjects(targets, true);

        if (intersects.length > 0) {
            return intersects[0].point;
        }

        // Fallback: return original foot position with Y clamped to 0
        return new THREE.Vector3(footWorldPos.x, 0, footWorldPos.z);
    }

    /**
     * Apply IK offset to a foot bone
     */
    applyFootIK(footBone, targetPos, currentOffset) {
        if (!footBone || !targetPos) return;

        const footWorldPos = new THREE.Vector3();
        footBone.getWorldPosition(footWorldPos);

        // Calculate offset needed to reach ground
        const targetOffset = targetPos.clone().sub(footWorldPos);
        targetOffset.x = 0; // Lock X
        targetOffset.z = 0; // Lock Z

        // Smooth offset
        const lerpFactor = 0.3;
        currentOffset.lerp(targetOffset, lerpFactor);

        // Apply offset to bone
        footBone.position.add(currentOffset);
    }

    /**
     * Update foot IK
     */
    update() {
        if (!this.enabled) return;

        this.frameCounter++;

        // Throttle updates for performance
        if (this.frameCounter % this.updateInterval !== 0) return;

        // Get ground positions for both feet
        const leftGround = this.getFootGroundPosition(this.leftFootBone);
        const rightGround = this.getFootGroundPosition(this.rightFootBone);

        // Update IK targets
        if (leftGround) {
            this.leftFootTarget.copy(leftGround);
            this.leftFootPlantHeight = leftGround.y;
        }

        if (rightGround) {
            this.rightFootTarget.copy(rightGround);
            this.rightFootPlantHeight = rightGround.y;
        }

        // Apply IK based on which foot should be planted
        // Simple alternation: apply IK to one foot at a time
        if (this.phase === 0) {
            this.applyFootIK(this.leftFootBone, this.leftFootTarget, this.leftFootOffset);
            // Reset right foot offset gradually
            this.rightFootOffset.lerp(new THREE.Vector3(), 0.2);
        } else {
            this.applyFootIK(this.rightFootBone, this.rightFootTarget, this.rightFootOffset);
            // Reset left foot offset gradually
            this.leftFootOffset.lerp(new THREE.Vector3(), 0.2);
        }

        // Switch phase occasionally
        if (this.frameCounter % 20 === 0) {
            this.phase = 1 - this.phase;
        }
    }

    /**
     * Enable or disable IK
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Set terrain for raycasting
     */
    setTerrain(terrain) {
        this.terrain = terrain;
    }

    /**
     * Get IK debug info
     */
    getDebugInfo() {
        return {
            enabled: this.enabled,
            leftFootFound: !!this.leftFootBone,
            rightFootFound: !!this.rightFootBone,
            hipFound: !!this.hipBone,
            phase: this.phase,
            leftFootHeight: this.leftFootPlantHeight,
            rightFootHeight: this.rightFootPlantHeight,
        };
    }
}

/**
 * Create foot IK system for a character
 */
export function createFootIKSystem(skeleton, scene, terrain = null) {
    return new FootIKSystem(skeleton, scene, terrain);
}

/**
 * Simple IK without bone system (for procedural characters)
 */
export class SimpleFootIK {
    constructor(characterGroup, scene, terrain = null) {
        this.group = characterGroup;
        this.scene = scene;
        this.terrain = terrain;
        this.raycaster = new THREE.Raycaster();
        this.enabled = true;

        // Left/right foot references (for lowpoly characters)
        this.leftLeg = null;
        this.rightLeg = null;

        // Find leg groups
        this.group.traverse((child) => {
            if (child.name === 'leftLeg' || child.userData?.isLeftLeg) {
                this.leftLeg = child;
            }
            if (child.name === 'rightLeg' || child.userData?.isRightLeg) {
                this.rightLeg = child;
            }
        });
    }

    update() {
        if (!this.enabled) return;

        // Simple ground snapping for whole character
        const groundY = this.getGroundHeight(this.group.position);
        if (groundY !== null) {
            // Smooth interpolation
            this.group.position.y += (groundY - this.group.position.y) * 0.1;
        }
    }

    getGroundHeight(position) {
        const rayOrigin = position.clone();
        rayOrigin.y = Math.max(rayOrigin.y, 2);

        this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));

        const targets = this.terrain ? [this.terrain] : this.scene.children;
        const intersects = this.raycaster.intersectObjects(targets, true);

        if (intersects.length > 0) {
            return intersects[0].point.y;
        }

        return 0;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
