import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class TerrainImporter {
  constructor() {
    this.loader = new GLTFLoader();
    this.terrainMesh = null;
    this.collisionMesh = null;
  }

  async loadTerrain(path = '/assets/terrain/volcanic-highland.glb') {
    try {
      const gltf = await this.loader.loadAsync(path);
      const terrain = gltf.scene;

      terrain.traverse((node) => {
        if (!node?.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;

        const m = node.material;
        if (m) {
          if ('roughness' in m) m.roughness = 0.8;
          if ('metalness' in m) m.metalness = 0.1;
          m.needsUpdate = true;
        }
      });

      this.terrainMesh = terrain;
      return terrain;
    } catch (err) {
      console.error('[TerrainImporter] Failed to load terrain:', err);
      const fallback = this.createFallbackTerrain();
      this.terrainMesh = fallback;
      return fallback;
    }
  }

  createFallbackTerrain() {
    const geometry = new THREE.PlaneGeometry(1000, 1000, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.0,
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    terrain.name = 'FallbackTerrain';

    return terrain;
  }

  async loadTexturesAndNormals(terrain) {
    const textureLoader = new THREE.TextureLoader();

    try {
      const [normalMap, aoMap] = await Promise.all([
        textureLoader.loadAsync('/assets/terrain/normal.png'),
        textureLoader.loadAsync('/assets/terrain/ao.png'),
      ]);

      terrain.traverse((node) => {
        if (!node?.isMesh || !node.material) return;
        node.material.normalMap = normalMap;
        node.material.aoMap = aoMap;
        node.material.needsUpdate = true;
      });
    } catch (err) {
      console.warn('[TerrainImporter] Could not load texture maps:', err);
    }
  }
}
