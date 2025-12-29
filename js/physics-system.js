import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.world = null;
    this.bodies = [];
    this.colliders = [];

    this.gravity = options.gravity ?? { x: 0, y: -9.81, z: 0 };

    this.playerBody = null;
    this.playerObject = null;

    this._tmpVec3 = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();

    this.ready = this.initPhysics();
  }

  async initPhysics() {
    console.log('[PhysicsSystem] Initializing Rapier physics engine');
    try {
      await RAPIER.init();
      this.world = new RAPIER.World(new RAPIER.Vector3(this.gravity.x, this.gravity.y, this.gravity.z));
      console.log('[PhysicsSystem] Rapier initialized');
    } catch (err) {
      console.warn('[PhysicsSystem] Failed to initialize Rapier (physics disabled):', err);
      this.world = null;
    }
  }

  createTerrainCollider(terrain) {
    if (!this.world || !terrain) return;

    const meshes = [];
    terrain.traverse((node) => {
      if (node?.isMesh && node.geometry?.attributes?.position) {
        meshes.push(node);
      }
    });

    for (const mesh of meshes) {
      mesh.updateWorldMatrix(true, false);

      const geometry = mesh.geometry;
      const posAttr = geometry.attributes.position;
      const indexAttr = geometry.index;

      const vertexCount = posAttr.count;
      const worldVertices = new Float32Array(vertexCount * 3);
      const m = mesh.matrixWorld;

      for (let i = 0; i < vertexCount; i++) {
        this._tmpVec3.fromBufferAttribute(posAttr, i).applyMatrix4(m);
        worldVertices[i * 3 + 0] = this._tmpVec3.x;
        worldVertices[i * 3 + 1] = this._tmpVec3.y;
        worldVertices[i * 3 + 2] = this._tmpVec3.z;
      }

      let indices;
      if (indexAttr) {
        indices = Uint32Array.from(indexAttr.array);
      } else {
        indices = new Uint32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) indices[i] = i;
      }

      const colliderDesc = RAPIER.ColliderDesc.trimesh(worldVertices, indices);
      colliderDesc.setFriction(1.0);
      colliderDesc.setRestitution(0.0);

      const collider = this.world.createCollider(colliderDesc);
      this.colliders.push(collider);
    }

    console.log('[PhysicsSystem] Terrain colliders created:', meshes.length);
  }

  createPlayerCollider(playerObject) {
    if (!this.world || !playerObject) return null;

    this.playerObject = playerObject;

    // The player mesh is modeled with its origin at the feet. Rapier capsules are centered.
    // Keep a constant offset so the capsule bottom sits at the player's feet.
    const CAPSULE_RADIUS = 0.4;
    const CAPSULE_HEIGHT = 1.8;
    const CAPSULE_HALF_HEIGHT = (CAPSULE_HEIGHT / 2) - CAPSULE_RADIUS; // 0.5
    const PLAYER_CENTER_OFFSET_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS; // 0.9

    this.playerCenterOffsetY = PLAYER_CENTER_OFFSET_Y;

    const pos = playerObject.position;

    // Create dynamic rigid body for player (not kinematic)
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y + PLAYER_CENTER_OFFSET_Y, pos.z);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Capsule tuned for ~1.8m tall character
    const colliderDesc = RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS);
    colliderDesc.setFriction(1.0);
    colliderDesc.setRestitution(0.0);
    colliderDesc.setMass(80.0); // Reasonable mass for a player character

    const collider = this.world.createCollider(colliderDesc, rigidBody);
    this.playerBody = rigidBody;
    this.playerCollider = collider;

    // Track player so the physics step can drive the visual object.
    this.bodies.push({
      body: rigidBody,
      object: playerObject,
      offset: { x: 0, y: -PLAYER_CENTER_OFFSET_Y, z: 0 },
    });

    // Disable automatic CCD (continuous collision detection) for better performance
    rigidBody.enableCcd(false);

    // Set linear damping to reduce sliding
    rigidBody.setLinearDamping(6.0);
    rigidBody.setAngularDamping(1.0);

    // Lock rotation to prevent player from tipping over
    rigidBody.setEnabledRotations(false, false, false);

    console.log('[PhysicsSystem] Player collider created - Capsule (halfHeight:', CAPSULE_HALF_HEIGHT, 'radius:', CAPSULE_RADIUS, ') at center Y:', pos.y + PLAYER_CENTER_OFFSET_Y);
    console.log('[PhysicsSystem] Linear damping:', 6.0, ', Rotations locked: true');

    return rigidBody;
  }

  syncPlayerKinematic() {
    if (!this.playerBody || !this.playerObject) return;
    const p = this.playerObject.position;
    this.playerBody.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
  }

  update(deltaTime) {
    if (!this.world) return;

    // DO NOT sync player kinematic - player body is DYNAMIC, not kinematic
    // Player controller will apply forces/velocities directly to the physics body

    this.world.timestep = deltaTime;
    this.world.step();

    // Sync any tracked dynamic bodies to their Three meshes.
    for (const entry of this.bodies) {
      const { body, object, offset } = entry;
      if (!body || !object) continue;

      const t = body.translation();
      const r = body.rotation();

      if (offset) {
        object.position.set(t.x + offset.x, t.y + offset.y, t.z + offset.z);
      } else {
        object.position.set(t.x, t.y, t.z);
      }
      object.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}
