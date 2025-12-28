/**
 * Main Entry Point
 * GTA 5 Style 3D Game - EXAGGERATED COMBAT EDITION
 */

import * as THREE from 'three';

import {
    GAME_CONFIG,
    DEBUG_CONFIG,
    GRAPHICS_PRESETS,
    JUICE_SPRINT_CONFIG,
    getActivePreset,
    saveGraphicsPreset,
    getPresetName,
    getLowerPreset,
    getHigherPreset,
    SATIRICAL_TEXTS,
    DOPAMINE_CONFIG,
    GRAB_SYSTEM_CONFIG
} from './config.js';

import { createWorld } from './world.js';
import { createSky } from './sky.js';
import { createThirdPersonCamera } from './camera.js';
import { createAnimationController } from './animations.js';
import { createCombatSystem } from './combat-system.js';
import { createReplaySystem } from './replay-system.js';
import { createChaosCamera } from './chaos-camera.js';
import { createAbilitySystem } from './abilities.js';
import { audioEngine } from './audio-engine.js';

import { TerrainImporter } from './terrain-importer.js';
import { PhysicsSystem } from './physics-system.js';
import { ZoneManager } from './world-zones.js';
import { DialogueSystem } from './dialogue-system.js';
import { Malakor } from './boss-malakor.js';
import { Sylphira } from './boss-sylphira.js';
import { VoidEater } from './boss-void-eater.js';

import { createDecalSystem } from './decal-system.js';
import { createPostProcessingEffects } from './post-processing.js';
import { createTrailsSystem } from './trails-system.js';
import { createDustEmitterSystem } from './dust-emitter.js';
import { GlobalTimeFreeze } from './time-freeze.js';
import { createGrabSystem } from './grab-system.js';
import { createChargeParticleSystem, createImpactParticleSystem } from './grab-particles.js';

import { createPerformanceManager } from './performance-manager.js';
import { createUISystem } from './ui-system.js';
import { createSaveSystem } from './save-system.js';
import { createPlayerControllerV2 } from './player-controller-v2.js';

// ============================================
// ELITE SYSTEMS (Enhanced functionality)
// ============================================
import { createHitstopSystem } from './hitstop-system.js';
import { createScreenShakeSystem } from './screen-shake-system.js';
import { createPostProcessingElite } from './post-processing-elite.js';
import { createPerformanceManagerElite } from './performance-manager-elite.js';
import { createGrabSystemElite } from './grab-system-elite.js';

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
        lastAttacker: null, // For kill cam - who killed the player
        playerControlsDisabled: false, // For kill cam - disable input
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
// IMPACT FRAME SYSTEM (BRUTAL FREEZE)
// ============================================
const ImpactFrameState = {
    active: false,
    frameCount: 0,
    phase: 'IDLE', // IDLE, FREEZE, SLOWMO, RECOVERING
    slowmoTimeScale: 0.3,
    recoveryTimeScale: 1.0,
};

function triggerImpactFrame() {
    ImpactFrameState.active = true;
    ImpactFrameState.frameCount = 0;
    ImpactFrameState.phase = 'FREEZE';
    GameState.timeScale = 0;
    console.log('[ImpactFrame] Triggered - Frame 0 (FREEZE)');
}

function updateImpactFrame(rawDt) {
    if (!ImpactFrameState.active) {
        GameState.timeScale = 1.0;
        return;
    }

    ImpactFrameState.frameCount++;

    // Phase 1: Exact 3-frame freeze
    if (ImpactFrameState.phase === 'FREEZE') {
        if (ImpactFrameState.frameCount <= 3) {
            GameState.timeScale = 0;
            console.log(`[ImpactFrame] Frame ${ImpactFrameState.frameCount} - FREEZE`);
        } else {
            ImpactFrameState.phase = 'SLOWMO';
            ImpactFrameState.frameCount = 0;
            console.log('[ImpactFrame] Entering SLOWMO phase (0.3x)');
        }
    }
    // Phase 2: 3-frame slow-motion at 0.3x
    else if (ImpactFrameState.phase === 'SLOWMO') {
        if (ImpactFrameState.frameCount <= 3) {
            GameState.timeScale = ImpactFrameState.slowmoTimeScale;
            console.log(`[ImpactFrame] Frame ${ImpactFrameState.frameCount} - SLOWMO (0.3x)`);
        } else {
            ImpactFrameState.phase = 'RECOVERING';
            ImpactFrameState.frameCount = 0;
            console.log('[ImpactFrame] Recovering to normal speed');
        }
    }
    // Phase 3: Recovery to normal speed
    else if (ImpactFrameState.phase === 'RECOVERING') {
        // Smooth recovery over 2 frames
        const recoveryProgress = Math.min(1.0, ImpactFrameState.frameCount / 2.0);
        GameState.timeScale = ImpactFrameState.slowmoTimeScale + (1.0 - ImpactFrameState.slowmoTimeScale) * recoveryProgress;

        if (ImpactFrameState.frameCount >= 2) {
            ImpactFrameState.active = false;
            ImpactFrameState.phase = 'IDLE';
            GameState.timeScale = 1.0;
            console.log('[ImpactFrame] Complete - Normal speed');
        }
    }
}

// ============================================
// SCREEN SHAKE (EXPONENTIAL DECAY)
// ============================================
const ScreenShakeState = {
    strength: 0,
    timeRemaining: 0,
    sampleTimer: 0,
    currentOffset: new THREE.Vector3(),
    targetOffset: new THREE.Vector3(),
    decayConstant: 8.0, // k in A * e^(-kt)
};

// Overlay System for Satirical Texts - DOPAMINE ARCHITECTURE
const OverlaySystem = {
    isShowing: false,
    currentText: '',
    timer: 0,
    lastChaosTime: 0,
    
    show(text, duration = 2.5, isChaos = false) {
        if (this.isShowing) return;
        
        this.isShowing = true;
        this.currentText = text;
        this.timer = duration;
        
        const element = document.getElementById('satiricalText');
        if (!element) return;
        
        element.textContent = text;
        element.classList.remove('chaos');
        
        if (isChaos) {
            element.classList.add('chaos');
        }
        
        // Reset animation
        element.style.animation = 'none';
        void element.offsetWidth; // Force reflow
        
        // Apply correct animation
        const animName = isChaos ? 'satiricalPopCHAOS' : 'satiricalPop';
        element.style.animation = `${animName} ${duration}s ease-out forwards`;
    },
    
    update(deltaTime) {
        if (this.isShowing) {
            this.timer -= deltaTime;
            if (this.timer <= 0) {
                this.isShowing = false;
            }
        }
    },
    
    getRandomText(category) {
        const texts = SATIRICAL_TEXTS[category];
        if (!texts || texts.length === 0) return '';
        return texts[Math.floor(Math.random() * texts.length)];
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

    hitstopState.freezeRemaining = Math.max(hitstopState.freezeRemaining, freezeDuration);
    hitstopState.recoveryRemaining = 0;
    GameState.timeScale = 0;
}

function updateHitstop(rawDt) {
    if (hitstopState.freezeRemaining > 0) {
        hitstopState.freezeRemaining = Math.max(0, hitstopState.freezeRemaining - rawDt);
        GameState.timeScale = 0;

        if (hitstopState.freezeRemaining <= 0) {
            hitstopState.recoveryRemaining = GAME_CONFIG.COMBAT.HITSTOP_RECOVERY_TIME;
        }

        return;
    }

    if (hitstopState.recoveryRemaining > 0) {
        hitstopState.recoveryRemaining = Math.max(0, hitstopState.recoveryRemaining - rawDt);

        const recoveryTime = Math.max(0.0001, GAME_CONFIG.COMBAT.HITSTOP_RECOVERY_TIME);
        const linearT = clamp01(1 - (hitstopState.recoveryRemaining / recoveryTime));
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

    // EXPONENTIAL DECAY: A * e^(-kt)
    // Frame-based exponential decay using decayConstant k
    const frameDecay = Math.exp(-ScreenShakeState.decayConstant * rawDt);

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
GameState.triggerImpactFrame = triggerImpactFrame;
GameState.applyScreenShake = applyScreenShake;

// Make globally accessible for abilities and combat
window.applyScreenShake = applyScreenShake;
window.triggerImpactFrame = triggerImpactFrame;

// ============================================
// THREE.JS WORLD STATE
// ============================================
let World3D = null;
let Terrain = null;
let Buildings = null;
let WorldObstacles = null;
let Sky = null;
let Player = null;
let PlayerCamera = null;
let AnimationController = null;
let CombatSystem = null;
let ReplaySystem = null;
let NPCSystem = null;
let NPCPlayerProxy = null;
let ChaosCamera = null;
let AbilitySystem = null;

// Boss Encounter Systems
let TerrainImporterSystem = null;
let Physics = null;
let ZoneManagerSystem = null;
let Dialogue = null;
let Bosses = [];

// Dopamine Engine Systems
let ChaosScoreSystem = null;
let WaveSystem = null;
let DecalSystem = null;
let PostProcessing = null;

// Juice Sprint Systems
let TrailsSystem = null;
let DustEmitterSystem = null;
let PerformanceMonitor = null;

// World/Perf helpers
let PerformanceManager = null;
let DarkSoulsWorld = null;
let UISystem = null;
let SaveSystem = null;

// Viral Factory Systems
let ChaosMonitor = null;
let DopaminePopupSystem = null;

// Game Feel Overhaul Systems
let ImpactFrameManager = null;
let hitstopState;

// Grab & Launch Entropy System
let GrabSystem = null;
let ChargeParticles = null;
let ImpactParticles = null;

// ============================================
// ELITE SYSTEMS STATE
// ============================================
let HitstopManager = null;
let ScreenShakeManager = null;
let PostProcessingElite = null;
let PerformanceManagerElite = null;
let GrabSystemElite = null;

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
// PERFORMANCE MONITOR (Dynamic Scaling)
// ============================================
PerformanceMonitor = {
    fps: 60,
    fpsHistory: [],
    maxHistory: 120,  // 2 seconds at 60 FPS
    lowFpsThreshold: 35,
    lowFpsCount: 0,
    isScaledDown: false,
    scaleRecoveryFps: 50,

    update(currentFps) {
        this.fps = currentFps;
        this.fpsHistory.push(currentFps);
        if (this.fpsHistory.length > this.maxHistory) {
            this.fpsHistory.shift();
        }

        // Calculate average FPS
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

        // If average < 35 for 2 seconds, scale down visual effects
        if (avgFps < this.lowFpsThreshold && !this.isScaledDown) {
            console.warn(`🔴 FPS WARNING: ${avgFps.toFixed(1)} < 35. Scaling down visual effects...`);
            this.scaleDown();
        } else if (avgFps > this.scaleRecoveryFps && this.isScaledDown) {
            console.log(`🟢 FPS RECOVERED: ${avgFps.toFixed(1)}. Scaling up...`);
            this.scaleUp();
        }
    },

    scaleDown() {
        this.isScaledDown = true;

        // Reduce Trails
        if (TrailsSystem && TrailsSystem.setMaxParticles) {
            const reduced = Math.floor(JUICE_SPRINT_CONFIG.TRAILS.MAX_TRAILS * 0.7);
            TrailsSystem.setMaxParticles(reduced);
            console.log(`Trails reduced to ${reduced}`);
        }

        // Reduce Dust
        if (DustEmitterSystem && DustEmitterSystem.setMaxParticles) {
            const reduced = Math.floor(JUICE_SPRINT_CONFIG.DUST_EMITTER.MAX_PARTICLES * 0.7);
            DustEmitterSystem.setMaxParticles(reduced);
            console.log(`Dust reduced to ${reduced}`);
        }

        // Reduce decal pool
        if (DecalSystem && DecalSystem.setMaxDecals) {
            DecalSystem.setMaxDecals(Math.floor(DOPAMINE_CONFIG.DECAL_MAX_POOL * 0.7));
            console.log('Decal pool reduced to 70%');
        }
    },

    scaleUp() {
        this.isScaledDown = false;

        // Restore Trails
        if (TrailsSystem && TrailsSystem.setMaxParticles) {
            TrailsSystem.setMaxParticles(JUICE_SPRINT_CONFIG.TRAILS.MAX_TRAILS);
            console.log(`Trails restored to ${JUICE_SPRINT_CONFIG.TRAILS.MAX_TRAILS}`);
        }

        // Restore Dust
        if (DustEmitterSystem && DustEmitterSystem.setMaxParticles) {
            DustEmitterSystem.setMaxParticles(JUICE_SPRINT_CONFIG.DUST_EMITTER.MAX_PARTICLES);
            console.log(`Dust restored to ${JUICE_SPRINT_CONFIG.DUST_EMITTER.MAX_PARTICLES}`);
        }

        // Restore decal pool
        if (DecalSystem && DecalSystem.setMaxDecals) {
            DecalSystem.setMaxDecals(DOPAMINE_CONFIG.DECAL_MAX_POOL);
            console.log('Decal pool restored to 100%');
        }
    },

    getState() {
        return {
            fps: this.fps,
            isScaledDown: this.isScaledDown,
            avgFps: this.fpsHistory.length > 0
                ? (this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length).toFixed(1)
                : 60,
        };
    },
};

// Make PerformanceMonitor globally accessible
window.PerformanceMonitor = PerformanceMonitor;

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
    dopamine: {
        comboContainer: document.getElementById('comboHud'),
        comboText: document.getElementById('comboText'),
        comboBarFill: document.getElementById('comboBarFill'),
        waveText: document.getElementById('waveHud'),
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

    // Initialize hitstop state (global)
    hitstopState = {
        isActive: false,
        framesRemaining: 0,
        timeScale: 1.0,
        freezeRemaining: 0,
        recoveryRemaining: 0,
        resetToNormal: function() {
            this.isActive = false;
            this.framesRemaining = 0;
            this.timeScale = 1.0;
            this.freezeRemaining = 0;
            this.recoveryRemaining = 0;
        }
    };

    World3D = createWorld({ canvas: UI.canvas, autoResize: true });

    PerformanceManager = createPerformanceManager({
        renderer: World3D.renderer,
        sunLight: World3D.lights.sunLight,
        targetFps: GAME_CONFIG.FPS,
        shadowFrustumSize: GraphicsState.currentPreset?.shadowFrustumSize || 90,
    });

    // Terrain is now imported (GLTF/GLB) instead of procedural generation.
    TerrainImporterSystem = new TerrainImporter();
    const fallbackTerrain = TerrainImporterSystem.createFallbackTerrain();

    Terrain = { mesh: fallbackTerrain, size: 1000 };
    World3D.scene.add(Terrain.mesh);

    Buildings = null;

    // Unified collider list for player/Bosses (updated each frame).
    WorldObstacles = { colliders: [] };

    // Disable procedural/streamed world builder in boss encounter mode.
    DarkSoulsWorld = null;

    // Physics (Rapier)
    Physics = new PhysicsSystem(World3D.scene);

    Sky = createSky({
        scene: World3D.scene,
        sunLight: World3D.lights.sunLight,
        ambientLight: World3D.lights.ambientLight,
    });

    SaveSystem = createSaveSystem();

    // Create player
    Player = createPlayerControllerV2({ position: new THREE.Vector3(0, 5, 0) });
    World3D.scene.add(Player.mesh);

    // Load save if present
    const saveData = SaveSystem.load();
    if (saveData) {
        SaveSystem.applyLoaded(saveData, { player: Player, gameState: GameState });
    }

    UISystem = createUISystem({
        ui: UI,
        player: Player,
        gameState: GameState,
        terrainSize: Terrain.size,
        world: DarkSoulsWorld,
    });

    // Create animation controller
    AnimationController = createAnimationController(Player);

    // Create third-person camera controller
    PlayerCamera = createThirdPersonCamera(World3D.camera, Player);
    PlayerCamera.enableMouseControl(UI.canvas);

    // Boss encounter mode: no generic NPC pool/AI system.
    NPCSystem = null;

    // Zone + dialogue systems
    ZoneManagerSystem = new ZoneManager(World3D.scene, Player.mesh);
    Dialogue = new DialogueSystem(document.getElementById('hud'));

    // ============================================
    // ELITE SYSTEMS INITIALIZATION
    // ============================================

    // Hitstop and Screen Shake managers
    HitstopManager = createHitstopSystem();
    ScreenShakeManager = createScreenShakeSystem(World3D.camera);

    // Elite Post-Processing (Bloom + Vignette + Chromatic)
    PostProcessingElite = createPostProcessingElite(World3D.renderer, World3D.scene, World3D.camera, {
        bloomStrength: 1.5,
        bloomThreshold: 0.85,
        bloomRadius: 0.4,
        vignetteIntensity: 0.5,
        vignetteEnabled: true,
        chromaticEnabled: true,
    });
    PostProcessingElite.setSize(window.innerWidth, window.innerHeight);

    // Keep original PostProcessing for compatibility
    PostProcessing = createPostProcessingEffects(World3D.renderer, World3D.scene, World3D.camera);
    PostProcessing.setSize(window.innerWidth, window.innerHeight);

    // Elite Performance Manager
    PerformanceManagerElite = createPerformanceManagerElite(World3D.renderer, World3D.scene, {
        targetFPS: GAME_CONFIG.FPS,
        minFPS: 40,
    });
    PerformanceManagerElite.setBloomPass(PostProcessingElite.getBloomPass());
    PerformanceManagerElite.setSunLight(World3D.lights.sunLight);

    // Dopamine engine systems
    DecalSystem = createDecalSystem(World3D.scene, DOPAMINE_CONFIG.DECAL_MAX_POOL);

    // Juice Sprint systems
    TrailsSystem = createTrailsSystem(World3D.scene);
    DustEmitterSystem = createDustEmitterSystem(World3D.scene);

    // NPC/wave systems are disabled in boss encounter mode.
    ChaosScoreSystem = null;
    WaveSystem = null;
    DopaminePopupSystem = null;
    ChaosMonitor = null;

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
        takeDamage: (amount, direction, attacker) => {
            if (CombatSystem?.damagePlayerFromNPC) {
                CombatSystem.damagePlayerFromNPC(amount, direction, attacker);
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

    // Create chaos camera system (cinematic FOV, tracking, kill cam)
    ChaosCamera = createChaosCamera();

    // Create ability system (Gravity Blast, etc.)
    AbilitySystem = createAbilitySystem(Player, World3D.scene, World3D.camera, GameState, {
        npcSystem: NPCSystem,
        combatSystem: CombatSystem,
        chaosCamera: ChaosCamera,
        postProcessing: PostProcessing,
    });

    // Create Grab & Launch Entropy System
    ChargeParticles = createChargeParticleSystem(World3D.scene, 500);
    ImpactParticles = createImpactParticleSystem(World3D.scene, 1000);

    // Original grab system (keep for compatibility)
    GrabSystem = createGrabSystem(Player, World3D.camera, World3D.scene, GameState, {
        npcSystem: NPCSystem,
        chargeParticles: ChargeParticles,
        impactParticles: ImpactParticles,
        postProcessing: PostProcessing,
    });

    // Elite grab system (with hitstop and screen shake integration)
    GrabSystemElite = createGrabSystemElite(Player, World3D.camera, World3D.scene, GameState, {
        npcSystem: NPCSystem,
        hitstopManager: HitstopManager,
        screenShakeManager: ScreenShakeManager,
        postProcessing: PostProcessingElite,
    });

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
        // Reset chaos camera state
        ChaosCamera.reset();
    });

    // Bosses + imported terrain are finalized during the loading phase (loadGameAssets).

    Sky.update({ timeHours: GameState.world.time, camera: World3D.camera });

    // Apply initial graphics settings
    applyGraphicsPreset(GraphicsState.currentPreset, false);

    // Update weapon UI initially
    if (UI.hud.weaponName) {
        UI.hud.weaponName.textContent = 'PUÑOS';
        UI.hud.weaponName.style.color = '#ffcc00';
    }

    // Initialize Audio Engine
    audioEngine.init();

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
    // Prefer analytic sampling (much faster) if terrain provides it.
    if (typeof Terrain?.getHeightAt === 'function') {
        return Terrain.getHeightAt(x, z);
    }

    // Fallback: raycast against the terrain mesh.
    if (!Terrain?.mesh) return 0;

    GroundRayOrigin.set(x, 200, z);
    GroundRaycaster.set(GroundRayOrigin, GroundRayDirection);

    const hits = GroundRaycaster.intersectObject(Terrain.mesh, true);
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

    // ============================================
    // ELITE SYSTEMS UPDATES (raw delta time)
    // ============================================

    // Hitstop Manager
    HitstopManager?.update();
    const shouldPauseForHitstop = HitstopManager?.isHitstopActive?.();

    // Screen Shake Manager
    if (ScreenShakeManager) {
        ScreenShakeManager.update();
    }

    // Impact Frame System (brutal freeze) + Screen Shake (exponential decay)
    // Both driven by *real* frame time (raw delta) for precision
    updateImpactFrame(deltaTime);
    updateScreenShake(deltaTime);

    hitstopState.isActive = GameState.timeScale === 0 || shouldPauseForHitstop;
    hitstopState.timeScale = GameState.timeScale;

    const finalDelta = hitstopState.isActive ? 0 : (deltaTime * hitstopState.timeScale);

    if (!GameState.isPaused) {
        update(finalDelta, deltaTime);

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

    // Update time freeze system
    GlobalTimeFreeze.update(rawDt);

    // Combat can trigger hitstop mid-frame (e.g. bullet impacts). If that happens,
    // we recompute simDt so the rest of the simulation freezes immediately.
    if (CombatSystem) {
        CombatSystem.update(simDt);
        simDt = rawDt * GameState.timeScale;
    }

    // Update world time (scaled)
    updateWorldTime(simDt);

    // Apply time freeze multiplier to scaled delta time
    const timeScaleFinal = GameState.timeScale * GlobalTimeFreeze.factor;
    const finalDt = rawDt * timeScaleFinal;

    // Update world streaming (unscaled so chunk pop-in doesn't stutter during hitstop)
    if (DarkSoulsWorld && Player) {
        DarkSoulsWorld.update(Player.getPosition());
    }

    // Update player (scaled)
    if (Player && Buildings && PlayerCamera && !GameState.playerControlsDisabled) {
        const staticColliders = Buildings.colliders || [];
        const streamedColliders = DarkSoulsWorld?.getColliders?.() || [];
        const allColliders = staticColliders.concat(streamedColliders);

        if (WorldObstacles) {
            WorldObstacles.colliders = allColliders;
        }

        Player.setColliders(allColliders);
        Player.update(finalDt, Keys, allColliders, getTerrainHeightAt, PlayerCamera.state.horizontalAngle);

        // Sync stamina for UI/save.
        if (Player?.state && typeof Player.state.stamina === 'number') {
            GameState.player.stamina = Player.state.stamina;
        }

        // Environmental hazard: lava zone chip damage.
        const lavaT = DarkSoulsWorld?.getLavaDamageAt?.(Player.mesh.position.x, Player.mesh.position.z) || 0;
        if (lavaT > 0.25 && CombatSystem) {
            const dps = 8 + lavaT * 12;
            CombatSystem.applyDamage(dps * rawDt, new THREE.Vector3(0, 1, 0), 'ENV');
        }
    }

    // Update animations (scaled)
    if (AnimationController && Player) {
        AnimationController.update(finalDt, Player.getState());
    }

    // Update camera (unscaled so input/camera remains responsive during hitstop)
    // Skip normal camera update if in kill cam (chaos camera takes over)
    if (PlayerCamera && Player && (!ChaosCamera || !ChaosCamera.state.isInKillCam)) {
        PlayerCamera.update(rawDt, Mouse);
        
        // Apply cinematic camera movement if in cinematic mode
        if (ChaosMonitor && ChaosMonitor.getState().isInCinematicMode) {
            const chaosState = ChaosMonitor.getState();
            const smoothFactor = 0.15;  // Slower, more cinematic
            PlayerCamera.camera.position.lerp(chaosState.targetPos, smoothFactor);
        }
    }

    // Update chaos camera (FOV kicks, tracking, kill cam)
    if (ChaosCamera) {
        ChaosCamera.update(rawDt, NPCSystem, World3D?.camera, PlayerCamera, GameState);
    }

    // Update ability system (Gravity Blast, etc.)
    if (AbilitySystem) {
        AbilitySystem.update(finalDt);
    }

    // Update audio engine listener position
    if (audioEngine && World3D?.camera) {
        audioEngine.updateListenerPosition(World3D.camera.position);
        audioEngine.updateDucking();
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
        NPCSystem.update(finalDt, {
            player: NPCPlayerProxy,
            camera: World3D.camera,
            feedback: GameState,
            decalSystem: DecalSystem,
        });
    }

    // Boss encounter systems
    ZoneManagerSystem?.update?.();
    if (Bosses && Bosses.length > 0) {
        for (const boss of Bosses) {
            boss?.update?.(finalDt);
        }
    }
    Physics?.update?.(finalDt);

    // Dopamine engine updates (use unscaled dt so hitstop doesn't stall UI)
    ChaosScoreSystem?.update?.(rawDt);
    WaveSystem?.update?.(rawDt);
    DecalSystem?.update?.(rawDt);

    // Elite systems updates
    PostProcessingElite?.update?.(rawDt);
    PerformanceManagerElite?.update?.(rawDt);
    GrabSystemElite?.update?.(rawDt);

    // Original post-processing (keep for compatibility)
    PostProcessing?.update?.(rawDt);

    // Viral Factory updates
    if (ChaosMonitor) {
        ChaosMonitor.update(rawDt, NPCSystem, PlayerCamera, Player);
    }
    if (DopaminePopupSystem) {
        DopaminePopupSystem.update(rawDt);
    }

    // Juice Sprint updates
    if (TrailsSystem && TrailsSystem.update) TrailsSystem.update(rawDt);
    if (DustEmitterSystem && DustEmitterSystem.update) DustEmitterSystem.update(rawDt);

    // Grab & Launch Entropy System updates
    if (GrabSystem) {
        GrabSystem.update(finalDt);
    }
    if (ChargeParticles) {
        ChargeParticles.update(rawDt);
    }
    if (ImpactParticles) {
        ImpactParticles.update(rawDt);
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
    
    const activeNpcs = NPCSystem.state?.active || [];
    if (activeNpcs.length === 0) return;
    
    let ragdollCount = 0;
    let maxVelocity = 0;
    let chaosThreshold = 3; // 3+ NPCs = CAOS
    
    for (let npc of activeNpcs) {
        if (npc.getState && npc.getState().isRagdoll) {
            ragdollCount++;
        }
        const vel = (npc.getState && npc.getState().velocity?.length()) || 0;
        if (vel > maxVelocity) maxVelocity = vel;
    }
    
    // CAOS EXTREMO: Usar animación CHAOS más loca
    if (ragdollCount >= chaosThreshold) {
        OverlaySystem.show(
            OverlaySystem.getRandomText('CHAOS'), 
            3.0, 
            true  // ← isChaos = true (usa animación más loca)
        );
        return;
    }
    
    // Velocidad extrema
    if (maxVelocity > 25 && !OverlaySystem.isShowing) {
        OverlaySystem.show(OverlaySystem.getRandomText('HIGH_VELOCITY'), 2.0, false);
    }
    
    // Friendly Fire: NPC chain detection
    if (activeNpcs.length >= 2 && !OverlaySystem.isShowing) {
        for (let npc of activeNpcs) {
            const npcState = npc.getState ? npc.getState() : null;
            if (npcState && npcState.lastAttacker && npcState.lastAttacker.isNPC) {
                // Two NPCs fighting each other
                if (Math.random() < 0.1) { // 10% chance per frame while fighting
                    OverlaySystem.show(OverlaySystem.getRandomText('NPC_CHAIN'), 2.0, false);
                    break;
                }
            }
        }
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

    // Use Elite post-processing if available, otherwise original
    if (PostProcessingElite?.render) {
        PostProcessingElite.render();
    } else if (PostProcessing?.render) {
        PostProcessing.render();
    } else {
        World3D.renderer.render(World3D.scene, World3D.camera);
    }

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

    UISystem?.update?.();
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

    // Update Performance Monitor for dynamic scaling
    if (PerformanceMonitor) {
        PerformanceMonitor.update(Math.round(avgFps));
    }

    // Dynamic resolution + shadow focus
    PerformanceManager?.update?.({
        fps: Math.round(avgFps),
        focusPosition: Player?.getPosition?.() || null,
    });

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

        // Grab & Launch (G) - Note: Disabled Gravity Blast to use G for Grab
        if (e.code === 'KeyG' && !GameState.isPaused && !GameState.isReplaying && !GameState.playerControlsDisabled) {
            e.preventDefault();
            // Try Elite grab system first, fallback to original
            if (GrabSystemElite && !GrabSystemElite.isCurrentlyGrabbing()) {
                GrabSystemElite.startGrab();
            } else if (GrabSystem && !GrabSystem.isGrabbing()) {
                GrabSystem.startGrab();
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

        // Kill cam restart
        if (ChaosCamera && ChaosCamera.state.isInKillCam) {
            if (e.code === 'Space') {
                // Restart immediately
                if (ChaosCamera.restartGame) {
                    ChaosCamera.restartGame();
                }
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        Keys[e.code] = false;
        
        // Launch grabbed object on G release
        if (e.code === 'KeyG') {
            if (GrabSystemElite && GrabSystemElite.isCurrentlyGrabbing()) {
                GrabSystemElite.launch();
            } else if (GrabSystem && GrabSystem.isGrabbing()) {
                GrabSystem.launch();
            }
        }
    });

    // Mouse events
    window.addEventListener('mousemove', (e) => {
        // Disable mouse look during kill cam
        if (ChaosCamera && ChaosCamera.state.isInKillCam) {
            Mouse.deltaX = 0;
            Mouse.deltaY = 0;
            return;
        }
        Mouse.deltaX = e.movementX;
        Mouse.deltaY = e.movementY;
        Mouse.x = e.clientX;
        Mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
        if (GameState.isPaused || GameState.isReplaying) return;
        // Disable attacks during kill cam
        if (ChaosCamera && ChaosCamera.state.isInKillCam) return;

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
        PostProcessing?.setSize?.(width, height);
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
        if (!SaveSystem) return;
        SaveSystem.save({
            player: Player,
            gameState: GameState,
            graphicsPresetName: GraphicsState.currentPreset?.name || null,
        });
        OverlaySystem.show('PARTIDA GUARDADA', 1.4);
    });
    
    document.getElementById('loadBtn').addEventListener('click', () => {
        if (!SaveSystem) return;
        const data = SaveSystem.load();
        if (data) {
            SaveSystem.applyLoaded(data, { player: Player, gameState: GameState });
            OverlaySystem.show('PARTIDA CARGADA', 1.4);
        } else {
            OverlaySystem.show('NO HAY SAVE', 1.2);
        }
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

function createBossPlaceholderModel({ color = 0xffffff, emissive = 0x000000, size = 8 } = {}) {
    const group = new THREE.Group();

    const geom = new THREE.IcosahedronGeometry(size, 1);
    const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.15,
        emissive,
        emissiveIntensity: 0.35,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);
    return group;
}

async function loadImportedTerrain() {
    if (!World3D || !TerrainImporterSystem) return;

    const imported = await TerrainImporterSystem.loadTerrain();
    if (!imported) return;

    // Swap placeholder terrain.
    if (Terrain?.mesh && Terrain.mesh !== imported) {
        World3D.scene.remove(Terrain.mesh);
    }

    Terrain = {
        ...(Terrain || {}),
        mesh: imported,
        size: Terrain?.size ?? 1000,
    };

    World3D.scene.add(imported);

    await TerrainImporterSystem.loadTexturesAndNormals(imported);
}

async function initLegendaryPhysics() {
    if (!Physics || !Terrain?.mesh) return;

    await Physics.ready;

    Physics.createTerrainCollider(Terrain.mesh);
    if (Player?.mesh) {
        Physics.createPlayerCollider(Player.mesh);
    }
}

function spawnLegendaryBosses() {
    if (!World3D || Bosses.length > 0) return;

    const at = (x, z) => new THREE.Vector3(x, getTerrainHeightAt(x, z), z);

    const malakorModel = createBossPlaceholderModel({ color: 0x8b4513, emissive: 0xff6600, size: 10 });
    const sylphiraModel = createBossPlaceholderModel({ color: 0x9370db, emissive: 0x6a5acd, size: 9 });
    const voidModel = createBossPlaceholderModel({ color: 0x111111, emissive: 0x6600ff, size: 12 });

    const malakor = new Malakor(at(-300, -300), malakorModel, {
        scene: World3D.scene,
        player: Player?.mesh,
        dialogueSystem: Dialogue,
    });

    const sylphira = new Sylphira(at(100, -300), sylphiraModel, {
        scene: World3D.scene,
        player: Player?.mesh,
        dialogueSystem: Dialogue,
    });

    const voidEater = new VoidEater(at(100, 300), voidModel, {
        scene: World3D.scene,
        player: Player?.mesh,
        dialogueSystem: Dialogue,
    });

    Bosses = [malakor, sylphira, voidEater];

    for (const boss of Bosses) {
        if (boss?.model) {
            boss.model.position.copy(boss.position);
            World3D.scene.add(boss.model);
        }
    }

    PerformanceManagerElite?.setCamera?.(World3D.camera);
    PerformanceManagerElite?.setBosses?.(Bosses, { radius: 120 });
}

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

        if (step.progress === 40) {
            await loadImportedTerrain();
        }

        if (step.progress === 80) {
            await initLegendaryPhysics();
            spawnLegendaryBosses();
        }

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
// CLEANUP ON PAGE UNLOAD
// ============================================
window.addEventListener('beforeunload', () => {
    try {
        if (audioEngine && audioEngine.dispose) {
            audioEngine.dispose();
        }
    } catch (e) {
        console.warn('Error disposing audio engine:', e);
    }
    
    try {
        if (TrailsSystem && TrailsSystem.dispose) {
            TrailsSystem.dispose();
        }
    } catch (e) {
        console.warn('Error disposing trails system:', e);
    }
    
    try {
        if (DustEmitterSystem && DustEmitterSystem.dispose) {
            DustEmitterSystem.dispose();
        }
    } catch (e) {
        console.warn('Error disposing dust emitter system:', e);
    }
});

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
