/**
 * Terrain Generator
 * Simple procedural terrain for vertical slice (200x200 units)
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export function createTerrain(scene, physicsWorld) {
    // Create terrain mesh (visual)
    const terrainMesh = _createTerrainMesh();
    
    // Create static physics collider
    const rigidBody = _createStaticCollider(physicsWorld);
    
    // Setup lighting
    _setupLighting(scene);
    
    // Setup fog
    _setupFog(scene);
    
    return {
        mesh: terrainMesh,
        rigidBody: rigidBody,
        groundY: 0
    };
}

function _createTerrainMesh() {
    const size = 200;
    const segments = 30;
    
    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Generate height map with rolling hills
    const positions = geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Simple sine/cosine waves for rolling hills
        const height = Math.sin(x * 0.02) * 3 + Math.cos(z * 0.02) * 2;
        positions[i + 1] = height; // Set Y position
    }
    
    geometry.computeVertexNormals();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
        color: 0x3a8a3a, // Grass green
        roughness: 0.8,
        metalness: 0.0
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    mesh.position.set(0, 0, 0); // Center at origin
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    
    return mesh;
}

function _createStaticCollider(physicsWorld) {
    // Create static rigid body for ground
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, -1, 0); // Position below visual terrain
    
    const rigidBody = physicsWorld.createRigidBody(bodyDesc);
    
    // Create box collider (200x2x200 units)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(100, 1, 100); // half-extents
    physicsWorld.createCollider(colliderDesc, rigidBody);
    
    return rigidBody;
}

function _setupLighting(scene) {
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xFFFDD0, 2.0);
    directionalLight.position.set(150, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
    
    // Ambient light (sky fill)
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6);
    scene.add(ambientLight);
}

function _setupFog(scene) {
    // Fog for depth
    const fog = new THREE.Fog(0x87CEEB, 50, 300);
    scene.fog = fog;
}