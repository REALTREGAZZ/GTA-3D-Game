/**
 * Unified Character System
 * Provides a single interface for both Mixamo and Low-Poly characters
 * Handles fallbacks, loading, and integration with existing game systems
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MixamoCharacterLoader, MixamoCharacter } from './mixamo-character-system.js';
import { createProceduralCharacter } from './procedural-rigged-character.js';
import { createLowPolyHumanoid, EMOTIONS } from './lowpoly-characters.js';

// ============================================
// CONFIGURATION
// ============================================

export const CHARACTER_SYSTEM_CONFIG = {
    USE_MIXAMO: false, // Set to true when Mixamo models are available
    USE_PROCEDURAL_RIGGED: true, // Use skeletal rigged fallback
    USE_LOWPOLY_FALLBACK: true, // Use simple low-poly as last resort
    
    MIXAMO_MODELS: {
        PLAYER: '/assets/models/Player_Aj.glb',
        NPC_VARIANTS: [
            '/assets/models/NPC_Ty.glb',
            '/assets/models/NPC_Rufus.glb',
            '/assets/models/NPC_Malcolm.glb',
        ]
    },
    
    ANIMATIONS: {
        IDLE: '/assets/models/animations/Idle.glb',
        WALK: '/assets/models/animations/Walk.glb',
        RUN: '/assets/models/animations/Run.glb',
        JUMP: '/assets/models/animations/Jump.glb',
        FALL: '/assets/models/animations/Fall.glb',
    },
    
    NPC_COLORS: [
        0xff4444, // Red
        0x4444ff, // Blue
        0x44ff44, // Green
        0xffff44, // Yellow
        0xaa44ff, // Purple
        0xff8844, // Orange
        0x44ffff, // Cyan
        0xff44aa, // Pink
    ],
};

// ============================================
// UNIFIED CHARACTER WRAPPER
// ============================================

export class UnifiedCharacter {
    constructor(characterData, characterType, physicsWorld, terrain) {
        this.characterType = characterType; // 'mixamo', 'procedural', or 'lowpoly'
        this.characterData = characterData;
        this.physicsWorld = physicsWorld;
        this.terrain = terrain;

        // Common properties
        this.mesh = null;
        this.position = new THREE.Vector3();
        this.rotation = 0;
        this.velocity = new THREE.Vector3();
        this.isGrounded = true;
        this.isRagdolling = false;

        // Animation
        this.mixer = null;
        this.currentAnimation = 'idle';

        // Physics body (capsule collider)
        this.body = null;

        // Initialize based on type
        this.initialize();
    }

    initialize() {
        switch (this.characterType) {
            case 'mixamo':
            case 'procedural':
                this.initializeRiggedCharacter();
                break;
            case 'lowpoly':
                this.initializeLowPolyCharacter();
                break;
        }
    }

    initializeRiggedCharacter() {
        // For Mixamo and procedural rigged characters
        this.mesh = this.characterData.scene;
        
        // Setup animation mixer
        if (this.characterData.animations || this.characterData.animationMap) {
            this.mixer = new THREE.AnimationMixer(this.mesh);
            
            // Setup animations
            const animMap = this.characterData.animationMap || {};
            Object.keys(animMap).forEach(name => {
                const clip = animMap[name];
                const action = this.mixer.clipAction(clip);
                if (name === 'idle') {
                    action.play(); // Start with idle
                }
            });
        }

        // Create capsule collider
        this.createCapsuleCollider();
    }

    initializeLowPolyCharacter() {
        // For existing low-poly characters
        this.mesh = this.characterData.group;
        // Low-poly uses procedural animations, not skeletal
    }

    createCapsuleCollider() {
        const height = 1.8;
        const radius = 0.35;
        
        const cylinderHeight = height - radius * 2;
        this.body = new CANNON.Body({
            mass: 70,
            position: new CANNON.Vec3(0, height / 2, 0),
            linearDamping: 0.9,
            angularDamping: 0.99,
            fixedRotation: true,
        });

        const cylinderShape = new CANNON.Cylinder(radius, radius, cylinderHeight, 8);
        const sphereShape = new CANNON.Sphere(radius);

        this.body.addShape(cylinderShape);
        this.body.addShape(sphereShape, new CANNON.Vec3(0, cylinderHeight / 2, 0));
        this.body.addShape(sphereShape, new CANNON.Vec3(0, -cylinderHeight / 2, 0));

        if (this.physicsWorld) {
            this.physicsWorld.addBody(this.body);
        }
    }

    playAnimation(animationName) {
        if (this.currentAnimation === animationName) return;
        
        if (this.characterType === 'mixamo' || this.characterType === 'procedural') {
            // Use animation mixer
            if (this.mixer) {
                const animMap = this.characterData.animationMap || {};
                const clip = animMap[animationName];
                
                if (clip) {
                    const action = this.mixer.clipAction(clip);
                    action.reset();
                    action.setEffectiveTimeScale(1);
                    action.setEffectiveWeight(1);
                    action.play();
                    
                    // Stop previous animation
                    if (this.currentAnimation) {
                        const prevClip = animMap[this.currentAnimation];
                        if (prevClip) {
                            const prevAction = this.mixer.clipAction(prevClip);
                            action.crossFadeFrom(prevAction, 0.2, true);
                        }
                    }
                }
            }
        }
        // Low-poly characters handle animations differently (in player.js/npc.js)
        
        this.currentAnimation = animationName;
    }

    update(deltaTime) {
        // Update animation mixer
        if (this.mixer && !this.isRagdolling) {
            this.mixer.update(deltaTime);
        }

        // Sync mesh with physics body
        if (this.body && this.mesh) {
            this.position.set(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
            
            this.mesh.position.copy(this.position);
            if (this.characterType !== 'lowpoly') {
                this.mesh.position.y -= 0.9; // Foot offset for rigged characters
            }
        }
    }

    getPosition() {
        return this.position.clone();
    }

    setPosition(pos) {
        this.position.copy(pos);
        if (this.body) {
            this.body.position.set(pos.x, pos.y, pos.z);
        }
        if (this.mesh) {
            this.mesh.position.copy(pos);
        }
    }

    setVelocity(vel) {
        this.velocity.copy(vel);
        if (this.body) {
            this.body.velocity.set(vel.x, vel.y, vel.z);
        }
    }

    enableRagdoll() {
        this.isRagdolling = true;
        // Implementation depends on character type
        if (this.characterType === 'mixamo' || this.characterType === 'procedural') {
            // Stop animations
            if (this.mixer) {
                this.mixer.stopAllAction();
            }
            // Enable physics simulation on bones (if ragdoll system is set up)
        }
    }

    disableRagdoll() {
        this.isRagdolling = false;
        this.playAnimation('idle');
    }

    applyKnockback(force, impactPoint) {
        if (this.body) {
            const impulse = new CANNON.Vec3(force.x, force.y, force.z);
            this.body.applyImpulse(impulse);
        }
    }

    destroy() {
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body);
        }
    }
}

// ============================================
// CHARACTER FACTORY
// ============================================

export class CharacterFactory {
    constructor(physicsWorld, terrain) {
        this.physicsWorld = physicsWorld;
        this.terrain = terrain;
        this.mixamoLoader = new MixamoCharacterLoader();
        this.loadedAnimations = null;
    }

    /**
     * Create a character (player or NPC)
     * Automatically selects best available system
     */
    async createCharacter(options = {}) {
        const {
            isPlayer = false,
            colorPreset = null,
            useRigged = CHARACTER_SYSTEM_CONFIG.USE_PROCEDURAL_RIGGED,
        } = options;

        let characterData = null;
        let characterType = 'lowpoly';

        // Try Mixamo first (if enabled and models available)
        if (CHARACTER_SYSTEM_CONFIG.USE_MIXAMO) {
            try {
                const modelPath = isPlayer 
                    ? CHARACTER_SYSTEM_CONFIG.MIXAMO_MODELS.PLAYER
                    : this.getRandomNPCModel();
                
                characterData = await this.mixamoLoader.loadCharacter(modelPath);
                
                // Load animations if not already loaded
                if (!this.loadedAnimations) {
                    await this.loadAnimations();
                }
                
                // Setup animations on character
                characterData.animationMap = this.loadedAnimations;
                characterType = 'mixamo';
                
                console.log('[CharacterFactory] Created Mixamo character');
            } catch (error) {
                console.warn('[CharacterFactory] Mixamo loading failed, falling back:', error);
                characterData = null;
            }
        }

        // Fallback to procedural rigged character
        if (!characterData && useRigged) {
            try {
                const color = colorPreset || this.getRandomColor();
                characterData = createProceduralCharacter(color);
                characterType = 'procedural';
                console.log('[CharacterFactory] Created procedural rigged character');
            } catch (error) {
                console.warn('[CharacterFactory] Procedural character failed:', error);
                characterData = null;
            }
        }

        // Final fallback to low-poly
        if (!characterData) {
            const color = colorPreset || {
                torso: this.getRandomColor(),
                arms: this.getRandomColor(),
                legs: this.getRandomColor(),
            };
            characterData = createLowPolyHumanoid(color, isPlayer);
            characterType = 'lowpoly';
            console.log('[CharacterFactory] Created low-poly character (fallback)');
        }

        // Create unified character wrapper
        const character = new UnifiedCharacter(
            characterData,
            characterType,
            this.physicsWorld,
            this.terrain
        );

        return character;
    }

    async loadAnimations() {
        const animations = {};
        
        try {
            const idleData = await this.mixamoLoader.loadAnimations(CHARACTER_SYSTEM_CONFIG.ANIMATIONS.IDLE);
            animations.idle = idleData[0];
            
            const walkData = await this.mixamoLoader.loadAnimations(CHARACTER_SYSTEM_CONFIG.ANIMATIONS.WALK);
            animations.walk = walkData[0];
            
            const runData = await this.mixamoLoader.loadAnimations(CHARACTER_SYSTEM_CONFIG.ANIMATIONS.RUN);
            animations.run = runData[0];
            
            const jumpData = await this.mixamoLoader.loadAnimations(CHARACTER_SYSTEM_CONFIG.ANIMATIONS.JUMP);
            animations.jump = jumpData[0];
            
            const fallData = await this.mixamoLoader.loadAnimations(CHARACTER_SYSTEM_CONFIG.ANIMATIONS.FALL);
            animations.fall = fallData[0];
            
            this.loadedAnimations = animations;
        } catch (error) {
            console.warn('[CharacterFactory] Failed to load animations:', error);
            this.loadedAnimations = {};
        }
    }

    getRandomNPCModel() {
        const models = CHARACTER_SYSTEM_CONFIG.MIXAMO_MODELS.NPC_VARIANTS;
        return models[Math.floor(Math.random() * models.length)];
    }

    getRandomColor() {
        const colors = CHARACTER_SYSTEM_CONFIG.NPC_COLORS;
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// ============================================
// UTILITY: Check if Mixamo models are available
// ============================================

export async function checkMixamoAvailability() {
    try {
        const response = await fetch(CHARACTER_SYSTEM_CONFIG.MIXAMO_MODELS.PLAYER, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// ============================================
// AUTO-DETECT SYSTEM
// ============================================

export async function initializeCharacterSystem(physicsWorld, terrain) {
    // Check if Mixamo models are available
    const mixamoAvailable = await checkMixamoAvailability();
    
    if (mixamoAvailable) {
        console.log('✅ Mixamo models detected - using realistic characters');
        CHARACTER_SYSTEM_CONFIG.USE_MIXAMO = true;
    } else {
        console.log('ℹ️ Mixamo models not found - using procedural rigged characters');
        CHARACTER_SYSTEM_CONFIG.USE_MIXAMO = false;
    }
    
    return new CharacterFactory(physicsWorld, terrain);
}

// ============================================
// EXPORTS
// ============================================

export default {
    CHARACTER_SYSTEM_CONFIG,
    UnifiedCharacter,
    CharacterFactory,
    initializeCharacterSystem,
    checkMixamoAvailability,
};
