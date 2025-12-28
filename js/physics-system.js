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

    const pos = playerObject.position;

    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Capsule: halfHeight=0.9, radius=0.4 -> total height 1.8
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.9, 0.4);
    colliderDesc.setFriction(1.0);
    colliderDesc.setRestitution(0.0);

    this.world.createCollider(colliderDesc, rigidBody);
    this.playerBody = rigidBody;

    return rigidBody;
  }

  syncPlayerKinematic() {
    if (!this.playerBody || !this.playerObject) return;
    const p = this.playerObject.position;
    this.playerBody.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
  }

  update(deltaTime) {
    if (!this.world) return;

    // Keep player collider aligned to visual controller.
    this.syncPlayerKinematic();

    this.world.timestep = deltaTime;
    this.world.step();

    // Sync any tracked dynamic bodies to their Three meshes.
    for (const entry of this.bodies) {
      const { body, object } = entry;
      if (!body || !object) continue;

      const t = body.translation();
      const r = body.rotation();
      object.position.set(t.x, t.y, t.z);
      object.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}
