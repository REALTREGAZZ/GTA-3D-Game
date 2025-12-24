/**
 * Main Entry Point
 * GTA 5 Style 3D Game
 */

import { GAME_CONFIG, DEBUG_CONFIG } from './config.js';

// ============================================
// GAME STATE
// ============================================
const GameState = {
    isRunning: false,
    isPaused: false,
    isLoading: true,
    
    // Player State
    player: {
        health: GAME_CONFIG.PLAYER.MAX_HEALTH,
        armor: GAME_CONFIG.PLAYER.MAX_ARMOR,
        stamina: GAME_CONFIG.PLAYER.MAX_STAMINA,
        money: 0,
        currentMission: 'Bienvenido a la ciudad',
        currentWeapon: 'Puños',
    },
    
    // World State
    world: {
        time: 12.0, // 12:00 PM
        weather: 'clear',
        location: 'City Center',
    },
};

// ============================================
// DOM ELEMENTS
// ============================================
const UI = {
    canvas: document.getElementById('gameCanvas'),
    hud: {
        healthBar: document.getElementById('healthBar'),
        healthValue: document.getElementById('healthValue'),
        armorBar: document.getElementById('armorBar'),
        armorValue: document.getElementById('armorValue'),
        moneyValue: document.getElementById('moneyValue'),
        missionName: document.getElementById('missionName'),
        gameTime: document.getElementById('gameTime'),
        weaponName: document.querySelector('.weapon-name'),
        ammoCount: document.querySelector('.ammo-count'),
    },
    menus: {
        pause: document.getElementById('pauseMenu'),
        loading: document.getElementById('loadingScreen'),
    },
    loading: {
        bar: document.getElementById('loadingBar'),
        text: document.getElementById('loadingText'),
    },
};

// ============================================
// GAME LOOP
// ============================================
let lastTime = 0;
let deltaTime = 0;

function gameLoop(currentTime) {
    if (!GameState.isRunning) return;
    
    // Calculate delta time
    deltaTime = Math.min((currentTime - lastTime) / 1000, GAME_CONFIG.MAX_DELTA_TIME);
    lastTime = currentTime;
    
    if (!GameState.isPaused) {
        update(deltaTime);
    }
    
    render();
    
    requestAnimationFrame(gameLoop);
}

// ============================================
// UPDATE FUNCTION
// ============================================
function update(dt) {
    // Update world time
    updateWorldTime(dt);
    
    // Update HUD
    updateHUD();
}

// ============================================
// RENDER FUNCTION
// ============================================
function render() {
    // Three.js rendering will be added here
    // For now, the canvas is managed by the CSS
}

// ============================================
// WORLD TIME UPDATE
// ============================================
function updateWorldTime(dt) {
    const timeIncrement = (dt * 24) / (GAME_CONFIG.WORLD.DAY_LENGTH * 60);
    GameState.world.time = (GameState.world.time + timeIncrement) % 24;
    
    // Update time display
    const hours = Math.floor(GameState.world.time);
    const minutes = Math.floor((GameState.world.time % 1) * 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    UI.hud.gameTime.textContent = timeString;
}

// ============================================
// HUD UPDATE
// ============================================
function updateHUD() {
    // Update health bar
    const healthPercent = (GameState.player.health / GAME_CONFIG.PLAYER.MAX_HEALTH) * 100;
    UI.hud.healthBar.style.width = `${healthPercent}%`;
    UI.hud.healthValue.textContent = Math.round(GameState.player.health);
    
    // Update armor bar
    const armorPercent = (GameState.player.armor / GAME_CONFIG.PLAYER.MAX_ARMOR) * 100;
    UI.hud.armorBar.style.width = `${armorPercent}%`;
    UI.hud.armorValue.textContent = Math.round(GameState.player.armor);
    
    // Update money
    UI.hud.moneyValue.textContent = GameState.player.money.toLocaleString();
    
    // Update mission
    UI.hud.missionName.textContent = GameState.player.currentMission;
}

// ============================================
// INPUT HANDLING
// ============================================
const Keys = {};
const Mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0 };

function setupInputHandlers() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
        Keys[e.code] = true;
        
        // Toggle pause
        if (e.code === 'Escape') {
            togglePause();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        Keys[e.code] = false;
    });
    
    // Mouse events
    window.addEventListener('mousemove', (e) => {
        Mouse.deltaX = e.movementX;
        Mouse.deltaY = e.movementY;
        Mouse.x = e.clientX;
        Mouse.y = e.clientY;
    });
    
    window.addEventListener('click', () => {
        // Pointer lock will be added when Three.js is integrated
    });
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

// ============================================
// WINDOW RESIZE
// ============================================
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    if (UI.canvas) {
        UI.canvas.width = width;
        UI.canvas.height = height;
    }
    
    // Three.js camera aspect ratio update will be added here
}

// ============================================
// PAUSE MENU
// ============================================
function togglePause() {
    GameState.isPaused = !GameState.isPaused;
    
    if (GameState.isPaused) {
        UI.menus.pause.classList.remove('hidden');
        setupPauseMenuHandlers();
    } else {
        UI.menus.pause.classList.add('hidden');
        removePauseMenuHandlers();
    }
}

function setupPauseMenuHandlers() {
    document.getElementById('resumeBtn').addEventListener('click', () => {
        togglePause();
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
        console.log('Settings menu not implemented yet');
    });
    
    document.getElementById('saveBtn').addEventListener('click', () => {
        console.log('Save game not implemented yet');
    });
    
    document.getElementById('loadBtn').addEventListener('click', () => {
        console.log('Load game not implemented yet');
    });
    
    document.getElementById('exitBtn').addEventListener('click', () => {
        console.log('Exit to main menu not implemented yet');
    });
}

function removePauseMenuHandlers() {
    const buttons = UI.menus.pause.querySelectorAll('.menu-button');
    buttons.forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
}

// ============================================
// LOADING SCREEN
// ============================================
async function loadGameAssets() {
    const loadSteps = [
        { text: 'Inicializando motor...', progress: 10 },
        { text: 'Cargando configuración...', progress: 20 },
        { text: 'Preparando mundo...', progress: 40 },
        { text: 'Cargando texturas...', progress: 60 },
        { text: 'Inicializando física...', progress: 80 },
        { text: 'Listo para jugar...', progress: 100 },
    ];
    
    for (const step of loadSteps) {
        UI.loading.text.textContent = step.text;
        UI.loading.bar.style.width = `${step.progress}%`;
        await simulateLoading(300);
    }
    
    GameState.isLoading = false;
    UI.menus.loading.classList.add('hidden');
    GameState.isRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function simulateLoading(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    console.log('Inicializando GTA 5 Style 3D Game...');
    
    // Setup canvas size
    onWindowResize();
    
    // Setup input handlers
    setupInputHandlers();
    
    // Load game assets
    await loadGameAssets();
    
    // Initialize debug mode if enabled
    if (DEBUG_CONFIG.ENABLED) {
        console.log('Debug mode enabled');
    }
    
    console.log('Juego inicializado correctamente');
}

// ============================================
// START THE GAME
// ============================================
init().catch(error => {
    console.error('Error al inicializar el juego:', error);
});

// ============================================
// EXPORT FOR OTHER MODULES
// ============================================
export { GameState, UI, Keys, Mouse };
