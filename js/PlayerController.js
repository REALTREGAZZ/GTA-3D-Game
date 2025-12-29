/**
 * Player Controller
 * Kinematic player movement with ground detection
 */

import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';

export class PlayerController {
    constructor(player, inputManager) {
        this.player = player;
        this.input = inputManager;
        
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        this.isGrounded = false;
        
        this.gravity = GAME_CONFIG.PLAYER.GRAVITY || 30;
        this.walkSpeed = GAME_CONFIG.PLAYER.WALK_SPEED || 5;
        this.runSpeed = GAME_CONFIG.PLAYER.RUN_SPEED || 12;
        this.jumpForce = GAME_CONFIG.PLAYER.JUMP_FORCE || 15;
        this.jumpCooldown = 0;
        
        this._groundRaycaster = new THREE.Raycaster();
        this._groundDirection = new THREE.Vector3(0, -1, 0);
        
        this._tempVec = new THREE.Vector3();
        this._tempQuat = new THREE.Quaternion();
    }

    update(deltaTime, terrain) {
        this._updateMovement(deltaTime);
        this._updateGravity(deltaTime, terrain);
        this._applyMovement(deltaTime);
        
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }
    }

    _updateMovement(deltaTime) {
        const moveX = (this.input.getRight() ? 1 : 0) - (this.input.getLeft() ? 1 : 0);
        const moveZ = (this.input.getForward() ? 1 : 0) - (this.input.getBackward() ? 1 : 0);
        
        if (moveX === 0 && moveZ === 0) {
            this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, 10 * deltaTime);
            this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, 10 * deltaTime);
            this.isMoving = false;
            return;
        }

        this.isMoving = true;
        
        this._tempVec.set(moveX, 0, moveZ).normalize();
        
        const speed = this.input.getSprint() ? this.runSpeed : this.walkSpeed;
        
        this._tempVec.multiplyScalar(speed);
        
        const cameraDelta = this.input.getMouseDelta();
        if (cameraDelta.x !== 0) {
            this.rotation -= cameraDelta.x * 0.002;
        }
        
        this._tempVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        
        this.velocity.x = this._tempVec.x;
        this.velocity.z = this._tempVec.z;
    }

    _updateGravity(deltaTime, terrain) {
        if (this.isGrounded) {
            if (this.input.getJump() && this.jumpCooldown <= 0) {
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                this.jumpCooldown = 0.2;
            } else {
                this.velocity.y = Math.max(this.velocity.y - this.gravity * deltaTime * 2, -this.gravity * deltaTime);
            }
        } else {
            this.velocity.y -= this.gravity * deltaTime;
        }

        const groundY = terrain ? terrain.groundY : 0;
        const playerY = this.player.getPosition().y;
        const capsuleBottom = playerY;
        
        if (capsuleBottom <= groundY + 0.05) {
            this.velocity.y = Math.max(0, this.velocity.y);
            this.isGrounded = true;
            
            const player = this.player;
            if (player && player.setPosition) {
                player.setPosition(player.getPosition().x, groundY + player.height / 2, player.getPosition().z);
            }
        } else if (playerY < groundY - 1) {
            this.isGrounded = true;
            const player = this.player;
            if (player && player.setPosition) {
                player.setPosition(player.getPosition().x, groundY + player.height / 2, player.getPosition().z);
            }
        }
    }

    _applyMovement(deltaTime) {
        if (!this.player || !this.player.mesh) return;

        const pos = this.player.getPosition();
        pos.x += this.velocity.x * deltaTime;
        pos.y += this.velocity.y * deltaTime;
        pos.z += this.velocity.z * deltaTime;
        
        this.player.mesh.position.copy(pos);
        
        if (this.isMoving && (this.velocity.x !== 0 || this.velocity.z !== 0)) {
            this.player.mesh.rotation.y = Math.atan2(-this.velocity.x, -this.velocity.z);
        }
    }

    getRotation() {
        return this.rotation;
    }

    setRotation(angle) {
        this.rotation = angle;
    }
}
