/**
 * Buildings with InstancedMesh for optimal performance + LOD system
 */

import * as THREE from 'three';
import { GRAPHICS_PRESETS } from './config.js';
import { toonGradient } from './world.js';

function createBuildingTexture({
    width = 128,
    height = 256,
    baseColor = '#6e6e6e',
    windowColor = '#d6f0ff',
} = {}) {
    if (typeof document === 'undefined') {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle vertical variation
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 1600; i++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
    ctx.globalAlpha = 1;

    const paddingX = 10;
    const paddingY = 12;
    const windowW = 10;
    const windowH = 14;
    const gapX = 10;
    const gapY = 18;

    for (let y = paddingY; y < height - paddingY; y += gapY) {
        for (let x = paddingX; x < width - paddingX; x += gapX) {
            const lit = Math.random() > 0.35;
            ctx.fillStyle = lit ? windowColor : '#2b2b2b';
            ctx.fillRect(x, y, windowW, windowH);
            
            // Add glow to lit windows
            if (lit) {
                ctx.shadowBlur = 6;
                ctx.shadowColor = windowColor;
                ctx.fillStyle = windowColor;
                ctx.fillRect(x, y, windowW, windowH);
                ctx.shadowBlur = 0;
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
}

function createEmissiveWindowTexture({
    width = 128,
    height = 256,
    windowColor = '#ffff00',
} = {}) {
    if (typeof document === 'undefined') {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    
    // Black background (no emission by default)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const paddingX = 10;
    const paddingY = 12;
    const windowW = 10;
    const windowH = 14;
    const gapX = 10;
    const gapY = 18;

    // Only draw lit windows (for emissive map)
    for (let y = paddingY; y < height - paddingY; y += gapY) {
        for (let x = paddingX; x < width - paddingX; x += gapX) {
            const lit = Math.random() > 0.35;
            if (lit) {
                ctx.fillStyle = windowColor;
                ctx.shadowBlur = 10;
                ctx.shadowColor = windowColor;
                ctx.fillRect(x, y, windowW, windowH);
                ctx.shadowBlur = 0;
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
}

// LOD Geometries: High, Medium, Low detail
function createLODGeometries() {
    return {
        high: new THREE.BoxGeometry(1, 1, 1, 4, 8, 4),   // Detailed segments
        medium: new THREE.BoxGeometry(1, 1, 1, 2, 4, 2), // Medium segments
        low: new THREE.BoxGeometry(1, 1, 1, 1, 1, 1),    // Simple box
    };
}

// Building data structure
class BuildingData {
    constructor(x, y, z, width, height, depth) {
        this.position = new THREE.Vector3(x, y, z);
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.matrix = new THREE.Matrix4();
        
        // Compute matrix for instancing
        this.matrix.makeScale(width, height, depth);
        this.matrix.setPosition(x, y + height / 2, z);
        
        // For collision detection
        this.box = new THREE.Box3(
            new THREE.Vector3(x - width / 2, 0, z - depth / 2),
            new THREE.Vector3(x + width / 2, height, z + depth / 2)
        );
    }
    
    getDistanceToPoint(point) {
        return this.position.distanceTo(point);
    }
}

export function createBuildings({
    mapSize = 600,
    count = 40,
    margin = 25,
} = {}) {
    const group = new THREE.Group();
    group.name = 'Buildings';
    
    const texture = createBuildingTexture();
    if (texture) {
        texture.repeat.set(1, 1);
    }
    
    const emissiveTexture = createEmissiveWindowTexture();
    if (emissiveTexture) {
        emissiveTexture.repeat.set(1, 1);
    }
    
    const sharedMaterial = new THREE.MeshStandardMaterial({
        color: GRAPHICS_PRESETS.FLAT_COLORS.BUILDING,
        map: texture || null,
        emissive: 0xffdd88,
        emissiveMap: emissiveTexture || null,
        emissiveIntensity: 1.2,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide,
    });
    
    // Create LOD geometries
    const lodGeometries = createLODGeometries();
    
    // Create InstancedMeshes for each LOD level
    const maxInstances = 50; // Max buildings we might ever have
    const instancedMeshes = {
        high: new THREE.InstancedMesh(lodGeometries.high, sharedMaterial, maxInstances),
        medium: new THREE.InstancedMesh(lodGeometries.medium, sharedMaterial, maxInstances),
        low: new THREE.InstancedMesh(lodGeometries.low, sharedMaterial, maxInstances),
    };

    // Outline Material
    const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
    });

    // Outline Geometries (scaled 1.05)
    const outlineGeometries = {
        high: lodGeometries.high.clone().scale(1.05, 1.05, 1.05),
        medium: lodGeometries.medium.clone().scale(1.05, 1.05, 1.05),
    };

    const outlineMeshes = {
        high: new THREE.InstancedMesh(outlineGeometries.high, outlineMaterial, maxInstances),
        medium: new THREE.InstancedMesh(outlineGeometries.medium, outlineMaterial, maxInstances),
    };
    
    // Setup shadow casting
    instancedMeshes.high.castShadow = true;
    instancedMeshes.high.receiveShadow = true;
    instancedMeshes.medium.castShadow = true;
    instancedMeshes.medium.receiveShadow = true;
    instancedMeshes.low.castShadow = false; // Far buildings don't need shadows
    instancedMeshes.low.receiveShadow = false;
    
    // Initially hide all instances
    instancedMeshes.high.count = 0;
    instancedMeshes.medium.count = 0;
    instancedMeshes.low.count = 0;
    outlineMeshes.high.count = 0;
    outlineMeshes.medium.count = 0;
    
    // Add to group
    group.add(instancedMeshes.high);
    group.add(instancedMeshes.medium);
    group.add(instancedMeshes.low);
    group.add(outlineMeshes.high);
    group.add(outlineMeshes.medium);
    
    const half = mapSize / 2 - margin;
    let buildingsData = [];
    
    function generateBuildings(targetCount) {
        buildingsData = [];
        
        // Generate building data
        for (let i = 0; i < targetCount; i++) {
            const width = THREE.MathUtils.randFloat(6, 18);
            const depth = THREE.MathUtils.randFloat(6, 18);
            const height = THREE.MathUtils.randFloat(10, 55);
            
            const x = THREE.MathUtils.randFloat(-half, half);
            const z = THREE.MathUtils.randFloat(-half, half);
            
            // Keep a small open area near the center for player spawn
            const centerClearRadius = 22;
            if (Math.hypot(x, z) < centerClearRadius) {
                i--;
                continue;
            }
            
            buildingsData.push(new BuildingData(x, 0, z, width, height, depth));
        }
        
        // Initial LOD update will set up instances
        return buildingsData;
    }
    
    // Generate initial buildings
    generateBuildings(count);
    
    // Update LOD based on camera position
    function updateLOD(cameraPosition, preset) {
        if (!preset) return;
        
        const lodNear = preset.lodNear || 30;
        const lodMedium = preset.lodMedium || 80;
        const lodFar = preset.lodFar || 180;
        const cullingDistance = preset.frustumCullingDistance || 250;
        
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;
        
        // Sort buildings by LOD level and update matrices
        for (let i = 0; i < buildingsData.length; i++) {
            const building = buildingsData[i];
            const distance = building.getDistanceToPoint(cameraPosition);
            
            // Frustum culling - skip buildings too far away
            if (distance > cullingDistance) {
                continue;
            }
            
            // Assign to appropriate LOD level
            if (distance < lodNear) {
                instancedMeshes.high.setMatrixAt(highCount, building.matrix);
                outlineMeshes.high.setMatrixAt(highCount, building.matrix);
                highCount++;
            } else if (distance < lodMedium) {
                instancedMeshes.medium.setMatrixAt(mediumCount, building.matrix);
                outlineMeshes.medium.setMatrixAt(mediumCount, building.matrix);
                mediumCount++;
            } else if (distance < lodFar) {
                instancedMeshes.low.setMatrixAt(lowCount, building.matrix);
                lowCount++;
            }
            // Beyond lodFar but within culling distance: use low LOD
            else {
                instancedMeshes.low.setMatrixAt(lowCount, building.matrix);
                lowCount++;
            }
        }
        
        // Update instance counts
        instancedMeshes.high.count = highCount;
        instancedMeshes.medium.count = mediumCount;
        instancedMeshes.low.count = lowCount;
        outlineMeshes.high.count = highCount;
        outlineMeshes.medium.count = mediumCount;
        
        // Mark matrices as needing update
        if (highCount > 0) {
            instancedMeshes.high.instanceMatrix.needsUpdate = true;
            outlineMeshes.high.instanceMatrix.needsUpdate = true;
        }
        if (mediumCount > 0) {
            instancedMeshes.medium.instanceMatrix.needsUpdate = true;
            outlineMeshes.medium.instanceMatrix.needsUpdate = true;
        }
        if (lowCount > 0) instancedMeshes.low.instanceMatrix.needsUpdate = true;
    }
    
    // Collision detection
    function sphereIntersectsBuildings(position, radius) {
        for (const building of buildingsData) {
            if (building.box.distanceToPoint(position) <= radius) {
                return true;
            }
        }
        return false;
    }
    
    // Get colliders for backwards compatibility
    function getColliders() {
        return buildingsData.map(building => ({
            box: building.box,
            mesh: null, // No individual mesh anymore
        }));
    }
    
    // Regenerate buildings with new count
    function regenerateBuildings(newCount) {
        generateBuildings(newCount);
        return getColliders();
    }
    
    // Dispose resources
    function dispose() {
        lodGeometries.high.dispose();
        lodGeometries.medium.dispose();
        lodGeometries.low.dispose();
        outlineGeometries.high.dispose();
        outlineGeometries.medium.dispose();
        sharedMaterial.dispose();
        outlineMaterial.dispose();
        if (texture) texture.dispose();
    }
    
    return {
        group,
        colliders: getColliders(),
        updateColliders: () => {}, // No-op for instanced meshes
        regenerateBuildings,
        updateLOD,
        sphereIntersectsBuildings,
        dispose,
        // Expose for stats/debugging
        getBuildingsCount: () => buildingsData.length,
        getInstancedMeshes: () => instancedMeshes,
    };
}

// Legacy collision functions for backwards compatibility
export function updateBuildingColliders(colliders) {
    // No-op for instanced meshes
}

export function sphereIntersectsColliders(position, radius, colliders) {
    for (const { box } of colliders) {
        if (box.distanceToPoint(position) <= radius) {
            return true;
        }
    }
    return false;
}
