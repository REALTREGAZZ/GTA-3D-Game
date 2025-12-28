/**
 * NPC Visual System
 * - Starts with procedural rigged characters (always available)
 * - Optionally upgrades to real GLB models if present (local or CDN)
 * - Provides animation + tinting hooks for npc.js
 */

import * as THREE from 'three';
import { createProceduralCharacter } from './procedural-rigged-character.js';
import { AnimatedCharacter } from './animated-character.js';
import { CharacterLoader } from './character-loader.js';

export const NPC_VISUAL_CONFIG = {
    ENABLE_EXTERNAL_MODELS: true,

    LOCAL_MODEL_URLS: [
        // New recommended structure
        '/assets/models/characters/Aj.glb',
        '/assets/models/characters/Ty.glb',
        '/assets/models/characters/Rufus.glb',
        '/assets/models/characters/Xavier.glb',
        '/assets/models/characters/Aiden.glb',

        // Back-compat with existing docs / older paths
        '/assets/models/NPC_Ty.glb',
        '/assets/models/NPC_Rufus.glb',
        '/assets/models/NPC_Malcolm.glb',
    ],

    CDN_FALLBACK_URLS: [
        // Public humanoid model with built-in animations (Idle/Walk/Run).
        'https://threejs.org/examples/models/gltf/Soldier.glb',
    ],

    TINT_INTENSITY: 0.35,
};

const sharedLoader = new CharacterLoader();
let npcModelBasePromise = null;

function applyTint(object3d, tintColor, intensity = NPC_VISUAL_CONFIG.TINT_INTENSITY) {
    if (!object3d) return;

    object3d.traverse((node) => {
        if (!node?.isMesh || !node.material) return;

        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((mat) => {
            if (!mat?.color) return;

            if (!mat.userData.__baseColor) {
                mat.userData.__baseColor = mat.color.clone();
            }

            mat.color.copy(mat.userData.__baseColor).lerp(tintColor, intensity);
            mat.needsUpdate = true;
        });
    });
}

function getModelBasePromise() {
    if (npcModelBasePromise) return npcModelBasePromise;

    const modelUrls = [
        ...NPC_VISUAL_CONFIG.LOCAL_MODEL_URLS,
        ...NPC_VISUAL_CONFIG.CDN_FALLBACK_URLS,
    ];

    npcModelBasePromise = sharedLoader
        .loadCharacterBase({ modelUrls })
        .catch((err) => {
            console.warn('[NPCVisual] External model load failed. Using procedural rigged fallback.', err);
            return null;
        });

    return npcModelBasePromise;
}

export function createNPCVisual({ colorPreset }) {
    const group = new THREE.Group();

    const indicatorGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.35);
    const indicatorMaterial = new THREE.MeshToonMaterial({ color: 0x222222 });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(0, 1.1, 0.5);
    group.add(indicator);

    const procedural = createProceduralCharacter(colorPreset);
    const characterRoot = procedural.scene;

    // Align hips to local origin (npc.js uses origin as "hip" and offsets +1.0 to ground).
    characterRoot.position.y -= 1.0;

    group.add(characterRoot);

    const animator = new AnimatedCharacter(characterRoot, procedural.animationMap, {
        initial: 'idle',
        fade: 0.25,
    });

    const tintColor = new THREE.Color(colorPreset?.torso ?? 0xffffff);
    applyTint(characterRoot, tintColor);

    const state = {
        characterRoot,
        animator,
        tintColor,
        baseScale: 1.0,
        squashScale: new THREE.Vector3(1, 1, 1),
        usingExternalModel: false,
    };

    function applyScale() {
        if (!state.characterRoot) return;
        state.characterRoot.scale.setScalar(state.baseScale);
        state.characterRoot.scale.multiply(state.squashScale);
    }

    function setTint(color) {
        state.tintColor.copy(color);
        applyTint(state.characterRoot, state.tintColor);
    }

    function setBaseScale(scale) {
        state.baseScale = scale;
        applyScale();
    }

    function setSquashScale(xz, y) {
        state.squashScale.set(xz, y, xz);
        applyScale();
    }

    async function tryUpgradeToExternalModel() {
        if (!NPC_VISUAL_CONFIG.ENABLE_EXTERNAL_MODELS || state.usingExternalModel) return;

        const base = await getModelBasePromise();
        if (!base?.gltf) return;

        const instance = sharedLoader.createInstance(base.gltf);
        const newRoot = instance.scene;

        // Ensure hip alignment stays consistent.
        // The loader aligns hips to 0 already.

        group.remove(state.characterRoot);
        state.characterRoot = newRoot;
        group.add(newRoot);

        state.animator.setRoot(newRoot);
        state.animator.setAnimations(base.animationMap);
        state.animator.play('idle');

        state.usingExternalModel = true;

        applyScale();
        applyTint(newRoot, state.tintColor);
    }

    // Fire-and-forget: upgrades visuals once the GLB is available.
    tryUpgradeToExternalModel();

    return {
        group,
        indicator,
        animator,

        setTint,
        setBaseScale,
        setSquashScale,
        playAnimation: (name, options) => {
            if (!state.animator.hasAnimation(name)) {
                if (name === 'fall' && state.animator.hasAnimation('idle')) {
                    state.animator.play('idle', options);
                    return;
                }
                if (name === 'attack' && state.animator.hasAnimation('run')) {
                    state.animator.play('run', options);
                    return;
                }
                if (name === 'attack' && state.animator.hasAnimation('walk')) {
                    state.animator.play('walk', options);
                    return;
                }
            }

            state.animator.play(name, options);
        },
        update: (dt) => state.animator.update(dt),
        tryUpgradeToExternalModel,

        getUsingExternalModel: () => state.usingExternalModel,
    };
}
