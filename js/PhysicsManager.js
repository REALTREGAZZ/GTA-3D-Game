/**
 * Physics Manager
 * Minimal Rapier physics world initialization
 */

import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsManager {
    constructor() {
        this.world = null;
        this.initialized = false;
    }

    async init() {
        await RAPIER.init();
        
        const gravity = { x: 0.0, y: -30.0, z: 0.0 };
        this.world = new RAPIER.World(gravity);
        
        this.initialized = true;
        console.log('[PhysicsManager] Rapier physics initialized');
        return this;
    }

    createGroundPlane(size, height = 0) {
        if (!this.world) return null;

        const groundDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(0, height, 0);
        const groundBody = this.world.createRigidBody(groundDesc);

        const groundColliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, 0.5, size / 2);
        this.world.createCollider(groundColliderDesc, groundBody);

        console.log(`[PhysicsManager] Ground plane created: ${size}x${size}`);
        return groundBody;
    }

    createPlayerCapsule(height = 1.8, radius = 0.35) {
        if (!this.world) return null;

        const halfHeight = (height - radius * 2) / 2;
        
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(0, 5, 0);
        const body = this.world.createRigidBody(bodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius);
        this.world.createCollider(colliderDesc, body);

        return body;
    }

    update(deltaTime) {
        if (!this.world) return;
        this.world.step();
    }

    getWorld() {
        return this.world;
    }
}
