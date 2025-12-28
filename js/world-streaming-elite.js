/**
 * World Streaming Elite
 * Chunk-based world loading with 5 distinct biomes
 */

import * as THREE from 'three';

// Simplex noise implementation for terrain generation
class SimplexNoise {
    constructor(seed = Math.random()) {
        this.p = new Uint8Array(256);
        this.perm = new Uint8Array(512);

        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }

        // Shuffle with seed
        let n = 256;
        while (n > 1) {
            const k = Math.floor((seed * n--) % n);
            [this.p[n], this.p[k]] = [this.p[k], this.p[n]];
        }

        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    noise2D(x, y) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;

        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);

        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        const ii = i & 255;
        const jj = j & 255;

        const grad = (hash, x, y) => {
            const h = hash & 7;
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
        };

        let n0 = 0, n1 = 0, n2 = 0;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            const gi0 = this.perm[ii + this.perm[jj]] % 12;
            t0 *= t0;
            n0 = t0 * t0 * grad(gi0, x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
            t1 *= t1;
            n1 = t1 * t1 * grad(gi1, x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
            t2 *= t2;
            n2 = t2 * t2 * grad(gi2, x2, y2);
        }

        return 70 * (n0 + n1 + n2);
    }
}

export const BIOME_CONFIG = {
    CHUNK_SIZE: 100,
    LOAD_DISTANCE: 300,
    UNLOAD_DISTANCE: 400,

    BIOMES: {
        HUB: {
            name: 'Central Hub',
            color: 0x888888,
            groundColor: 0x666666,
            buildingDensity: 0.8,
            buildingColor: 0x999999,
            hasTrees: false,
            hasLava: false,
            isElevated: true,
        },
        RUINS: {
            name: 'Ruins',
            color: 0x555555,
            groundColor: 0x444444,
            buildingDensity: 0.3,
            buildingColor: 0x666666,
            hasTrees: false,
            hasLava: false,
            isElevated: false,
        },
        FOREST: {
            name: 'Forest',
            color: 0x228B22,
            groundColor: 0x355E3B,
            buildingDensity: 0.1,
            buildingColor: 0x2F4F4F,
            hasTrees: true,
            hasLava: false,
            isElevated: false,
        },
        LAVA: {
            name: 'Lava Zone',
            color: 0xFF4500,
            groundColor: 0x8B0000,
            buildingDensity: 0.2,
            buildingColor: 0x2F4F4F,
            hasTrees: false,
            hasLava: true,
            isElevated: false,
        },
        TOWER: {
            name: 'Tower',
            color: 0x4A4A4A,
            groundColor: 0x3A3A3A,
            buildingDensity: 0.9,
            buildingColor: 0x708090,
            hasTrees: false,
            hasLava: false,
            isElevated: true,
        },
    },
};

export class WorldStreamingElite {
    constructor(scene, options = {}) {
        this.scene = scene;

        // Configuration
        this.chunkSize = options.chunkSize ?? BIOME_CONFIG.CHUNK_SIZE;
        this.loadDistance = options.loadDistance ?? BIOME_CONFIG.LOAD_DISTANCE;
        this.unloadDistance = options.unloadDistance ?? BIOME_CONFIG.UNLOAD_DISTANCE;

        // Chunk storage
        this.loadedChunks = new Map();
        this.chunkMeshes = new THREE.Group();
        this.scene.add(this.chunkMeshes);

        // Noise generator
        this.noise = new SimplexNoise(options.seed ?? 12345);

        // Building instancing
        this.buildingInstances = new Map();
        this.treeInstances = new Map();

        // State
        this.lastPlayerChunk = { x: 0, z: 0 };
        this.updateThrottle = 0.1; // seconds
        this.lastUpdateTime = 0;

        console.log('[WorldStreamingElite] Initialized');
    }

    /**
     * Get biome at world position
     */
    getBiomeAtPosition(x, z) {
        // Use distance from origin to determine biome rings
        const distance = Math.sqrt(x * x + z * z);

        if (distance < 150) return 'HUB';
        if (distance < 300) return 'RUINS';
        if (distance < 450) return 'FOREST';
        if (distance < 600) return 'LAVA';
        return 'TOWER';
    }

    /**
     * Get biome config
     */
    getBiomeConfig(biomeName) {
        return BIOME_CONFIG.BIOMES[biomeName];
    }

    /**
     * Get terrain height at position
     */
    getTerrainHeight(x, z) {
        const biome = this.getBiomeAtPosition(x, z);
        const biomeConfig = this.getBiomeConfig(biome);

        // Base height from biome
        let baseHeight = biomeConfig.isElevated ? 2.0 : 0.0;

        // Add noise variation
        const noiseValue = this.noise.noise2D(x * 0.01, z * 0.01);
        baseHeight += noiseValue * 3.0;

        // Special case: hub platform
        if (biome === 'HUB') {
            const hubDist = Math.sqrt(x * x + z * z);
            if (hubDist > 140) {
                // Smooth slope down at edges
                baseHeight *= Math.max(0, 1 - (hubDist - 140) / 10);
            }
        }

        return baseHeight;
    }

    /**
     * Update chunks based on player position
     */
    update(playerPosition, currentTime) {
        // Throttle updates
        if (currentTime - this.lastUpdateTime < this.updateThrottle) return;
        this.lastUpdateTime = currentTime;

        // Get current chunk
        const px = Math.floor(playerPosition.x / this.chunkSize);
        const pz = Math.floor(playerPosition.z / this.chunkSize);

        // Check if player moved to new chunk
        if (px === this.lastPlayerChunk.x && pz === this.lastPlayerChunk.z) return;

        this.lastPlayerChunk = { x: px, z: pz };

        // Calculate chunk range to load
        const loadRange = Math.ceil(this.loadDistance / this.chunkSize);
        const unloadRange = Math.ceil(this.unloadDistance / this.chunkSize);

        // Load nearby chunks
        for (let dx = -loadRange; dx <= loadRange; dx++) {
            for (let dz = -loadRange; dz <= loadRange; dz++) {
                const cx = px + dx;
                const cz = pz + dz;
                const key = `${cx}:${cz}`;

                if (!this.loadedChunks.has(key)) {
                    this.loadChunk(cx, cz);
                }
            }
        }

        // Unload far chunks
        for (const [key, chunk] of this.loadedChunks) {
            const [cx, cz] = key.split(':').map(Number);
            const dist = Math.sqrt((cx - px) ** 2 + (cz - pz) ** 2);

            if (dist > unloadRange) {
                this.unloadChunk(key);
            }
        }
    }

    /**
     * Load a chunk
     */
    loadChunk(cx, cz) {
        const key = `${cx}:${cz}`;
        const biome = this.getBiomeAtPosition(
            cx * this.chunkSize + this.chunkSize / 2,
            cz * this.chunkSize + this.chunkSize / 2
        );

        console.log(`[WorldStreamingElite] Loading chunk ${key} (${biome})`);

        // Create chunk geometry
        const chunkData = this.generateChunkGeometry(cx, cz, biome);

        // Add to scene
        this.chunkMeshes.add(chunkData.mesh);

        // Store chunk
        this.loadedChunks.set(key, {
            mesh: chunkData.mesh,
            biome,
            cx,
            cz,
        });
    }

    /**
     * Unload a chunk
     */
    unloadChunk(key) {
        const chunk = this.loadedChunks.get(key);
        if (!chunk) return;

        console.log(`[WorldStreamingElite] Unloading chunk ${key}`);

        // Remove from scene
        this.chunkMeshes.remove(chunk.mesh);

        // Dispose geometry and materials
        chunk.mesh.traverse((node) => {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach(m => m.dispose());
                } else {
                    node.material.dispose();
                }
            }
        });

        // Remove from loaded chunks
        this.loadedChunks.delete(key);
    }

    /**
     * Generate chunk geometry
     */
    generateChunkGeometry(cx, cz, biome) {
        const biomeConfig = this.getBiomeConfig(biome);
        const size = this.chunkSize;
        const segments = 16;

        // Ground plane
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        // Apply terrain height
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i) + cx * size;
            const z = positions.getZ(i) + cz * size;
            const y = this.getTerrainHeight(x, z);
            positions.setY(i, y);
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshToonMaterial({
            color: biomeConfig.groundColor,
            side: THREE.DoubleSide,
        });

        const ground = new THREE.Mesh(geometry, material);
        ground.position.set(cx * size + size / 2, 0, cz * size + size / 2);
        ground.castShadow = true;
        ground.receiveShadow = true;

        // Chunk group
        const chunkGroup = new THREE.Group();
        chunkGroup.add(ground);

        // Add features based on biome
        this.addChunkFeatures(chunkGroup, cx, cz, biome, biomeConfig);

        return {
            mesh: chunkGroup,
            biome,
        };
    }

    /**
     * Add features to chunk (buildings, trees, lava)
     */
    addChunkFeatures(chunkGroup, cx, cz, biome, biomeConfig) {
        const size = this.chunkSize;
        const featureCount = Math.floor(biomeConfig.buildingDensity * 20);

        for (let i = 0; i < featureCount; i++) {
            // Random position within chunk
            const localX = Math.random() * size - size / 2;
            const localZ = Math.random() * size - size / 2;
            const worldX = cx * size + size / 2 + localX;
            const worldZ = cz * size + size / 2 + localZ;

            // Skip center area in hub biome
            if (biome === 'HUB') {
                const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
                if (distFromCenter < 30) continue;
            }

            const groundY = this.getTerrainHeight(worldX, worldZ);

            // Add building
            const buildingHeight = 10 + Math.random() * 40;
            const building = this.createBuilding(buildingHeight, biomeConfig.buildingColor);
            building.position.set(localX, groundY + buildingHeight / 2, localZ);
            chunkGroup.add(building);

            // Add trees in forest
            if (biomeConfig.hasTrees && Math.random() < 0.5) {
                const tree = this.createTree();
                tree.position.set(
                    localX + (Math.random() - 0.5) * 20,
                    groundY,
                    localZ + (Math.random() - 0.5) * 20
                );
                chunkGroup.add(tree);
            }
        }

        // Add lava patches in lava biome
        if (biomeConfig.hasLava) {
            this.addLavaPatches(chunkGroup, cx, cz, biomeConfig);
        }
    }

    /**
     * Create a building
     */
    createBuilding(height, color) {
        const width = 5 + Math.random() * 10;
        const depth = 5 + Math.random() * 10;

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshToonMaterial({ color });

        const building = new THREE.Mesh(geometry, material);
        building.castShadow = true;
        building.receiveShadow = true;

        return building;
    }

    /**
     * Create a tree
     */
    createTree() {
        const group = new THREE.Group();

        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
        const trunkMaterial = new THREE.MeshToonMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage
        const foliageGeometry = new THREE.ConeGeometry(2, 5, 8);
        const foliageMaterial = new THREE.MeshToonMaterial({ color: 0x228B22 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 6;
        foliage.castShadow = true;
        group.add(foliage);

        return group;
    }

    /**
     * Add lava patches
     */
    addLavaPatches(chunkGroup, cx, cz, biomeConfig) {
        const patchCount = 3 + Math.floor(Math.random() * 5);

        for (let i = 0; i < patchCount; i++) {
            const size = 5 + Math.random() * 15;
            const geometry = new THREE.CircleGeometry(size / 2, 16);
            geometry.rotateX(-Math.PI / 2);

            const material = new THREE.MeshBasicMaterial({
                color: biomeConfig.color,
                emissive: biomeConfig.color,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.9,
            });

            const lava = new THREE.Mesh(geometry, material);
            lava.position.set(
                (Math.random() - 0.5) * this.chunkSize,
                0.1,
                (Math.random() - 0.5) * this.chunkSize
            );

            chunkGroup.add(lava);
        }
    }

    /**
     * Clear all chunks
     */
    clearAll() {
        for (const [key] of this.loadedChunks) {
            this.unloadChunk(key);
        }
    }

    /**
     * Get loaded chunks count
     */
    getLoadedChunkCount() {
        return this.loadedChunks.size;
    }
}

/**
 * Factory function to create elite world streaming system
 */
export function createWorldStreamingElite(scene, options = {}) {
    return new WorldStreamingElite(scene, options);
}
