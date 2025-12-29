import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './config.js';

export class TerrainImporter {
  constructor() {
    this.loader = new GLTFLoader();
    this.terrainMesh = null;
    this.collisionMesh = null;
  }

  async loadTerrain(path = '/assets/terrain/volcanic-highland.glb') {
    try {
      // Pre-flight check: verify file exists and get detailed diagnostics
      const fileCheck = await this._verifyTerrainFile(path);
      
      if (!fileCheck.exists) {
        console.warn(
          `[TerrainImporter] Terrain file not found: ${path}\n` +
          `  Status: ${fileCheck.status} ${fileCheck.statusText}\n` +
          `  ⚠️  Using fallback plane terrain instead.\n` +
          `  💡 To use a custom terrain:\n` +
          `     1. Place your GLB/GLTF file at: ${path}\n` +
          `     2. Or pass a different path to loadTerrain()\n` +
          `     3. Ensure the file is a valid GLTF/GLB format`
        );
        return this._returnFallback();
      }

      if (!fileCheck.validType) {
        console.warn(
          `[TerrainImporter] Invalid content type for terrain file: ${path}\n` +
          `  Expected: model/gltf-binary or model/gltf+json\n` +
          `  Received: ${fileCheck.contentType}\n` +
          `  ⚠️  Using fallback plane terrain instead.\n` +
          `  💡 Ensure the file is a valid GLB or GLTF file.`
        );
        return this._returnFallback();
      }

      // File exists and has valid type, proceed with loading
      console.log(`[TerrainImporter] Loading terrain from: ${path}`);
      const gltf = await this.loader.loadAsync(path);
      const terrain = gltf.scene;

      // Apply epic materials to terrain meshes
      terrain.traverse((node) => {
        if (!node?.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;

        // Create epic terrain material with textures
        const m = node.material;
        if (m) {
          // Apply MeshStandardMaterial with proper lighting reaction
          if (m.isMeshStandardMaterial) {
            m.roughness = 0.9;
            m.metalness = 0.1;
            m.envMapIntensity = 1.0;
          } else {
            // Convert to MeshStandardMaterial if not already
            const newMaterial = new THREE.MeshStandardMaterial({
              color: m.color || 0x8b7355,
              map: m.map || null,
              normalMap: m.normalMap || null,
              roughnessMap: m.roughnessMap || null,
              roughness: 0.9,
              metalness: 0.1,
              envMapIntensity: 1.0,
            });
            node.material = newMaterial;
          }
          m.needsUpdate = true;
        }
      });

      this.terrainMesh = terrain;
      console.log(`[TerrainImporter] ✓ Successfully loaded terrain with ${this._countMeshes(terrain)} meshes`);
      return terrain;
    } catch (err) {
      // Detailed error diagnostics
      const errorType = this._diagnoseError(err);
      
      console.error(
        `[TerrainImporter] Failed to load terrain: ${path}\n` +
        `  Error type: ${errorType.type}\n` +
        `  Message: ${err.message}\n` +
        `  ${errorType.advice}`
      );
      
      // Log full error stack for debugging
      console.error('[TerrainImporter] Full error details:', err);

      return this._returnFallback();
    }
  }

  /**
   * Verify terrain file exists and check its content type
   * @private
   */
  async _verifyTerrainFile(path) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      const contentType = response.headers.get('content-type') || '';
      
      const validTypes = [
        'model/gltf-binary',
        'model/gltf+json',
        'application/octet-stream', // Common for .glb files
        'application/json', // GLTF JSON files
      ];
      
      const isValidType = validTypes.some(type => contentType.includes(type));
      
      return {
        exists: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType,
        validType: response.ok && (isValidType || contentType === ''),
      };
    } catch (err) {
      // Network error or CORS issue
      return {
        exists: false,
        status: 0,
        statusText: 'Network Error',
        contentType: 'unknown',
        validType: false,
        networkError: true,
      };
    }
  }

  /**
   * Diagnose the type of error that occurred
   * @private
   */
  _diagnoseError(err) {
    const message = err.message?.toLowerCase() || '';
    const name = err.name?.toLowerCase() || '';

    // Check for common error patterns
    if (message.includes('404') || message.includes('not found')) {
      return {
        type: 'File Not Found (404)',
        advice: '💡 Place your terrain GLB file in /assets/terrain/ or update the path.',
      };
    }

    if (message.includes('json') || message.includes('parse') || message.includes('syntax')) {
      return {
        type: 'Invalid GLB/GLTF Format',
        advice: '💡 The file may be corrupted or not a valid GLTF/GLB file. Try re-exporting from your 3D software.',
      };
    }

    if (message.includes('network') || message.includes('fetch') || name.includes('network')) {
      return {
        type: 'Network Error',
        advice: '💡 Check your network connection or ensure the dev server is serving the assets correctly.',
      };
    }

    if (message.includes('cors')) {
      return {
        type: 'CORS Error',
        advice: '💡 Ensure your dev server has proper CORS headers configured for asset loading.',
      };
    }

    if (message.includes('buffer') || message.includes('memory')) {
      return {
        type: 'Memory/Buffer Error',
        advice: '💡 The file may be too large or corrupted. Try using a smaller/optimized GLB file.',
      };
    }

    // Generic error
    return {
      type: 'Unknown Error',
      advice: '💡 Check the console for more details. Ensure the file is a valid GLTF/GLB format.',
    };
  }

  /**
   * Count meshes in terrain for logging
   * @private
   */
  _countMeshes(terrain) {
    let count = 0;
    terrain.traverse((node) => {
      if (node?.isMesh) count++;
    });
    return count;
  }

  /**
   * Return fallback terrain with logging
   * @private
   */
  _returnFallback() {
    const terrainSize = GAME_CONFIG?.TERRAIN?.SIZE || 1000;
    console.log(`[TerrainImporter] ℹ️  Using fallback plane terrain (${terrainSize}x${terrainSize})`);
    const fallback = this.createFallbackTerrain();
    this.terrainMesh = fallback;
    return fallback;
  }

  createFallbackTerrain() {
    const terrainSize = GAME_CONFIG?.TERRAIN?.SIZE || 1000;
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 64, 64);
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

      // Set tiling
      [normalMap, aoMap].forEach(map => {
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(20, 20); // Tile 20 times across the 1000x1000 terrain
      });

      terrain.traverse((node) => {
        if (!node?.isMesh || !node.material) return;
        
        // Only apply tiled terrain maps to the main terrain mesh
        if (node.name === 'Terrain' || node.name.includes('terrain')) {
          node.material.normalMap = normalMap;
          node.material.aoMap = aoMap;
        }
        
        node.material.needsUpdate = true;
      });
    } catch (err) {
      console.warn('[TerrainImporter] Could not load texture maps:', err);
    }
  }
}
