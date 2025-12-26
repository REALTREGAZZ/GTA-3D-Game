/**
 * Terrain / ground mesh.
 */

import * as THREE from 'three';
import { GRAPHICS_PRESETS } from './config.js';
import { toonGradient } from './world.js';

function createCheckerTexture({
    size = 256,
    squares = 8,
    color1 = '#3f7f3f',
    color2 = '#2f6f2f',
} = {}) {
    if (typeof document === 'undefined') {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    const step = size / squares;

    for (let y = 0; y < squares; y++) {
        for (let x = 0; x < squares; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? color1 : color2;
            ctx.fillRect(x * step, y * step, step, step);
        }
    }

    // Light noise for variation
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 2000; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        ctx.fillRect(px, py, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
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

    const texture = createCheckerTexture();
    if (texture) {
        const repeat = size / 30;
        texture.repeat.set(repeat, repeat);
    }

    const material = new THREE.MeshToonMaterial({
        color: GRAPHICS_PRESETS.FLAT_COLORS.GROUND,
        gradientMap: toonGradient,
        map: texture || null,
        side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Terrain';
    mesh.receiveShadow = true;

    return {
        mesh,
        size,
    };
}
