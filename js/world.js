/**
 * Three.js World Initialization
 * Core rendering primitives: scene, camera, renderer, and base lighting.
 */

import * as THREE from 'three';
import { GRAPHICS_CONFIG } from './config.js';

export function createWorld({ canvas, autoResize = true } = {}) {
    const scene = new THREE.Scene();

    // Fog is optional but helps depth perception and hides far clipping.
    scene.fog = new THREE.Fog(
        0x87ceeb,
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = GRAPHICS_CONFIG.RENDERER.SHADOWS_ENABLED;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(50, 120, 30);
    sunLight.castShadow = true;

    const shadowMapSize = GRAPHICS_CONFIG.RENDERER.SHADOW_MAP_SIZE;
    sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);

    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 300;
    const d = 120;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.00015;

    scene.add(sunLight);
    scene.add(sunLight.target);

    function resize(width = window.innerWidth, height = window.innerHeight) {
        renderer.setSize(width, height, false);
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
