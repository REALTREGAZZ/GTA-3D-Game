/**
 * Main Entry Point
 * GTA 5 Style 3D Game - EXAGGERATED COMBAT EDITION
 */

import * as THREE from 'three';

import {
    GAME_CONFIG,
    DEBUG_CONFIG,
    GRAPHICS_PRESETS,
    getActivePreset,
    saveGraphicsPreset,
    getPresetName,
    getLowerPreset,
    getHigherPreset,
    SATIRICAL_TEXTS
} from './config.js';

import { createWorld } from './world.js';
import { createTerrain } from './terrain.js';
import { createBuildings } from './buildings.js';
import { createSky } from './sky.js';
import { createPlayer } from './player.js';
import { createThirdPersonCamera } from './camera.js';
import { createAnimationController } from './animations.js';
import { createCombatSystem } from './combat-system.js';
import { createReplaySystem } from './replay-system.js';
import { createNPCSystem } from './npc-system.js';

// ============================================
// GAME STATE
// ============================================
const GameState = {
    isRunning: false,
    isPaused: false,
    isLoading: true,
    isReplaying: false,

    // Global simulation time multiplier (hitstop uses this)
    timeScale: 1.0,

    // Player State
    player: {
        health: GAME_CONFIG.PLAYER.MAX_HEALTH,
        armor: GAME_CONFIG.PLAYER.MAX_ARMOR,
        stamina: GAME_CONFIG.PLAYER.MAX_STAMINA,
        money: 0,
        currentMission: 'Bienvenido a la ciudad',
        currentWeapon: 'MELEE',
        lastDamageTime: 0,
    },

    // Combat Stats
    combat: {
        totalDamageDealt: 0,
        hitsConnected: 0,
        bestCombo: 0,
    },

    // World State
    world: {
        time: 12.0, // 12:00 PM
        weather: 'clear',
        location: 'City Center',
    },

    // Death callback for replay
    onDeath: null,
};

// ============================================
// HITSTOP + SCREEN SHAKE (VISUAL FEEDBACK)
// ============================================
const HitstopState = {
    freezeRemaining: 0,
    recoveryRemaining: 0,
};

const ScreenShakeState = {
    strength: 0,
    timeRemaining: 0,
    sampleTimer: 0,
    currentOffset: new THREE.Vector3(),
    targetOffset: new THREE.Vector3(),
};

// Overlay System for Satirical Texts
const OverlaySystem = {
    isShowing: false,
    currentText: '',
    duration: 0,
    timer: 0,
    
    show(text, duration = 3.0) {
        if (this.isShowing) return; // No superponer textos
        
        const element = document.getElementById('satiricalText');
        if (!element) return; // Safety check
        
        this.isShowing = true;
        this.currentText = text;
        this.duration = duration;
        this.timer = duration;
        
        element.textContent = text;
        
        // Resetear animación
        element.style.animation = 'none';
        setTimeout(() => {
            element.style.animation = `textOverlay ${duration}s ease-in-out forwards`;
        }, 10);
    },
    
    update(deltaTime) {
        if (this.isShowing) {
            this.timer -= deltaTime;
            if (this.timer <= 0) {
                this.isShowing = false;
            }
        }
    },
};

// Make OverlaySystem globally accessible for other modules
window.OverlaySystem = OverlaySystem;

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function applyHitstop(intensity = 1.0) {
    const i = clamp01(intensity);
    const baseDuration = GAME_CONFIG.COMBAT.HITSTOP_DURATION;

    const freezeDuration = baseDuration * (0.5 + 0.5 * i);

    HitstopState.freezeRemaining = Math.max(HitstopState.freezeRemaining, freezeDuration);
    HitstopState.recoveryRemaining = 0;
    GameState.timeScale = 0;
}

function updateHitstop(rawDt) {
    if (HitstopState.freezeRemaining > 0) {
        HitstopState.freezeRemaining = Math.max(0, HitstopState.freezeRemaining - rawDt);
        GameState.timeScale = 0;

        if (HitstopState.freezeRemaining <= 0) {
            HitstopState.recoveryRemaining = GAME_CONFIG.COMBAT.HITSTOP_RECOVERY_TIME;
        }

        return;
    }

    if (HitstopState.recoveryRemaining > 0) {
        HitstopState.recoveryRemaining = Math.max(0, HitstopState.recoveryRemaining - rawDt);

        const recoveryTime = Math.max(0.0001, GAME_CONFIG.COMBAT.HITSTOP_RECOVERY_TIME);
        const linearT = clamp01(1 - (HitstopState.recoveryRemaining / recoveryTime));
        GameState.timeScale = linearT * linearT;
        return;
    }

    GameState.timeScale = 1.0;
}

function applyScreenShake(intensity = 1.0, duration = null) {
    const i = clamp01(intensity);
    const addedStrength = i * GAME_CONFIG.COMBAT.SCREEN_SHAKE_INTENSITY;
    const addedDuration = Math.max(0, duration ?? GAME_CONFIG.COMBAT.SCREEN_SHAKE_DURATION);

    ScreenShakeState.strength += addedStrength;
    ScreenShakeState.timeRemaining += addedDuration;
    ScreenShakeState.sampleTimer = 0;
}

function updateScreenShake(rawDt) {
    const baseDuration = Math.max(0.0001, GAME_CONFIG.COMBAT.SCREEN_SHAKE_DURATION);

    const decay = GAME_CONFIG.COMBAT.SCREEN_SHAKE_DECAY;
    const frameDecay = Math.pow(decay, rawDt * 60);

    ScreenShakeState.strength *= frameDecay;
    ScreenShakeState.timeRemaining = Math.max(0, ScreenShakeState.timeRemaining - rawDt);

    const envelope = Math.min(1.0, ScreenShakeState.timeRemaining / baseDuration);
    const amp = ScreenShakeState.strength * envelope;

    if (amp <= 0) {
        ScreenShakeState.targetOffset.set(0, 0, 0);
    }

    const frequency = Math.max(0.01, GAME_CONFIG.COMBAT.SCREEN_SHAKE_FREQUENCY);
    const sampleInterval = 1 / frequency;

    ScreenShakeState.sampleTimer -= rawDt;
    if (ScreenShakeState.sampleTimer <= 0) {
        ScreenShakeState.sampleTimer = sampleInterval;

        if (amp > 0) {
            ScreenShakeState.targetOffset.set(
                (Math.random() - 0.5) * 2 * amp,
                (Math.random() - 0.5) * 2 * amp,
                (Math.random() - 0.5) * 2 * amp
            );
        } else {
            ScreenShakeState.targetOffset.set(0, 0, 0);
        }
    }

    const smoothingPerFrame = 0.35;
    const smoothing = 1 - Math.pow(1 - smoothingPerFrame, rawDt * 60);
    ScreenShakeState.currentOffset.lerp(ScreenShakeState.targetOffset, smoothing);

    if (ScreenShakeState.timeRemaining <= 0 && ScreenShakeState.currentOffset.lengthSq() < 1e-6) {
        ScreenShakeState.strength = 0;
        ScreenShakeState.currentOffset.set(0, 0, 0);
        ScreenShakeState.targetOffset.set(0, 0, 0);
        ScreenShakeState.sampleTimer = 0;
    }
}

GameState.applyHitstop = applyHitstop;
GameState.applyScreenShake = applyScreenShake;

// ============================================
// THREE.JS WORLD STATE
// ============================================
let World3D = null;
let Terrain = null;
let Buildings = null;
let Sky = null;
let Player = null;
let PlayerCamera = null;
let AnimationController = null;
let CombatSystem = null;
let ReplaySystem = null;
let NPCSystem = null;
let NPCPlayerProxy = null;

// ============================================
// COMBAT & REPLAY UI
// ============================================
const CombatUI = {
    screenFlash: null,
    weaponInfo: {
        name: null,
        ammo: null,
    },
};

// ============================================
// GRAPHICS STATE
// ============================================
const GraphicsState = {
    currentPreset: null,
    autoDowngradeEnabled: true,
    fpsHistory: [],
    maxFpsHistoryLength: 30,
    lowFpsCounter: 0,
    highFpsCounter: 0,
    lastFpsCheckTime: 0,
};

// ============================================
// DEBUG STATE
// ============================================
const DebugState = {
    enabled: false,
    updateInterval: 0.5, // Update every 0.5 seconds
    timeSinceLastUpdate: 0,
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
        targetDistance: document.createElement('div'),
    },
    menus: {
        pause: document.getElementById('pauseMenu'),
        loading: document.getElementById('loadingScreen'),
        graphics: document.getElementById('graphicsMenu'),
    },
    loading: {
        bar: document.getElementById('loadingBar'),
        text: document.getElementById('loadingText'),
    },
    settings: {
        fpsCounter: document.getElementById('fpsCounter'),
        fpsValue: document.getElementById('fpsValue'),
        presetButtons: null, // Will be populated later
        autoDowngradeToggle: document.getElementById('autoDowngradeToggle'),
        debugStatsToggle: document.getElementById('debugStatsToggle'),
    },
    debug: {
        panel: document.getElementById('debugStats'),
        triangles: document.getElementById('debugTriangles'),
        drawCalls: document.getElementById('debugDrawCalls'),
        textures: document.getElementById('debugTextures'),
        geometries: document.getElementById('debugGeometries'),
        buildings: document.getElementById('debugBuildings'),
        lodHigh: document.getElementById('debugLODHigh'),
        lodMedium: document.getElementById('debugLODMedium'),
        lodLow: document.getElementById('debugLODLow'),
    },
};

// ============================================
// THREE.JS INITIALIZATION
// ============================================
function initThreeWorld() {
    if (!UI.canvas) {
        throw new Error('No se encontró el canvas #gameCanvas');
    }

    // Load saved graphics preset
    GraphicsState.currentPreset = getActivePreset();

    World3D = createWorld({ canvas: UI.canvas, autoResize: true });

    Terrain = createTerrain({ size: 600 });
    World3D.scene.add(Terrain.mesh);

    Buildings = createBuildings({
        mapSize: Terrain.size,
        count: GraphicsState.currentPreset.buildingCount
    });
    World3D.scene.add(Buildings.group);

    Sky = createSky({
        scene: World3D.scene,
        sunLight: World3D.lights.sunLight,
        ambientLight: World3D.lights.ambientLight,
    });

    // Create player
    Player = createPlayer({ position: new THREE.Vector3(0, 5, 0) });
    World3D.scene.add(Player.mesh);

    // Create animation controller
    AnimationController = createAnimationController(Player);

    // Create third-person camera controller
    PlayerCamera = createThirdPersonCamera(World3D.camera, Player);
    PlayerCamera.enableMouseControl(UI.canvas);

    // Create NPC System
    NPCSystem = createNPCSystem({
        scene: World3D.scene,
        maxNPCs: GraphicsState.currentPreset.npcMaxCount || 25,
        spawnInterval: 12.0,
        detectionRadius: 20,
        attackPlayerRadius: 2.2,
        fleePlayerRadius: 4.0,
        mapSize: Terrain.size,
        buildings: Buildings,
        terrainHeightAt: getTerrainHeightAt,
    });

    // Initial spawn of NPCs
    const initialNPCCount = Math.floor((GraphicsState.currentPreset.npcMaxCount || 25) * 0.4);

    // Create combat system
    CombatUI.screenFlash = document.createElement('div');
    CombatUI.screenFlash.id = 'screenFlash';
    CombatUI.screenFlash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999;
        background: transparent;
        transition: background 0.1s;
    `;
    document.body.appendChild(CombatUI.screenFlash);

    // Get weapon UI elements
    CombatUI.weaponInfo.name = UI.hud.weaponName;
    CombatUI.weaponInfo.ammo = UI.hud.ammoCount;

    // Setup distance indicator
    UI.hud.targetDistance.id = 'targetDistance';
    UI.hud.targetDistance.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(20px, 20px);
        color: #ff4444;
        font-family: 'Arial', sans-serif;
        font-weight: bold;
        text-shadow: 2px 2px 0px #000;
        pointer-events: none;
        display: none;
        z-index: 1000;
    `;
    document.body.appendChild(UI.hud.targetDistance);

    // UI update functions
    const combatUI = {
        updateHealth: (health, maxHealth) => {
            const percent = (health / maxHealth) * 100;
            UI.hud.healthBar.style.width = `${percent}%`;
            UI.hud.healthValue.textContent = Math.round(health);
        },
        updateWeapon: (weapon) => {
            if (UI.hud.weaponName) {
                UI.hud.weaponName.textContent = weapon === 'MELEE' ? 'PUÑOS' : 'PISTOLA';
                UI.hud.weaponName.style.color = weapon === 'MELEE' ? '#ffcc00' : '#3498db';
            }
            if (UI.hud.ammoCount) {
                UI.hud.ammoCount.textContent = weapon === 'MELEE' ? '∞' : '∞';
            }
        },
        screenFlash: CombatUI.screenFlash,
    };

    // Player proxy used by NPC AI (so NPCs can find + damage player via CombatSystem)
    NPCPlayerProxy = {
        getPosition: () => Player.getPosition(),
        takeDamage: (amount, direction) => {
            if (CombatSystem?.damagePlayerFromNPC) {
                CombatSystem.damagePlayerFromNPC(amount, direction);
                return;
            }

            // Fallback - should rarely happen (only if NPC hits during init)
            GameState.player.health = Math.max(0, GameState.player.health - amount);
            combatUI.updateHealth(GameState.player.health, GAME_CONFIG.PLAYER.MAX_HEALTH);
        },
    };

    CombatSystem = createCombatSystem(Player, World3D.scene, PlayerCamera, GameState, combatUI, {
        npcSystem: NPCSystem,
        playerProxy: NPCPlayerProxy,
    });

    // Create replay system
    ReplaySystem = createReplaySystem(World3D.scene, World3D.camera, Player);

    // Set up death callback
    GameState.onDeath = (deathEvent) => {
        GameState.isReplaying = true;
        const stats = CombatSystem.getStats();
        ReplaySystem.startReplay(deathEvent, stats);
    };

    // Set up replay callbacks
    ReplaySystem.setOnStatsUpdate((stats) => {
        GameState.combat = stats;
    });

    ReplaySystem.setOnReplayEnd(() => {
        GameState.isReplaying = false;
        // Respawn player
        const spawnPos = new THREE.Vector3(0, 5, 0);
        Player.respawn(spawnPos);
        CombatSystem.reset();
    });

    // Now spawn initial NPCs after everything is initialized
    NPCSystem.spawn(null, initialNPCCount);

    Sky.update({ timeHours: GameState.world.time, camera: World3D.camera });

    // Apply initial graphics settings
    applyGraphicsPreset(GraphicsState.currentPreset, false);

    // Update weapon UI initially
    if (UI.hud.weaponName) {
        UI.hud.weaponName.textContent = 'PUÑOS';
        UI.hud.weaponName.style.color = '#ffcc00';
    }

    console.log('--- World Initialization Debug ---');
    console.log('World3D:', World3D);
    console.log('Terrain created:', Terrain?.mesh);
    console.log('Buildings created:', Buildings?.group);
    console.log('World renderer:', World3D?.renderer);
    console.log('Player:', Player);
    console.log('Camera:', World3D.camera);
    console.log('Camera Position:', World3D.camera.position);
    console.log('Scene:', World3D.scene);
    console.log('Scene children count:', World3D.scene?.children?.length);
    console.log('---------------------------------');
}

// ============================================
// GAME LOOP
// ============================================
let lastTime = 0;
let deltaTime = 0;

// ============================================
// TERRAIN HEIGHT SAMPLING
// ============================================
const GroundRaycaster = new THREE.Raycaster();
const GroundRayOrigin = new THREE.Vector3();
const GroundRayDirection = new THREE.Vector3(0, -1, 0);

function getTerrainHeightAt(x, z) {
    if (!Terrain?.mesh) return 0;

    GroundRayOrigin.set(x, 200, z);
    GroundRaycaster.set(GroundRayOrigin, GroundRayDirection);

    const hits = GroundRaycaster.intersectObject(Terrain.mesh, false);
    if (hits.length > 0) {
        return hits[0].point.y;
    }

    return 0;
}

function gameLoop(currentTime) {
    if (!GameState.isRunning) return;

    // Calculate delta time
    deltaTime = Math.min((currentTime - lastTime) / 1000, GAME_CONFIG.MAX_DELTA_TIME);
    lastTime = currentTime;

    // Update FPS counter
    updateFpsCounter(deltaTime);

    // Hitstop + shake updates are driven by *real* frame time (raw delta)
    updateHitstop(deltaTime);
    updateScreenShake(deltaTime);

    const scaledDeltaTime = deltaTime * GameState.timeScale;

    if (!GameState.isPaused) {
        update(scaledDeltaTime, deltaTime);

        // Check for auto-downgrade/upgrade every 2 seconds
        if (currentTime - GraphicsState.lastFpsCheckTime > 2000) {
            checkAutoAdjustQuality();
            GraphicsState.lastFpsCheckTime = currentTime;
        }
    }

    render();

    requestAnimationFrame(gameLoop);
}

// ============================================
// UPDATE FUNCTION
// ============================================
function update(dt, rawDt = dt) {
    let simDt = dt;

    // Update replay system (if active)
    if (GameState.isReplaying && ReplaySystem) {
        ReplaySystem.update(rawDt);
        // Still update camera during replay
        if (PlayerCamera) {
            PlayerCamera.update(rawDt, Mouse);
        }
        return;
    }

    // Combat can trigger hitstop mid-frame (e.g. bullet impacts). If that happens,
    // we recompute simDt so the rest of the simulation freezes immediately.
    if (CombatSystem) {
        CombatSystem.update(simDt);
        simDt = rawDt * GameState.timeScale;
    }

    // Update world time (scaled)
    updateWorldTime(simDt);

    // Update player (scaled)
    if (Player && Buildings && PlayerCamera) {
        // Get terrain height at player position
        const playerPos = Player.getPosition();
        const groundHeight = getTerrainHeightAt(playerPos.x, playerPos.z);
        Player.setColliders(Buildings.colliders);
        Player.update(simDt, Keys, Buildings.colliders, groundHeight, PlayerCamera.state.horizontalAngle);
    }

    // Update animations (scaled)
    if (AnimationController && Player) {
        AnimationController.update(simDt, Player.getState());
    }

    // Update camera (unscaled so input/camera remains responsive during hitstop)
    if (PlayerCamera && Player) {
        PlayerCamera.update(rawDt, Mouse);
    }

    // Update sky + lighting based on time of day
    if (Sky && World3D) {
        Sky.update({ timeHours: GameState.world.time, camera: World3D.camera });
    }

    // Update LOD system based on camera position
    if (Buildings && World3D && GraphicsState.currentPreset) {
        Buildings.updateLOD(World3D.camera.position, GraphicsState.currentPreset);
    }

    // Update NPC System (scaled)
    if (NPCSystem && Player) {
        NPCSystem.update(simDt, {
            player: NPCPlayerProxy,
            camera: World3D.camera,
            feedback: GameState,
        });
    }

    // Update debug stats
    if (DebugState.enabled) {
        DebugState.timeSinceLastUpdate += rawDt;
        if (DebugState.timeSinceLastUpdate >= DebugState.updateInterval) {
            updateDebugStats();
            DebugState.timeSinceLastUpdate = 0;
        }
    }

    // Update HUD
    updateHUD();
    
    // Update Overlay System
    OverlaySystem.update(rawDt);
    
    // Update overlay triggers
    updateOverlayTriggers();
};

// Function to update overlay triggers
function updateOverlayTriggers() {
    if (!NPCSystem || OverlaySystem.isShowing) return;
    
    const activeNpcs = NPCSystem.state.active;
    if (!activeNpcs || activeNpcs.length === 0) return;
    
    let ragdollCount = 0;
    let maxVelocity = 0;
    
    // Count ragdoll NPCs and find max velocity
    for (let npc of activeNpcs) {
        if (npc.state && npc.state.isRagdoll) {
            ragdollCount++;
        }
        const vel = npc.state?.velocity?.length() || 0;
        if (vel > maxVelocity) maxVelocity = vel;
    }
    
    // Show chaos text if 3+ NPCs in ragdoll
    if (ragdollCount >= 3) {
        const chaosText = SATIRICAL_TEXTS.CHAOS[
            Math.floor(Math.random() * SATIRICAL_TEXTS.CHAOS.length)
        ];
        OverlaySystem.show(chaosText, 2.5);
        return;
    }
    
    // Show high velocity text if any NPC is moving extremely fast
    if (maxVelocity > 20) {
        const velocityText = SATIRICAL_TEXTS.HIGH_VELOCITY[
            Math.floor(Math.random() * SATIRICAL_TEXTS.HIGH_VELOCITY.length)
        ];
        OverlaySystem.show(velocityText, 2.0);
    }
}

// ============================================
// RENDER FUNCTION
// ============================================
function render() {
    if (!World3D) return;

    const shakeOffset = ScreenShakeState.currentOffset;
    const hasShake = shakeOffset.lengthSq() > 0;

    if (hasShake) {
        World3D.camera.position.add(shakeOffset);
    }

    World3D.renderer.render(World3D.scene, World3D.camera);

    if (hasShake) {
        World3D.camera.position.sub(shakeOffset);
    }
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

    // Update target distance
    if (CombatSystem && CombatSystem.state && CombatSystem.state.currentTarget && Player) {
        const target = CombatSystem.state.currentTarget;
        const dist = target.mesh.position.distanceTo(Player.getPosition());
        UI.hud.targetDistance.textContent = `${dist.toFixed(1)}m`;
        UI.hud.targetDistance.style.display = 'block';
    } else {
        UI.hud.targetDistance.style.display = 'none';
    }
}

// ============================================
// DEBUG STATS UPDATE
// ============================================
function updateDebugStats() {
    if (!World3D || !Buildings) return;
    
    // Get renderer info
    const info = World3D.getRendererInfo();
    
    // Get building LOD counts
    const instancedMeshes = Buildings.getInstancedMeshes();
    const lodHigh = instancedMeshes.high.count;
    const lodMedium = instancedMeshes.medium.count;
    const lodLow = instancedMeshes.low.count;
    
    // Update UI
    UI.debug.triangles.textContent = info.triangles.toLocaleString();
    UI.debug.drawCalls.textContent = info.drawCalls;
    UI.debug.textures.textContent = info.textures;
    UI.debug.geometries.textContent = info.geometries;
    UI.debug.buildings.textContent = Buildings.getBuildingsCount();
    UI.debug.lodHigh.textContent = lodHigh;
    UI.debug.lodMedium.textContent = lodMedium;
    UI.debug.lodLow.textContent = lodLow;
}

function toggleDebugStats(enabled) {
    DebugState.enabled = enabled;
    if (enabled) {
        UI.debug.panel.classList.remove('hidden');
        updateDebugStats();
    } else {
        UI.debug.panel.classList.add('hidden');
    }
    localStorage.setItem('debugStats', enabled);
}

// ============================================
// FPS COUNTER
// ============================================
function updateFpsCounter(deltaTime) {
    if (deltaTime <= 0) return;

    const fps = 1 / deltaTime;

    // Add to history
    GraphicsState.fpsHistory.push(fps);
    if (GraphicsState.fpsHistory.length > GraphicsState.maxFpsHistoryLength) {
        GraphicsState.fpsHistory.shift();
    }

    // Calculate average FPS
    const avgFps = GraphicsState.fpsHistory.reduce((sum, f) => sum + f, 0) / GraphicsState.fpsHistory.length;

    // Update FPS counter display (try both fpsValue and fpsCounter elements)
    const fpsElement = UI.settings.fpsValue || UI.settings.fpsCounter || document.getElementById('fpsValue') || document.getElementById('fpsCounter');
    if (fpsElement) {
        fpsElement.textContent = `${Math.round(avgFps)} FPS`;
        
        // Update color based on FPS
        fpsElement.classList.remove('good', 'medium', 'bad');
        if (avgFps >= 60) {
            fpsElement.classList.add('good');
        } else if (avgFps >= 30) {
            fpsElement.classList.add('medium');
        } else {
            fpsElement.classList.add('bad');
        }
    }
}

function getAverageFps() {
    if (GraphicsState.fpsHistory.length === 0) return 60;
    return GraphicsState.fpsHistory.reduce((sum, f) => sum + f, 0) / GraphicsState.fpsHistory.length;
}

// ============================================
// AUTO QUALITY ADJUSTMENT
// ============================================
function checkAutoAdjustQuality() {
    if (!GraphicsState.autoDowngradeEnabled) return;
    
    const avgFps = getAverageFps();
    
    // Check for downgrade (FPS < 45)
    if (avgFps < 45) {
        GraphicsState.lowFpsCounter++;
        GraphicsState.highFpsCounter = 0;
        
        // Downgrade after 5 seconds (approximately 2-3 checks)
        if (GraphicsState.lowFpsCounter >= 3) {
            const lowerPreset = getLowerPreset(GraphicsState.currentPreset.name);
            if (lowerPreset) {
                console.log(`Auto-downgrading quality: FPS too low (${Math.round(avgFps)})`);
                applyGraphicsPreset(lowerPreset, true);
                showQualityNotification(`Bajando a calidad ${lowerPreset.name}...`);
            }
            GraphicsState.lowFpsCounter = 0;
        }
    }
    // Check for upgrade (FPS > 60)
    else if (avgFps > 60) {
        GraphicsState.highFpsCounter++;
        GraphicsState.lowFpsCounter = 0;
        
        // Upgrade after 10 seconds (approximately 5 checks)
        if (GraphicsState.highFpsCounter >= 5) {
            const higherPreset = getHigherPreset(GraphicsState.currentPreset.name);
            if (higherPreset && higherPreset.name !== 'ULTRA') {
                console.log(`Auto-upgrading quality: FPS stable (${Math.round(avgFps)})`);
                applyGraphicsPreset(higherPreset, true);
                showQualityNotification(`Subiendo a calidad ${higherPreset.name}...`);
            }
            GraphicsState.highFpsCounter = 0;
        }
    }
    // Reset counters if FPS is in acceptable range
    else {
        GraphicsState.lowFpsCounter = 0;
        GraphicsState.highFpsCounter = 0;
    }
}

function showQualityNotification(message) {
    console.log(message);
    // Could add a toast notification here in the future
}

// ============================================
// GRAPHICS PRESET APPLICATION
// ============================================
function applyGraphicsPreset(preset, regenerateBuildings = true) {
    if (!preset || !World3D) return;
    
    GraphicsState.currentPreset = preset;
    
    // Apply settings to world
    World3D.applyGraphicsSettings(preset);
    
    // Regenerate buildings if count changed
    if (regenerateBuildings && Buildings) {
        const newColliders = Buildings.regenerateBuildings(preset.buildingCount);
        Buildings.colliders = newColliders;
    }
    
    // Save to localStorage
    saveGraphicsPreset(preset.name);
    
    // Update UI
    updateGraphicsMenuActiveState();
    
    console.log(`Graphics preset changed to: ${preset.name}`);
}

// ============================================
// INPUT HANDLING
// ============================================
const Keys = {};
const Mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0, leftDown: false, rightDown: false };

function setupInputHandlers() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
        Keys[e.code] = true;

        // Toggle pause
        if (e.code === 'Escape') {
            togglePause();
        }

        // Targeting (Tab)
        if (e.code === 'Tab' && !GameState.isPaused && !GameState.isReplaying) {
            e.preventDefault();
            if (CombatSystem) {
                const direction = e.shiftKey ? -1 : 1;
                CombatSystem.switchToNextTarget(direction);
            }
        }

        // Weapon switch (Q)
        if (e.code === 'KeyQ' && !GameState.isPaused && !GameState.isReplaying) {
            e.preventDefault();
            if (CombatSystem) {
                CombatSystem.switchWeapon();
            }
        }

        // Replay controls
        if (GameState.isReplaying) {
            if (e.code === 'Space') {
                // Restart game
                if (ReplaySystem) {
                    ReplaySystem.stopReplay();
                }
                GameState.isReplaying = false;
                const spawnPos = new THREE.Vector3(0, 5, 0);
                if (Player) Player.respawn(spawnPos);
                if (CombatSystem) CombatSystem.reset();
            }
            if (e.code === 'KeyS') {
                // Save clip
                if (ReplaySystem) {
                    ReplaySystem.saveClip();
                }
            }
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

    window.addEventListener('mousedown', (e) => {
        if (GameState.isPaused || GameState.isReplaying) return;

        if (e.button === 0) {
            Mouse.leftDown = true;
            // Left click = Melee attack
            if (CombatSystem && !Player?.state.isDead) {
                CombatSystem.performMeleeAttack();
            }
        }
        if (e.button === 2) {
            Mouse.rightDown = true;
            // Right click = Ranged attack (pistol)
            if (CombatSystem && !Player?.state.isDead) {
                CombatSystem.performRangedAttack();
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            Mouse.leftDown = false;
        }
        if (e.button === 2) {
            Mouse.rightDown = false;
        }
    });

    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Pointer lock will be added when Three.js is integrated
}

// ============================================
// WINDOW RESIZE
// ============================================
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (World3D) {
        World3D.resize(width, height);
        return;
    }

    // Fallback while Three.js is not initialized yet
    if (UI.canvas) {
        UI.canvas.width = width;
        UI.canvas.height = height;
    }
}

// ============================================
// PAUSE MENU
// ============================================
function togglePause() {
    // Don't pause during replay
    if (GameState.isReplaying) return;

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
        openGraphicsMenu();
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
// GRAPHICS SETTINGS MENU
// ============================================
function openGraphicsMenu() {
    UI.menus.pause.classList.add('hidden');
    UI.menus.graphics.classList.remove('hidden');
    setupGraphicsMenuHandlers();
}

function closeGraphicsMenu() {
    UI.menus.graphics.classList.add('hidden');
    UI.menus.pause.classList.remove('hidden');
}

function setupGraphicsMenuHandlers() {
    // Setup preset buttons
    const presetButtons = document.querySelectorAll('.preset-button');
    UI.settings.presetButtons = presetButtons;
    
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const presetName = button.getAttribute('data-preset');
            const preset = GRAPHICS_PRESETS[presetName];
            if (preset) {
                applyGraphicsPreset(preset, true);
            }
        });
    });
    
    // Setup auto-downgrade toggle
    const autoDowngradeToggle = UI.settings.autoDowngradeToggle;
    if (autoDowngradeToggle) {
        // Load saved state
        const savedAutoDowngrade = localStorage.getItem('autoDowngrade');
        GraphicsState.autoDowngradeEnabled = savedAutoDowngrade !== 'false';
        autoDowngradeToggle.checked = GraphicsState.autoDowngradeEnabled;
        
        autoDowngradeToggle.addEventListener('change', () => {
            GraphicsState.autoDowngradeEnabled = autoDowngradeToggle.checked;
            localStorage.setItem('autoDowngrade', autoDowngradeToggle.checked);
            console.log(`Auto-downgrade ${autoDowngradeToggle.checked ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Setup debug stats toggle
    const debugStatsToggle = UI.settings.debugStatsToggle;
    if (debugStatsToggle) {
        // Load saved state
        const savedDebugStats = localStorage.getItem('debugStats');
        DebugState.enabled = savedDebugStats === 'true';
        debugStatsToggle.checked = DebugState.enabled;
        toggleDebugStats(DebugState.enabled);
        
        debugStatsToggle.addEventListener('change', () => {
            toggleDebugStats(debugStatsToggle.checked);
            console.log(`Debug stats ${debugStatsToggle.checked ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Setup back button
    const backButton = document.getElementById('backToMainMenuBtn');
    if (backButton) {
        backButton.addEventListener('click', closeGraphicsMenu);
    }
    
    // Update active state
    updateGraphicsMenuActiveState();
}

function updateGraphicsMenuActiveState() {
    if (!UI.settings.presetButtons) return;
    
    const currentPresetName = GraphicsState.currentPreset?.name || 'MEDIUM';
    
    UI.settings.presetButtons.forEach(button => {
        const presetName = button.getAttribute('data-preset');
        if (presetName === currentPresetName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
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

    // Initialize Three.js world
    initThreeWorld();
    
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
export { GameState, UI, Keys, Mouse, OverlaySystem };
