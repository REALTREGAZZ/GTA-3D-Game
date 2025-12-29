/**
 * Three.js World Initialization
 * Core rendering primitives: scene, camera, renderer, and base lighting.
 */

import * as THREE from 'three';
import { GRAPHICS_CONFIG, GRAPHICS_PRESETS } from './config.js';

function createToonGradient() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#444'; ctx.fillRect(0,0,1,1);
    ctx.fillStyle = '#888'; ctx.fillRect(1,0,1,1);
    ctx.fillStyle = '#ccc'; ctx.fillRect(2,0,1,1);
    ctx.fillStyle = '#fff'; ctx.fillRect(3,0,1,1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
}

export const toonGradient = createToonGradient();

export function applyToonMaterial(mesh, colorName, outlineScale = 1.08) {
    if (!mesh) return;

    const color = GRAPHICS_PRESETS.FLAT_COLORS[colorName] || 0xffffff;

    // Create toon material with emissive support for panic/impact feedback
    const toonMaterial = new THREE.MeshToonMaterial({
        color: color,
        gradientMap: toonGradient,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
    });

    mesh.material = toonMaterial;

    // Add outline
    const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
    });

    const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
    outlineMesh.scale.set(outlineScale, outlineScale, outlineScale);
    mesh.add(outlineMesh);

    return toonMaterial;
}

export function createWorld({ canvas, autoResize = true } = {}) {
    const scene = new THREE.Scene();

    // Fog matches the neon world aesthetic - darker with slight blue tint
    const fogColor = 0x0a0a1a;
    scene.fog = new THREE.Fog(
        fogColor,
        GRAPHICS_CONFIG.VIEW_DISTANCE.FOG_NEAR,
        GRAPHICS_CONFIG.VIEW_DISTANCE.FOG_FAR,
    );

    const camera = new THREE.PerspectiveCamera(
        60,
        1,
        GRAPHICS_CONFIG.VIEW_DISTANCE.NEAR,
        GRAPHICS_CONFIG.VIEW_DISTANCE.FAR,
    );
    camera.position.set(45, 35, 45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: GRAPHICS_CONFIG.RENDERER.ANTIALIASING,
        alpha: false,
        powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(fogColor);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = GRAPHICS_CONFIG.RENDERER.SHADOWS_ENABLED;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Harder shadows look better with toon

    // EMERGENCY FIX #4: Increased ambient light to prevent darkness/visibility issues
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // White ambient light at 0.5 intensity
    scene.add(ambientLight);

    // EMERGENCY FIX #3: White directional light at 2.0 intensity for guaranteed visibility
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0); // White sun for maximum visibility
    sunLight.position.set(0, 100, 0); // Positioned overhead looking down
    sunLight.castShadow = true;

    const shadowMapSize = GRAPHICS_CONFIG.RENDERER.SHADOW_MAP_SIZE;
    sunLight.shadow.mapSize.set(2048, 2048); // Epic shadow quality
    sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);

    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 500;
    const d = 300; // Large shadow frustum for terrain (increased for overhead light)
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.normalBias = 0.02;
    sunLight.shadow.radius = 2;

    // Make sun light point downward
    sunLight.target.position.set(0, 0, 0);

    scene.add(sunLight);
    scene.add(sunLight.target);

    function resize(width = window.innerWidth, height = window.innerHeight) {
        renderer.setSize(width, height, true);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
    }

    resize();

    const onWindowResize = () => resize();
    if (autoResize) {
        window.addEventListener('resize', onWindowResize);
    }

    function dispose() {
        if (autoResize) {
            window.removeEventListener('resize', onWindowResize);
        }
        renderer.dispose();
    }

    function applyGraphicsSettings(preset) {
        if (!preset) return;

        // Update shadow map size
        if (sunLight.shadow && preset.shadowMapSize) {
            sunLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
            sunLight.shadow.map?.dispose();
            sunLight.shadow.map = null;
        }

        // Enable/disable shadows
        if (typeof preset.shadowsEnabled !== 'undefined') {
            renderer.shadowMap.enabled = preset.shadowsEnabled;
            sunLight.castShadow = preset.shadowsEnabled;
        }

        // Update fog based on render distance
        if (preset.renderDistance && scene.fog) {
            const fogNear = preset.renderDistance * 0.5;
            const fogFar = preset.renderDistance * 1.5;
            scene.fog.near = fogNear;
            scene.fog.far = fogFar;
        }

        // Update camera near/far clipping planes
        if (typeof preset.cameraNear !== 'undefined') {
            camera.near = preset.cameraNear;
        }
        if (typeof preset.cameraFar !== 'undefined') {
            camera.far = preset.cameraFar;
        }
        camera.updateProjectionMatrix();

        console.log(`Applied graphics settings for preset: ${preset.name}`);
    }

    function getRendererInfo() {
        return {
            triangles: renderer.info.render.triangles,
            drawCalls: renderer.info.render.calls,
            textures: renderer.info.memory.textures,
            geometries: renderer.info.memory.geometries,
            programs: renderer.info.programs?.length || 0,
        };
    }

    return {
        scene,
        camera,
        renderer,
        lights: {
            ambientLight,
            sunLight,
        },
        resize,
        dispose,
        applyGraphicsSettings,
        getRendererInfo,
    };
}
