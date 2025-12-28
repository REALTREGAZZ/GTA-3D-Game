/**
 * Animated Character
 * Small helper around THREE.AnimationMixer with crossfades + one-shots.
 */

import * as THREE from 'three';

export class AnimatedCharacter {
    constructor(root, animationMap = {}, options = {}) {
        this.root = root;
        this.mixer = root ? new THREE.AnimationMixer(root) : null;

        this.animationMap = animationMap;
        this.actions = new Map();

        this.currentAction = null;
        this.currentName = null;

        this.defaultFade = options.fade ?? 0.2;

        const initial = options.initial ?? 'idle';
        if (options.autoPlay !== false) {
            this.play(initial);
        }
    }

    setRoot(root) {
        this.stop();
        this.root = root;
        this.mixer = root ? new THREE.AnimationMixer(root) : null;
        this.actions.clear();
        this.currentAction = null;
        this.currentName = null;
    }

    setAnimations(animationMap = {}) {
        this.stop();
        this.animationMap = animationMap;
        this.actions.clear();
        this.currentAction = null;
        this.currentName = null;
    }

    _getAction(name) {
        if (!this.mixer) return null;
        const clip = this.animationMap?.[name];
        if (!clip) return null;

        if (!this.actions.has(name)) {
            this.actions.set(name, this.mixer.clipAction(clip));
        }
        return this.actions.get(name);
    }

    play(name, options = {}) {
        const { fade = this.defaultFade, loop = THREE.LoopRepeat, once = false } = options;

        const action = this._getAction(name);
        if (!action) return;

        if (this.currentName === name && this.currentAction) {
            return;
        }

        const prev = this.currentAction;

        action.reset();
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(1);

        if (once) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
        } else {
            action.setLoop(loop, Infinity);
            action.clampWhenFinished = false;
        }

        action.play();

        if (prev && prev !== action) {
            action.crossFadeFrom(prev, fade, true);
        }

        this.currentAction = action;
        this.currentName = name;
    }

    stop() {
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        this.currentAction = null;
        this.currentName = null;
    }

    update(deltaTime) {
        if (!this.mixer) return;
        this.mixer.update(deltaTime);
    }

    hasAnimation(name) {
        return Boolean(this.animationMap?.[name]);
    }

    getCurrentAnimation() {
        return this.currentName;
    }
}
