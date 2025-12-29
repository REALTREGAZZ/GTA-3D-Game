/**
 * Dark Souls Inspired Player Avatar
 * Loads player-avatar.glb or creates a procedural knight/warrior character
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createLowPolyHumanoid } from './lowpoly-characters.js';

export async function createDarkSoulsAvatar(options = {}) {
    const { preferGLB = true } = options;

    // Try to load GLB model first
    if (preferGLB) {
        const loader = new GLTFLoader();
        try {
            const gltf = await loader.loadAsync('/assets/models/player-avatar.glb');
            const model = gltf.scene;

            // Scale and position adjustment
            model.scale.set(1, 1, 1);
            model.position.set(0, 0, 0);

            // Enable shadows
            model.traverse((node) => {
                if (node?.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            console.log('[DarkSoulsAvatar] Loaded player-avatar.glb successfully');
            return {
                group: model,
                materials: {},
                isGLB: true,
                mixer: new THREE.AnimationMixer(model)
            };
        } catch (err) {
            console.warn('[DarkSoulsAvatar] Could not load player-avatar.glb, using procedural avatar');
        }
    }

    // Fallback to procedural avatar
    const darkSoulsColors = {
        torso: 0x2a2a2a,
        arms: 0x1e1e1e,
        legs: 0x121212,
        head: 0x333333,
        accent: 0x8b0000,
        highlight: 0x5a5a5a
    };

    const humanoid = createLowPolyHumanoid({
        torso: darkSoulsColors.torso,
        arms: darkSoulsColors.arms,
        legs: darkSoulsColors.legs,
        head: darkSoulsColors.head
    }, true);

    const group = humanoid.group;
    const materials = humanoid.materials;

    addDarkSoulsArmorDetails(group, darkSoulsColors);
    addDarkSoulsWeapon(group, darkSoulsColors);
    addDarkSoulsCape(group, darkSoulsColors);

    Object.values(materials).forEach(material => {
        if (material) {
            material.metalness = 0.3;
            material.roughness = 0.6;
            material.needsUpdate = true;
        }
    });

    return {
        ...humanoid,
        group: group,
        materials: materials,
        isGLB: false,
        mixer: null
    };
}

function addDarkSoulsArmorDetails(group, colors) {
    // Add shoulder pauldrons
    const pauldronGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    const pauldronMaterial = new THREE.MeshStandardMaterial({
        color: colors.highlight,
        metalness: 0.5,
        roughness: 0.4
    });

    const leftPauldron = new THREE.Mesh(pauldronGeometry, pauldronMaterial);
    leftPauldron.position.set(-0.4, 0.9, 0);
    leftPauldron.rotation.z = Math.PI / 4;
    group.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeometry, pauldronMaterial);
    rightPauldron.position.set(0.4, 0.9, 0);
    rightPauldron.rotation.z = -Math.PI / 4;
    group.add(rightPauldron);

    // Add belt/waist armor
    const beltGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.2);
    const beltMaterial = new THREE.MeshStandardMaterial({
        color: colors.accent,
        metalness: 0.2,
        roughness: 0.5
    });

    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    belt.position.set(0, 0.3, 0);
    group.add(belt);

    // Add knee guards
    const kneeGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.2);
    const kneeMaterial = new THREE.MeshStandardMaterial({
        color: colors.highlight,
        metalness: 0.4,
        roughness: 0.3
    });

    const leftKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
    leftKnee.position.set(-0.15, -0.3, 0);
    group.add(leftKnee);

    const rightKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
    rightKnee.position.set(0.15, -0.3, 0);
    group.add(rightKnee);
}

function addDarkSoulsWeapon(group, colors) {
    // Create a simple sword
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.2);
    const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
    });

    const hiltGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const hiltMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.4,
        roughness: 0.6
    });

    const sword = new THREE.Group();
    sword.name = 'DarkSoulsSword';

    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.4;
    sword.add(blade);

    const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
    hilt.position.y = -0.3;
    sword.add(hilt);

    // Position sword on character's right side (sheathed)
    sword.position.set(0.2, 0.5, -0.1);
    sword.rotation.z = Math.PI / 4;
    sword.rotation.x = Math.PI / 6;

    group.add(sword);

    return sword;
}

function addDarkSoulsCape(group, colors) {
    // Create a dramatic cape
    const capeGeometry = new THREE.PlaneGeometry(0.8, 1.2);
    const capeMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a0000, // Dark red/blood color
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1
    });

    const cape = new THREE.Mesh(capeGeometry, capeMaterial);
    cape.position.set(0, 0.8, -0.3);
    cape.rotation.x = Math.PI / 2;
    cape.name = 'DarkSoulsCape';

    // Add some vertices to make it look more like a cape
    const positions = cape.geometry.attributes.position;
    const originalY = [];
    for (let i = 0; i < positions.count; i++) {
        originalY[i] = positions.getY(i);
    }

    // Animate cape slightly
    cape.userData.originalY = originalY;
    cape.userData.time = 0;

    cape.update = function(deltaTime, moveDirection) {
        this.userData.time += deltaTime;
        const positions = this.geometry.attributes.position;
        
        // Add slight wave effect
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const wave = Math.sin(this.userData.time * 2 + x * 2 + z * 2) * 0.05;
            positions.setY(i, this.userData.originalY[i] + wave);
        }
        positions.needsUpdate = true;
        
        // Add movement-based sway
        if (moveDirection && moveDirection.lengthSq() > 0) {
            this.rotation.z = Math.sin(this.userData.time * 3) * 0.1 * moveDirection.length();
        }
    };

    group.add(cape);

    return cape;
}

// Animation system for Dark Souls style character
export function createDarkSoulsAnimationController(player) {
    const sword = player.group.getObjectByName('DarkSoulsSword');
    const cape = player.group.getObjectByName('DarkSoulsCape');
    
    let isSwordDrawn = false;
    let drawProgress = 0;

    return {
        update: function(deltaTime, playerState) {
            // Update cape animation
            if (cape && cape.update) {
                const moveDir = playerState.isMoving ? new THREE.Vector3(1, 0, 0) : null;
                cape.update(deltaTime, moveDir);
            }

            // Handle sword drawing/ sheathing
            if (playerState.isAttacking) {
                if (!isSwordDrawn) {
                    drawProgress = Math.min(1, drawProgress + deltaTime * 5);
                    if (drawProgress >= 1) {
                        isSwordDrawn = true;
                    }
                }
            } else {
                if (isSwordDrawn) {
                    drawProgress = Math.max(0, drawProgress - deltaTime * 3);
                    if (drawProgress <= 0) {
                        isSwordDrawn = false;
                    }
                }
            }

            // Update sword position based on draw state
            if (sword) {
                if (isSwordDrawn) {
                    // Drawn position - in hand
                    sword.position.set(0.3, 0.6, -0.2);
                    sword.rotation.set(Math.PI / 3, 0, Math.PI / 2);
                } else {
                    // Sheathed position
                    const progress = 1 - drawProgress;
                    sword.position.lerpVectors(
                        new THREE.Vector3(0.2, 0.5, -0.1),
                        new THREE.Vector3(0.3, 0.6, -0.2),
                        progress
                    );
                    sword.rotation.set(
                        THREE.MathUtils.lerp(Math.PI / 4, Math.PI / 3, progress),
                        0,
                        THREE.MathUtils.lerp(Math.PI / 6, Math.PI / 2, progress)
                    );
                }
            }
        },

        triggerAttack: function() {
            // Trigger attack animation
            isSwordDrawn = true;
            drawProgress = 1;
        }
    };
}