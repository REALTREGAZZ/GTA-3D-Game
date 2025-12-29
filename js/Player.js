/**
 * Player
 * Humanoid player model with animation mixer
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './config.js';

export class Player {
    constructor() {
        this.mesh = null;
        this.mixer = null;
        this.actions = {};
        this.currentAction = null;
        this.animationWeights = {};
        
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        this.isGrounded = true;
        this.isMoving = false;
        
        this.height = GAME_CONFIG.PLAYER.HEIGHT || 1.8;
        this.radius = GAME_CONFIG.PLAYER.RADIUS || 0.35;
        
        this.footstepCallback = null;
        this.animEventTriggered = { step: false };
    }

    async load(url = '/assets/models/player-avatar.glb') {
        const loader = new GLTFLoader();
        
        try {
            const gltf = await loader.loadAsync(url);
            this.mesh = gltf.scene;
            
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this._setupAnimations(gltf.animations);
            
            this.mesh.position.set(0, 5, 0);
            console.log('[Player] Model loaded successfully');
            
            return this;
        } catch (error) {
            console.warn('[Player] Failed to load model, using fallback:', error.message);
            return this._createFallbackModel();
        }
    }

    _setupAnimations(animations) {
        if (!animations || animations.length === 0) {
            console.warn('[Player] No animations found');
            return;
        }

        this.mixer = new THREE.AnimationMixer(this.mesh);

        const animationMap = {
            'Idle': 'idle',
            'Walk': 'walk',
            'Run': 'run',
            'Jump': 'jump',
        };

        animations.forEach((clip) => {
            const name = animationMap[clip.name] || clip.name.toLowerCase();
            const action = this.mixer.clipAction(clip);
            this.actions[name] = action;
            this.animationWeights[name] = 0;
        });

        this._crossfadeTo('idle');
    }

    _crossfadeTo(name, duration = 0.2) {
        if (!this.actions[name]) return;

        const newAction = this.actions[name];
        const oldAction = this.currentAction;

        if (oldAction === newAction) return;

        newAction.reset();
        newAction.setEffectiveTimeScale(1);
        newAction.setEffectiveWeight(1);
        newAction.play();

        if (oldAction) {
            oldAction.crossFadeTo(newAction, duration, true);
        }

        this.currentAction = newAction;
    }

    setAnimation(name) {
        if (this.currentAction?.name?.toLowerCase().includes(name)) return;
        this._crossfadeTo(name);
    }

    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        const speed = this.velocity.length();
        const isMoving = speed > 0.1;

        if (this.isGrounded) {
            if (isMoving) {
                if (speed > GAME_CONFIG.PLAYER.RUN_SPEED * 0.7) {
                    this.setAnimation('run');
                    this._checkFootstep(0.3);
                } else {
                    this.setAnimation('walk');
                    this._checkFootstep(0.4);
                }
            } else {
                this.setAnimation('idle');
            }
        } else {
            this.setAnimation('jump');
        }
    }

    _checkFootstep(interval) {
        const now = Date.now() / 1000;
        if (now - this._lastStepTime > interval) {
            this._lastStepTime = now;
            if (this.footstepCallback) {
                this.footstepCallback();
            }
        }
    }

    setFootstepCallback(callback) {
        this.footstepCallback = callback;
    }

    _createFallbackModel() {
        const group = new THREE.Group();

        const bodyGeom = new THREE.CapsuleGeometry(this.radius, this.height - this.radius * 2, 4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = this.height / 2;
        body.castShadow = true;
        group.add(body);

        const headGeom = new THREE.SphereGeometry(0.2, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = this.height + 0.1;
        head.castShadow = true;
        group.add(head);

        this.mesh = group;
        this.mesh.position.set(0, 5, 0);

        console.log('[Player] Fallback model created');
        return this;
    }

    getPosition() {
        return this.mesh?.position || new THREE.Vector3(0, 5, 0);
    }

    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
    }

    getCameraTarget() {
        if (!this.mesh) return new THREE.Vector3(0, 1.6, 0);
        return this.mesh.position.clone().add(new THREE.Vector3(0, this.height * 0.9, 0));
    }
}
