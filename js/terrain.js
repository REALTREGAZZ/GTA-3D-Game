/**
 * Terrain / ground mesh.
 */

import * as THREE from 'three';
import { GRAPHICS_PRESETS } from './config.js';
import { toonGradient } from './world.js';

function createNeonGridTexture({
    size = 512,
    gridSize = 32,
    lineWidth = 2,
    backgroundColor = '#0a0a1a',
    gridColor = '#00ffff',
} = {}) {
    if (typeof document === 'undefined') {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    
    // Dark background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);

    // Add subtle noise for depth
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#1a1a3a';
    for (let i = 0; i < 1500; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        ctx.fillRect(px, py, 1, 1);
    }
    ctx.globalAlpha = 1.0;

    // Draw neon grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = 8;
    ctx.shadowColor = gridColor;

    const step = size / gridSize;

    // Vertical lines
    for (let x = 0; x <= gridSize; x++) {
        const px = x * step;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, size);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridSize; y++) {
        const py = y * step;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(size, py);
        ctx.stroke();
    }

    // Add grid intersections with extra glow
    ctx.fillStyle = gridColor;
    ctx.shadowBlur = 12;
    for (let x = 0; x <= gridSize; x++) {
        for (let y = 0; y <= gridSize; y++) {
            const px = x * step;
            const py = y * step;
            ctx.beginPath();
            ctx.arc(px, py, lineWidth * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Keep anisotropy modest for performance.
    texture.anisotropy = 8;
    return texture;
}

export function createTerrain({
    size = 600,
    segments = 128,
    heightScale = 3.5,
} = {}) {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);

        // Cheap pseudo-topography: rolling hills + slight ripples
        const hills = Math.sin(x * 0.02) * Math.cos(y * 0.02);
        const ripples = Math.sin(x * 0.08) * 0.15 + Math.cos(y * 0.07) * 0.15;
        const height = (hills + ripples) * heightScale;

        position.setZ(i, height);
    }

    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;
    geometry.rotateX(-Math.PI / 2);

    const texture = createNeonGridTexture();
    if (texture) {
        const repeat = size / 40;
        texture.repeat.set(repeat, repeat);
    }

    const material = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        map: texture || null,
        emissive: 0x00ccff,
        emissiveMap: texture || null,
        emissiveIntensity: 0.25,
        roughness: 0.7,
        metalness: 0.3,
        side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Terrain';
    mesh.receiveShadow = true;

    // Fast analytical height sampling (avoids per-frame raycasts).
    // World space: after rotateX(-PI/2), original plane Y becomes -world Z.
    function getHeightAt(x, z) {
        const hills = Math.sin(x * 0.02) * Math.cos(z * 0.02);
        const ripples = Math.sin(x * 0.08) * 0.15 + Math.cos(z * 0.07) * 0.15;
        return (hills + ripples) * heightScale;
    }

    return {
        mesh,
        size,
        getHeightAt,
    };
}
