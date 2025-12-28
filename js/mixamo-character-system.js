/**
 * Mixamo Character System
 * Loads and animates realistic humanoid characters from Mixamo with full skeletal rigging
 * Includes: Animation state machine, Foot IK, Ragdoll physics, Collision detection
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

// ============================================
// CHARACTER MODEL LOADER
// ============================================

export class MixamoCharacterLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.loadedModels = new Map();
        this.loadedAnimations = new Map();
    }

    /**
     * Load a Mixamo character model (glTF/GLB format)
     * @param {string} modelPath - Path to model file (e.g., '/assets/models/Aj.glb')
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} - Loaded model with skeleton and animations
     */
    async loadCharacter(modelPath, onProgress = null) {
        // Check cache first
        if (this.loadedModels.has(modelPath)) {
            return this.cloneCharacter(this.loadedModels.get(modelPath));
        }

        return new Promise((resolve, reject) => {
            this.loader.load(
                modelPath,
                (gltf) => {
                    const character = this.processCharacter(gltf);
                    this.loadedModels.set(modelPath, character);
                    resolve(this.cloneCharacter(character));
                },
                onProgress,
                (error) => {
                    console.error(`[MixamoLoader] Failed to load ${modelPath}:`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Process loaded GLTF into character structure
     */
    processCharacter(gltf) {
        const scene = gltf.scene;
        const animations = gltf.animations;

        // Find the skinned mesh
        let skinnedMesh = null;
        scene.traverse((child) => {
            if (child.isSkinnedMesh) {
                skinnedMesh = child;
            }
        });

        if (!skinnedMesh) {
            console.warn('[MixamoLoader] No skinned mesh found in model');
        }

        // Find bones
        const skeleton = skinnedMesh ? skinnedMesh.skeleton : null;
        const bones = skeleton ? skeleton.bones : [];

        // Create bone map for easy access
        const boneMap = {};
        bones.forEach(bone => {
            boneMap[bone.name] = bone;
        });

        return {
            scene: scene,
            skinnedMesh: skinnedMesh,
            skeleton: skeleton,
            bones: bones,
            boneMap: boneMap,
            animations: animations,
            originalMaterial: skinnedMesh ? skinnedMesh.material : null,
        };
    }

    /**
     * Clone character for instancing
     */
    cloneCharacter(character) {
        const clonedScene = character.scene.clone(true);

        // Find cloned skinned mesh
        let clonedSkinnedMesh = null;
        clonedScene.traverse((child) => {
            if (child.isSkinnedMesh) {
                clonedSkinnedMesh = child;
            }
        });

        const clonedSkeleton = clonedSkinnedMesh ? clonedSkinnedMesh.skeleton : null;
        const clonedBones = clonedSkeleton ? clonedSkeleton.bones : [];

        // Create bone map
        const boneMap = {};
        clonedBones.forEach(bone => {
            boneMap[bone.name] = bone;
        });

        return {
            scene: clonedScene,
            skinnedMesh: clonedSkinnedMesh,
            skeleton: clonedSkeleton,
            bones: clonedBones,
            boneMap: boneMap,
            animations: character.animations, // Animations can be shared
            originalMaterial: clonedSkinnedMesh ? clonedSkinnedMesh.material.clone() : null,
        };
    }

    /**
     * Load animation clips from separate files
     * @param {string} animPath - Path to animation file
     * @returns {Promise<AnimationClip[]>}
     */
    async loadAnimations(animPath) {
        if (this.loadedAnimations.has(animPath)) {
            return this.loadedAnimations.get(animPath);
        }

        return new Promise((resolve, reject) => {
            this.loader.load(
                animPath,
                (gltf) => {
                    const animations = gltf.animations;
                    this.loadedAnimations.set(animPath, animations);
                    resolve(animations);
                },
                null,
                reject
            );
        });
    }
}

// ============================================
// ANIMATION STATE MACHINE
// ============================================

export class AnimationStateMachine {
    constructor(mixer, animations) {
        this.mixer = mixer;
        this.animations = animations; // Map of animation name -> AnimationClip
        this.currentState = 'idle';
        this.currentAction = null;
        this.previousAction = null;
        this.transitionDuration = 0.2; // seconds
    }

    /**
     * Play an animation with smooth crossfade
     * @param {string} stateName - Name of animation state
     * @param {number} fadeTime - Crossfade duration (optional)
     */
    playAnimation(stateName, fadeTime = this.transitionDuration) {
        if (stateName === this.currentState && this.currentAction) return;

        const clip = this.animations[stateName];
        if (!clip) {
            console.warn(`[AnimStateMachine] Animation "${stateName}" not found`);
            return;
        }

        this.previousAction = this.currentAction;
        this.currentAction = this.mixer.clipAction(clip);

        if (this.previousAction && this.previousAction !== this.currentAction) {
            this.currentAction.reset();
            this.currentAction.setEffectiveTimeScale(1);
            this.currentAction.setEffectiveWeight(1);
            this.currentAction.crossFadeFrom(this.previousAction, fadeTime, true);
            this.currentAction.play();
        } else {
            this.currentAction.reset();
            this.currentAction.play();
        }

        this.currentState = stateName;
    }

    /**
     * Update animation mixer
     * @param {number} deltaTime - Time step in seconds
     */
    update(deltaTime) {
        this.mixer.update(deltaTime);
    }

    /**
     * Stop all animations
     */
    stopAll() {
        if (this.currentAction) {
            this.currentAction.stop();
        }
        this.currentAction = null;
        this.previousAction = null;
    }

    /**
     * Get current animation state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Set animation speed multiplier
     * @param {number} speed - Speed multiplier (1.0 = normal)
     */
    setSpeed(speed) {
        if (this.currentAction) {
            this.currentAction.setEffectiveTimeScale(speed);
        }
    }
}

// ============================================
// FOOT IK SYSTEM (Simple Ground Alignment)
// ============================================

export class FootIKSystem {
    constructor(skeleton, terrain) {
        this.skeleton = skeleton;
        this.terrain = terrain;
        this.enabled = true;
        this.raycaster = new THREE.Raycaster();
        this.ikStrength = 0.5; // How much IK affects the feet (0-1)

        // Find foot bones (common Mixamo bone names)
        this.leftFootBone = this.findBone(['LeftFoot', 'mixamorigLeftFoot', 'LeftAnkle']);
        this.rightFootBone = this.findBone(['RightFoot', 'mixamorigRightFoot', 'RightAnkle']);
        this.leftLegBone = this.findBone(['LeftLeg', 'mixamorigLeftLeg', 'LeftUpLeg']);
        this.rightLegBone = this.findBone(['RightLeg', 'mixamorigRightLeg', 'RightUpLeg']);
    }

    /**
     * Find bone by trying multiple name variations
     */
    findBone(nameVariations) {
        if (!this.skeleton) return null;
        
        for (const name of nameVariations) {
            const bone = this.skeleton.bones.find(b => b.name === name);
            if (bone) return bone;
        }
        return null;
    }

    /**
     * Apply foot IK to keep feet on ground
     * @param {THREE.Vector3} characterPosition - World position of character
     * @param {boolean} isGrounded - Whether character is on ground
     */
    apply(characterPosition, isGrounded) {
        if (!this.enabled || !isGrounded) return;
        if (!this.leftFootBone || !this.rightFootBone) return;

        this.applyFootIK(this.leftFootBone, this.leftLegBone, characterPosition);
        this.applyFootIK(this.rightFootBone, this.rightLegBone, characterPosition);
    }

    /**
     * Apply IK to a single foot
     */
    applyFootIK(footBone, legBone, characterPosition) {
        if (!footBone) return;

        // Get foot world position
        const footWorldPos = new THREE.Vector3();
        footBone.getWorldPosition(footWorldPos);

        // Raycast down from foot to find ground
        const rayOrigin = footWorldPos.clone();
        rayOrigin.y += 0.5; // Start slightly above foot
        const rayDirection = new THREE.Vector3(0, -1, 0);

        this.raycaster.set(rayOrigin, rayDirection);
        const intersects = this.raycaster.intersectObject(this.terrain, true);

        if (intersects.length > 0) {
            const groundPoint = intersects[0].point;
            const footHeight = footWorldPos.y - characterPosition.y;
            const groundHeight = groundPoint.y - characterPosition.y;
            const heightDiff = groundHeight - footHeight;

            // Only adjust if foot is above or slightly below ground (within reasonable range)
            if (Math.abs(heightDiff) < 0.3) {
                // Apply adjustment to leg bone rotation (simplified IK)
                if (legBone) {
                    const adjustment = heightDiff * this.ikStrength;
                    legBone.rotation.x += adjustment * 0.1;
                }
            }
        }
    }

    /**
     * Enable/disable IK
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// ============================================
// RAGDOLL PHYSICS SYSTEM
// ============================================

export class RagdollSystem {
    constructor(skeleton, physicsWorld) {
        this.skeleton = skeleton;
        this.physicsWorld = physicsWorld;
        this.isRagdolling = false;
        this.bodies = [];
        this.constraints = [];

        // Create physics bodies for major bones
        this.createRagdollBodies();
    }

    /**
     * Create physics bodies for skeleton bones
     */
    createRagdollBodies() {
        if (!this.skeleton) return;

        // Define major body parts with Mixamo bone name variations
        const bodyParts = [
            {
                names: ['Hips', 'mixamorigHips'],
                shape: new CANNON.Box(new CANNON.Vec3(0.15, 0.15, 0.1)),
                mass: 15
            },
            {
                names: ['Spine', 'mixamorigSpine', 'Spine1'],
                shape: new CANNON.Box(new CANNON.Vec3(0.15, 0.2, 0.1)),
                mass: 12
            },
            {
                names: ['Head', 'mixamorigHead'],
                shape: new CANNON.Sphere(0.12),
                mass: 3
            },
            {
                names: ['LeftArm', 'mixamorigLeftArm'],
                shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.15, 0.05)),
                mass: 2
            },
            {
                names: ['RightArm', 'mixamorigRightArm'],
                shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.15, 0.05)),
                mass: 2
            },
            {
                names: ['LeftForeArm', 'mixamorigLeftForeArm'],
                shape: new CANNON.Box(new CANNON.Vec3(0.04, 0.15, 0.04)),
                mass: 1
            },
            {
                names: ['RightForeArm', 'mixamorigRightForeArm'],
                shape: new CANNON.Box(new CANNON.Vec3(0.04, 0.15, 0.04)),
                mass: 1
            },
            {
                names: ['LeftUpLeg', 'mixamorigLeftUpLeg'],
                shape: new CANNON.Box(new CANNON.Vec3(0.06, 0.2, 0.06)),
                mass: 3
            },
            {
                names: ['RightUpLeg', 'mixamorigRightUpLeg'],
                shape: new CANNON.Box(new CANNON.Vec3(0.06, 0.2, 0.06)),
                mass: 3
            },
            {
                names: ['LeftLeg', 'mixamorigLeftLeg'],
                shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.2, 0.05)),
                mass: 2
            },
            {
                names: ['RightLeg', 'mixamorigRightLeg'],
                shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.2, 0.05)),
                mass: 2
            },
        ];

        // Create physics bodies for each part
        bodyParts.forEach(part => {
            const bone = this.findBone(part.names);
            if (bone) {
                const body = new CANNON.Body({
                    mass: part.mass,
                    shape: part.shape,
                    linearDamping: 0.3,
                    angularDamping: 0.3,
                });

                // Get bone world position
                const worldPos = new THREE.Vector3();
                bone.getWorldPosition(worldPos);
                body.position.set(worldPos.x, worldPos.y, worldPos.z);

                // Get bone world quaternion
                const worldQuat = new THREE.Quaternion();
                bone.getWorldQuaternion(worldQuat);
                body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

                this.bodies.push({
                    bone: bone,
                    body: body,
                    boneName: bone.name
                });
            }
        });
    }

    /**
     * Find bone by trying multiple name variations
     */
    findBone(nameVariations) {
        if (!this.skeleton) return null;
        
        for (const name of nameVariations) {
            const bone = this.skeleton.bones.find(b => b.name === name);
            if (bone) return bone;
        }
        return null;
    }

    /**
     * Enable ragdoll physics
     */
    enable() {
        if (this.isRagdolling) return;
        
        this.isRagdolling = true;

        // Add all bodies to physics world
        this.bodies.forEach(({ body }) => {
            this.physicsWorld.addBody(body);
        });

        // Copy current skeleton pose to physics bodies
        this.syncSkeletonToPhysics();
    }

    /**
     * Disable ragdoll physics
     */
    disable() {
        if (!this.isRagdolling) return;
        
        this.isRagdolling = false;

        // Remove all bodies from physics world
        this.bodies.forEach(({ body }) => {
            this.physicsWorld.removeBody(body);
        });
    }

    /**
     * Update ragdoll - sync physics to skeleton
     */
    update() {
        if (!this.isRagdolling) return;

        this.syncPhysicsToSkeleton();
    }

    /**
     * Sync skeleton pose to physics bodies (when enabling ragdoll)
     */
    syncSkeletonToPhysics() {
        this.bodies.forEach(({ bone, body }) => {
            const worldPos = new THREE.Vector3();
            bone.getWorldPosition(worldPos);
            body.position.set(worldPos.x, worldPos.y, worldPos.z);

            const worldQuat = new THREE.Quaternion();
            bone.getWorldQuaternion(worldQuat);
            body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

            // Reset velocities
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
        });
    }

    /**
     * Sync physics bodies to skeleton (during ragdoll)
     */
    syncPhysicsToSkeleton() {
        this.bodies.forEach(({ bone, body }) => {
            // Convert physics position to bone local space
            const worldPos = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
            const worldQuat = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);

            // Apply to bone (simplified - in production you'd convert to local space)
            if (bone.parent) {
                const parentWorldQuat = new THREE.Quaternion();
                bone.parent.getWorldQuaternion(parentWorldQuat);
                parentWorldQuat.invert();
                worldQuat.premultiply(parentWorldQuat);
            }

            bone.quaternion.copy(worldQuat);
        });
    }

    /**
     * Apply impulse to ragdoll (e.g., from being hit)
     * @param {THREE.Vector3} force - Force vector
     * @param {THREE.Vector3} point - World point of impact
     */
    applyImpulse(force, point) {
        if (!this.isRagdolling) return;

        // Find nearest body to impact point
        let nearestBody = null;
        let minDist = Infinity;

        this.bodies.forEach(({ body }) => {
            const bodyPos = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
            const dist = bodyPos.distanceTo(point);
            if (dist < minDist) {
                minDist = dist;
                nearestBody = body;
            }
        });

        if (nearestBody) {
            const impulse = new CANNON.Vec3(force.x, force.y, force.z);
            const worldPoint = new CANNON.Vec3(point.x, point.y, point.z);
            nearestBody.applyImpulse(impulse, worldPoint);
        }
    }

    /**
     * Cleanup physics bodies
     */
    destroy() {
        this.disable();
        this.bodies = [];
        this.constraints = [];
    }
}

// ============================================
// CAPSULE COLLISION SYSTEM
// ============================================

export class CapsuleCollider {
    constructor(height = 1.8, radius = 0.35) {
        this.height = height;
        this.radius = radius;

        // Create Cannon.js capsule (cylinder with spheres at ends)
        const cylinderHeight = height - radius * 2;
        this.body = new CANNON.Body({
            mass: 70, // kg (average human)
            position: new CANNON.Vec3(0, height / 2, 0),
        });

        // Capsule = cylinder + 2 spheres
        const cylinderShape = new CANNON.Cylinder(radius, radius, cylinderHeight, 8);
        const sphereShape = new CANNON.Sphere(radius);

        this.body.addShape(cylinderShape);
        this.body.addShape(sphereShape, new CANNON.Vec3(0, cylinderHeight / 2, 0)); // Top
        this.body.addShape(sphereShape, new CANNON.Vec3(0, -cylinderHeight / 2, 0)); // Bottom

        // Collision properties
        this.body.linearDamping = 0.9;
        this.body.angularDamping = 0.99;
        this.body.fixedRotation = true; // Prevent character from falling over
    }

    /**
     * Get body reference for physics world
     */
    getBody() {
        return this.body;
    }

    /**
     * Get position
     */
    getPosition() {
        return new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }

    /**
     * Set position
     */
    setPosition(position) {
        this.body.position.set(position.x, position.y, position.z);
    }

    /**
     * Apply velocity
     */
    setVelocity(velocity) {
        this.body.velocity.set(velocity.x, velocity.y, velocity.z);
    }

    /**
     * Get velocity
     */
    getVelocity() {
        return new THREE.Vector3(
            this.body.velocity.x,
            this.body.velocity.y,
            this.body.velocity.z
        );
    }
}

// ============================================
// MIXAMO CHARACTER CONTROLLER
// ============================================

export class MixamoCharacter {
    constructor(characterData, physicsWorld, terrain) {
        this.characterData = characterData;
        this.scene = characterData.scene;
        this.skeleton = characterData.skeleton;
        this.skinnedMesh = characterData.skinnedMesh;
        this.physicsWorld = physicsWorld;
        this.terrain = terrain;

        // Animation system
        this.mixer = new THREE.AnimationMixer(this.scene);
        this.animationStateMachine = null;

        // Physics
        this.capsuleCollider = new CapsuleCollider(1.8, 0.35);
        this.physicsWorld.addBody(this.capsuleCollider.getBody());

        // Ragdoll
        this.ragdollSystem = new RagdollSystem(this.skeleton, this.physicsWorld);

        // Foot IK
        this.footIK = new FootIKSystem(this.skeleton, this.terrain);

        // State
        this.isRagdolling = false;
        this.isGrounded = true;

        // Setup shadow casting
        if (this.skinnedMesh) {
            this.skinnedMesh.castShadow = true;
            this.skinnedMesh.receiveShadow = true;
        }
    }

    /**
     * Setup animations from animation clips
     * @param {Object} animationMap - Map of state names to AnimationClips
     */
    setupAnimations(animationMap) {
        this.animationStateMachine = new AnimationStateMachine(this.mixer, animationMap);
    }

    /**
     * Play animation state
     * @param {string} stateName - Animation state name (idle, walk, run, jump, etc.)
     */
    playAnimation(stateName) {
        if (this.animationStateMachine && !this.isRagdolling) {
            this.animationStateMachine.playAnimation(stateName);
        }
    }

    /**
     * Update character (call every frame)
     * @param {number} deltaTime - Time step in seconds
     */
    update(deltaTime) {
        if (this.isRagdolling) {
            // Update ragdoll physics
            this.ragdollSystem.update();
        } else {
            // Update animation mixer
            if (this.animationStateMachine) {
                this.animationStateMachine.update(deltaTime);
            }

            // Sync character position with physics capsule
            const capsulePos = this.capsuleCollider.getPosition();
            this.scene.position.copy(capsulePos);
            this.scene.position.y -= 0.9; // Offset so feet align with capsule bottom

            // Apply foot IK
            if (this.footIK) {
                this.footIK.apply(capsulePos, this.isGrounded);
            }
        }
    }

    /**
     * Enable ragdoll mode
     */
    enableRagdoll() {
        if (this.isRagdolling) return;

        this.isRagdolling = true;
        this.ragdollSystem.enable();
        
        if (this.animationStateMachine) {
            this.animationStateMachine.stopAll();
        }

        // Disable capsule collider during ragdoll
        this.capsuleCollider.getBody().collisionResponse = false;
    }

    /**
     * Disable ragdoll mode
     */
    disableRagdoll() {
        if (!this.isRagdolling) return;

        this.isRagdolling = false;
        this.ragdollSystem.disable();

        // Re-enable capsule collider
        this.capsuleCollider.getBody().collisionResponse = true;
    }

    /**
     * Apply knockback force
     * @param {THREE.Vector3} force - Force vector
     * @param {THREE.Vector3} impactPoint - World impact point
     */
    applyKnockback(force, impactPoint) {
        if (this.isRagdolling) {
            this.ragdollSystem.applyImpulse(force, impactPoint);
        } else {
            // Apply to capsule
            const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
            this.capsuleCollider.getBody().applyImpulse(cannonForce);
        }
    }

    /**
     * Set character position
     * @param {THREE.Vector3} position
     */
    setPosition(position) {
        this.capsuleCollider.setPosition(position);
        this.scene.position.copy(position);
        this.scene.position.y -= 0.9;
    }

    /**
     * Get character position
     * @returns {THREE.Vector3}
     */
    getPosition() {
        return this.capsuleCollider.getPosition();
    }

    /**
     * Set character velocity
     * @param {THREE.Vector3} velocity
     */
    setVelocity(velocity) {
        this.capsuleCollider.setVelocity(velocity);
    }

    /**
     * Get character velocity
     * @returns {THREE.Vector3}
     */
    getVelocity() {
        return this.capsuleCollider.getVelocity();
    }

    /**
     * Change character material (for color variations)
     * @param {THREE.Material} material
     */
    setMaterial(material) {
        if (this.skinnedMesh) {
            this.skinnedMesh.material = material;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.ragdollSystem.destroy();
        this.physicsWorld.removeBody(this.capsuleCollider.getBody());
    }
}

// ============================================
// EXPORTS
// ============================================

export default {
    MixamoCharacterLoader,
    AnimationStateMachine,
    FootIKSystem,
    RagdollSystem,
    CapsuleCollider,
    MixamoCharacter,
};
