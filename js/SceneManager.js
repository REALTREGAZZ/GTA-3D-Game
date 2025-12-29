/**
 * Scene Manager
 * Clean scene setup with lighting and fog
 */

import * as THREE from 'three';
import { GRAPHICS_CONFIG } from './config.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
    }

    async init(container) {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);

        this.renderer = new THREE.WebGLRenderer({
            canvas: container || document.getElementById('gameCanvas'),
            antialias: GRAPHICS_CONFIG.RENDERER.ANTIALIASING,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this._setupLighting();
        this._setupFog();

        window.addEventListener('resize', () => this.onResize());

        console.log('[SceneManager] Initialized');
        return this;
    }

    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x6BA3D4, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xFFB347, 1.5);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x0a0a1a, 0.4);
        this.scene.add(hemisphereLight);

        console.log('[SceneManager] Lighting setup complete');
    }

    _setupFog() {
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 300);
        this.scene.background = new THREE.Color(0x87CEEB);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getDelta() {
        return this.clock.getDelta();
    }

    getElapsedTime() {
        return this.clock.getElapsedTime();
    }
}
