/**
 * Main Entry Point
 * Vertical Slice Foundation - Clean, Minimal, Playable
 */

import * as THREE from 'three';
import { GAME_CONFIG, GRAPHICS_CONFIG } from './config.js';

import { InputManager } from './InputManager.js';
import { SceneManager } from './SceneManager.js';
import { PhysicsManager } from './PhysicsManager.js';
import { AudioManager } from './AudioManager.js';
import { createTerrain } from './TerrainGenerator.js';
import { Player } from './Player.js';
import { PlayerController } from './PlayerController.js';

const GameState = {
    isRunning: false,
    isPaused: false,
    isLoading: true,
    player: {
        health: GAME_CONFIG.PLAYER.MAX_HEALTH,
    },
};

let sceneManager = null;
let inputManager = null;
let physicsManager = null;
let audioManager = null;
let player = null;
let playerController = null;

let lastTime = 0;
let frameCount = 0;
let fpsUpdateTime = 0;
let currentFps = 60;

const fpsCounter = {
    element: null,
    update(deltaTime) {
        frameCount++;
        fpsUpdateTime += deltaTime;
        if (fpsUpdateTime >= 0.5) {
            currentFps = Math.round(frameCount / fpsUpdateTime);
            frameCount = 0;
            fpsUpdateTime = 0;
            if (this.element) {
                this.element.textContent = `${currentFps} FPS`;
            }
        }
    },
};

async function init() {
    console.log('[Main] Starting vertical slice initialization...');

    sceneManager = new SceneManager();
    await sceneManager.init();

    inputManager = new InputManager();
    console.log('[Main] InputManager initialized');

    physicsManager = new PhysicsManager();
    await physicsManager.init();
    physicsManager.createPlayerCapsule();
    console.log('[Main] PhysicsManager initialized');

    audioManager = new AudioManager();
    await audioManager.init();
    console.log('[Main] AudioManager initialized');

    const terrain = createTerrain(sceneManager.scene, physicsManager.getWorld());
    sceneManager.scene.add(terrain.mesh);
    console.log('[Main] TerrainGenerator initialized');

    player = new Player();
    await player.load('/assets/models/player-avatar.glb');
    sceneManager.scene.add(player.mesh);
    console.log('[Main] Player initialized');

    playerController = new PlayerController(player, inputManager);
    player.setFootstepCallback(() => audioManager.playFootstep());
    console.log('[Main] PlayerController initialized');

    inputManager.on('pause', togglePause);

    document.getElementById('loadingScreen').classList.add('hidden');
    fpsCounter.element = document.getElementById('fpsCounter');
    
    GameState.isLoading = false;
    GameState.isRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    
    console.log('[Main] ✅ Vertical slice initialized successfully!');
}

function gameLoop(currentTime) {
    if (!GameState.isRunning) return;

    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    update(deltaTime);
    render();
    
    fpsCounter.update(deltaTime);

    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    if (GameState.isPaused) return;

    inputManager.update(deltaTime);
    playerController.update(deltaTime, terrain);
    physicsManager.update(deltaTime);
    audioManager.update(deltaTime);

    _updateCamera(deltaTime);
}

function _updateCamera(deltaTime) {
    if (!sceneManager?.camera || !player) return;

    const camera = sceneManager.camera;
    const playerPos = player.getPosition();
    
    const cameraAngle = playerController?.getRotation() || 0;
    const distance = 5;
    const heightOffset = 2;

    const targetX = playerPos.x - Math.sin(cameraAngle) * distance;
    const targetZ = playerPos.z - Math.cos(cameraAngle) * distance;
    const targetY = playerPos.y + heightOffset;

    camera.position.x += (targetX - camera.position.x) * 0.1;
    camera.position.y += (targetY - camera.position.y) * 0.1;
    camera.position.z += (targetZ - camera.position.z) * 0.1;

    const lookTarget = player.getCameraTarget();
    camera.lookAt(lookTarget);
}

function render() {
    if (sceneManager) {
        sceneManager.render();
    }
}

function togglePause() {
    GameState.isPaused = !GameState.isPaused;
    const pauseMenu = document.getElementById('pauseMenu');
    
    if (GameState.isPaused) {
        pauseMenu.classList.remove('hidden');
    } else {
        pauseMenu.classList.add('hidden');
    }
}

function onWindowResize() {
    if (sceneManager) {
        sceneManager.onResize();
    }
}

window.addEventListener('resize', onWindowResize);

init().catch((error) => {
    console.error('[Main] Failed to initialize:', error);
});

export { GameState };
