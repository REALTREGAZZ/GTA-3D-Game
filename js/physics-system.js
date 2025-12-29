import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.world = null;
    this.bodies = [];
    this.colliders = [];

    this._terrainSource = null;
    this._terrainBodies = [];
    this._terrainColliders = [];

    this.gravity = options.gravity ?? { x: 0, y: -9.81, z: 0 };

    this.playerBody = null;
    this.playerController = null;
    this.playerObject = null;

    // For ground check raycast
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

    if (terrain === this._terrainSource && this._terrainColliders.length > 0) {
      return;
    }

    // Remove previously generated terrain colliders (e.g. when swapping placeholder terrain).
    if (this._terrainBodies.length > 0) {
      const oldColliders = this._terrainColliders;
      for (const body of this._terrainBodies) {
        try {
          this.world.removeRigidBody(body);
        } catch {
          // ignore
        }
      }
      this.colliders = this.colliders.filter((c) => !oldColliders.includes(c));
      this._terrainBodies = [];
      this._terrainColliders = [];
    }

    this._terrainSource = terrain;

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

      // Create static rigid body for terrain
      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const rigidBody = this.world.createRigidBody(rigidBodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.trimesh(worldVertices, indices);
      colliderDesc.setFriction(1.0);
      colliderDesc.setRestitution(0.0);

      const collider = this.world.createCollider(colliderDesc, rigidBody);
      this._terrainBodies.push(rigidBody);
      this._terrainColliders.push(collider);
      this.colliders.push(collider);
    }

    console.log('[PhysicsSystem] Terrain colliders created:', meshes.length);
  }

  /**
   * EMERGENCY FIX #2: Create a massive static box collider as safety ground plane
   * This prevents player from falling through terrain into infinite void
   */
  createGroundPlane(size = 2000, yPosition = -1) {
    if (!this.world) return;

    console.log('[PhysicsSystem] Creating emergency ground plane collider at y =', yPosition);

    // Create static rigid body for ground plane
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, yPosition, 0);

    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Create large box collider (size x 2 height x size)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, 1, size / 2);
    colliderDesc.setFriction(1.0);
    colliderDesc.setRestitution(0.0);

    const collider = this.world.createCollider(colliderDesc, rigidBody);
    
    // Track it separately from terrain colliders
    if (!this._groundPlaneBody) {
      this._groundPlaneBody = rigidBody;
      this._groundPlaneCollider = collider;
      this.colliders.push(collider);
    }

    console.log('[PhysicsSystem] Emergency ground plane created: size =', size, 'x', size, 'at y =', yPosition);
  }

  createPlayerCollider(playerObject) {
    if (!this.world || !playerObject) return null;

    if (this.playerBody && this.playerObject === playerObject) {
      return this.playerBody;
    }

    // Clean up previous player body/collider if we are recreating it.
    if (this.playerBody) {
      this.bodies = this.bodies.filter((entry) => entry?.body !== this.playerBody);
      try {
        this.world.removeRigidBody(this.playerBody);
      } catch {
        // ignore
      }
    }

    this.playerBody = null;
    this.playerCollider = null;
    this.playerController = null;

    this.playerObject = playerObject;

    // The player mesh is modeled with its origin at the feet. Rapier capsules are centered.
    const CAPSULE_RADIUS = 0.4;
    const CAPSULE_HEIGHT = 1.8;
    const CAPSULE_HALF_HEIGHT = (CAPSULE_HEIGHT / 2) - CAPSULE_RADIUS; // 0.5
    const PLAYER_CENTER_OFFSET_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS; // 0.9

    this.playerCenterOffsetY = PLAYER_CENTER_OFFSET_Y;
    this.playerBottomOffsetY = PLAYER_CENTER_OFFSET_Y;

    const pos = playerObject.position;

    // Rapier 0.12 (rapier3d-compat) does not support `kinematicCharacterBased()`.
    // Use a dynamic rigid-body for the player so gravity works and the controller can set linvel.
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y + PLAYER_CENTER_OFFSET_Y, pos.z)
      .lockRotations()
      .setLinearDamping(0.8)
      .setAngularDamping(1.0)
      .setCcdEnabled(true)
      .setCanSleep(false);

    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Capsule tuned for ~1.8m tall character
    const colliderDesc = RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS);
    colliderDesc.setFriction(0.0); // No friction for smooth character movement
    colliderDesc.setRestitution(0.0);
    colliderDesc.setMass(80.0);

    const collider = this.world.createCollider(colliderDesc, rigidBody);
    this.playerBody = rigidBody;
    this.playerCollider = collider;

    // Optional: create a character controller for future use (sliding / autostep).
    try {
      this.playerController = this.world.createCharacterController(0.1);
      this.playerController.setApplyImpulsesToDynamicBodies(false);
    } catch {
      this.playerController = null;
    }

    // Track player for sync
    this.bodies.push({
      body: rigidBody,
      object: playerObject,
      offset: { x: 0, y: -PLAYER_CENTER_OFFSET_Y, z: 0 },
    });

    console.log('[PhysicsSystem] Player body created - Capsule (halfHeight:', CAPSULE_HALF_HEIGHT, 'radius:', CAPSULE_RADIUS, ')');

    return rigidBody;
  }

  /**
   * Ground check using raycast from player feet
   * @param {THREE.Vector3} playerPosition - Current player position
   * @returns {boolean} - True if grounded
   */
  checkGround(playerPosition) {
    if (!this.world || !this.playerCollider || !playerPosition) return false;

    const feetPos = playerPosition.clone();

    // Raycast down from feet with small tolerance (0.1 units = millimeter precision)
    // Exclude the player collider so we don't detect ourselves.
    const rayOrigin = new RAPIER.Vector3(feetPos.x, feetPos.y + 0.02, feetPos.z);
    const rayDir = new RAPIER.Vector3(0, -1, 0);
    const ray = new RAPIER.Ray(rayOrigin, rayDir);

    const maxDist = 0.12;

    try {
      const hit = this.world.castRay(ray, maxDist, true, undefined, undefined, this.playerCollider);
      return !!hit;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get terrain height at given position using raycast
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @returns {number} - Height of terrain at position, or 0 if not found
   */
  getTerrainHeightAt(x, z) {
    if (!this.world) return 0;

    // Cast ray from high up downward.
    const rayOrigin = new RAPIER.Vector3(x, 500, z);
    const rayDir = new RAPIER.Vector3(0, -1, 0);
    const ray = new RAPIER.Ray(rayOrigin, rayDir);

    try {
      const hit = this.world.castRay(ray, 600, true, undefined, undefined, this.playerCollider);

      if (hit && hit.toi !== undefined) {
        return 500 - hit.toi;
      }
    } catch (e) {
      // Raycast failed
    }

    return 0;
  }

  syncPlayerKinematic() {
    if (!this.playerBody || !this.playerObject) return;
    const p = this.playerObject.position;
    this.playerBody.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
  }

  update(deltaTime) {
    if (!this.world) return;

    // Step physics world
    this.world.timestep = deltaTime;
    this.world.step();

    // Sync tracked dynamic bodies to their Three meshes
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
