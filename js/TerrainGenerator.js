/**
 * Terrain Generator
 * Simple procedural terrain for vertical slice (200x200 units)
 */

import * as THREE from 'three';

export class TerrainGenerator {
    constructor() {
        this.size = 200;
        this.segments = 64;
        this.mesh = null;
    }

    generate() {
        const geometry = new THREE.PlaneGeometry(
            this.size,
            this.size,
            this.segments,
            this.segments
        );

        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            
            const height = this._getHeightAt(x, y);
            positions[i + 2] = height;
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x3D8C40,
            roughness: 0.8,
            metalness: 0.0,
            flatShading: false,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = false;

        console.log('[TerrainGenerator] Generated terrain:', this.size, 'x', this.size);
        return this.mesh;
    }

    _getHeightAt(x, z) {
        const scale = 0.03;
        const height1 = Math.sin(x * scale) * Math.cos(z * scale) * 2;
        const height2 = Math.sin(x * scale * 2.5 + 1) * Math.cos(z * scale * 2.5) * 0.5;
        return Math.max(0, height1 + height2);
    }

    getHeightAt(x, z) {
        if (!this.mesh) return 0;
        return this._getHeightAt(x, z);
    }
}
