/**
 * Game Configuration
 * GTA 5 Style 3D Game
 */

// ============================================
// GAME CONSTANTS
// ============================================
export const GAME_CONFIG = {
    // Game Settings
    FPS: 60,
    TICK_RATE: 60,
    MAX_DELTA_TIME: 0.1,
    
    // NPC AI Settings
    AI_CULLING_DISTANCE: 40.0,
    AI_UPDATE_FREQUENCY: 0.1, // Update every 100ms
    
    // Player Settings
    PLAYER: {
        // Movement Speeds
        WALK_SPEED: 5.0,
        RUN_SPEED: 12.0,
        SPRINT_SPEED: 18.0,
        CROUCH_SPEED: 2.5,
        
        // Jump Settings
        JUMP_FORCE: 15.0,
        JUMP_COOLDOWN: 0.2,
        GRAVITY: 30.0,
        
        // Player Dimensions
        HEIGHT: 1.8,
        RADIUS: 0.5,
        MASS: 80.0,
        
        // Camera Settings
        CAMERA_HEIGHT: 1.6,
        CAMERA_OFFSET: 0.3,
        
        // Health & Armor
        MAX_HEALTH: 100,
        MAX_ARMOR: 100,
        HEALTH_REGEN_DELAY: 5.0,
        HEALTH_REGEN_RATE: 2.0,
        
        // Stamina
        MAX_STAMINA: 100,
        STAMINA_DRAIN_RATE: 20.0,
        STAMINA_REGEN_RATE: 10.0,
        SPRINT_STAMINA_COST: 25.0,
    },
    
    // Vehicle Settings
    VEHICLE: {
        // Physics
        MASS: 1500.0,
        DRAG_COEFFICIENT: 0.3,
        ROLLING_RESISTANCE: 0.02,
        
        // Engine
        MAX_SPEED: 80.0,
        ACCELERATION: 15.0,
        BRAKE_FORCE: 25.0,
        REVERSE_SPEED: 10.0,
        
        // Handling
        TURN_SPEED: 2.0,
        FRICTION: 0.95,
        SUSPENSION_STIFFNESS: 50.0,
        SUSPENSION_DAMPING: 5.0,
        
        // Dimensions
        WIDTH: 2.0,
        LENGTH: 4.5,
        HEIGHT: 1.4,
    },
    
    // World Settings
    WORLD: {
        // Time
        DAY_LENGTH: 24.0, // Real-time minutes per game day
        TIME_SCALE: 1.0,
        
        // Weather
        WEATHER_CHANGE_INTERVAL: 300.0,
        FOG_DENSITY: 0.01,
        FOG_COLOR: 0x87ceeb,
        
        // Environment
        GROUND_FRICTION: 0.8,
        AIR_RESISTANCE: 0.99,
        WATER_LEVEL: -5.0,
    },
    
    // Terrain Settings
    TERRAIN: {
        SIZE: 1000,
    },
    
    // Combat Settings (EXAGGERATED FOR VIRALITY)
    COMBAT: {
        // Weapons
        WEAPON_SWITCH_TIME: 0.1,
        RELOAD_TIME: 2.0,

        // Melee - EXAGGERATED IMPACT
        MELEE_RANGE: 2.5,
        MELEE_DAMAGE: 15,
        MELEE_COOLDOWN: 0.4,
        MELEE_KNOCKBACK: 10,
        MELEE_RECOIL: 0.5,

        // Ranged - CHAOS PURE
        BULLET_SPEED: 120.0,
        BULLET_GRAVITY: 0.0,
        BULLET_LIFETIME: 3.0,
        RANGED_DAMAGE: 20,
        RANGED_COOLDOWN: 0.15,
        RANGED_KNOCKBACK: 8,
        RANGED_RECOIL_PITCH: 0.05,

        // Knockback Physics
        KNOCKBACK_MULTIPLIER: 0.8,
        MAX_KNOCKBACK: 10,
        KNOCKBACK_DURATION: 0.3,
        KNOCKBACK_DAMPING: 0.95,

        // Damage Numbers
        DAMAGE_NUMBER_SIZE: 48,
        DAMAGE_NUMBER_DURATION: 1.2,
        DAMAGE_NUMBER_GROWTH: 1.5,

        // Feedback - EXTREME
        MELEE_SHAKE_INTENSITY: 0.4,
        MELEE_SHAKE_DURATION: 0.15,
        RANGED_SHAKE_INTENSITY: 0.2,
        RANGED_SHAKE_DURATION: 0.1,
        IMPACT_FLASH_DURATION: 0.1,
        SCREEN_RED_DURATION: 0.2,

        // Hitstop + Screen Shake (heavy impact feedback)
        HITSTOP_DURATION: 0.05,          // Duración del freeze frame
        HITSTOP_RECOVERY_TIME: 0.1,      // Tiempo para volver a timeScale 1.0
        SCREEN_SHAKE_INTENSITY: 0.5,     // Multiplicador base de amplitud
        SCREEN_SHAKE_DURATION: 0.15,     // Duración del shake
        SCREEN_SHAKE_DECAY: 0.85,        // Cuánto se reduce cada frame (1.0 = sin decay)
        SCREEN_SHAKE_FREQUENCY: 10.0,    // Velocidad del ruido
        COLLISION_SHAKE_THRESHOLD: 15.0, // Velocidad mínima para shake en colisiones NPC

        // Ragdoll & Death
        DEATH_SLOWMO: 0.5,
        DEATH_SLOWMO_DURATION: 2.0,
        RAGDOLL_SPIN_SPEED: 720,
        RAGDOLL_SLOWMO_FACTOR: 0.2,

        // Knockback & Ragdoll-Lite (for NPCs)
        KNOCKBACK_FORCE: 25.0,           // Magnitude of initial impulse
        KNOCKBACK_FRICTION: 0.92,        // Deceleration per frame (1.0 = no friction)
        RAGDOLL_DURATION: 2.0,           // Seconds in ragdoll state
        RAGDOLL_GRAVITY_SCALE: 1.2,      // Gravity during ragdoll (can be stronger)

        // Furia System (Venganza Física)
        FURIA: {
            FURIA_DURATION: 3.0,           // Segundos que dura la furia
            FURIA_ACCELERATION: 25.0,      // Aceleración hacia atacante
            VELOCITY_RAGDOLL_THRESHOLD: 10.0,  // Velocidad que causa ragdoll
            RAGDOLL_DURATION_FROM_VELOCITY: 1.5,  // Duración del ragdoll por velocidad
            RAGDOLL_COLLISION_DAMAGE: 5,   // Daño causado al tocar otros durante ragdoll
            RAGDOLL_EXIT_VELOCITY: 3.0,    // Velocidad bajo la cual puede levantarse
            IMPULSE_THRESHOLD: 5.0,        // Impulso mínimo para registrar como "golpe"
        },

        // Replay System
        REPLAY_DURATION: 8,
        REPLAY_FRAMES_BEFORE: 5,
        REPLAY_FRAMES_AFTER: 5,
        REPLAY_SLOWMO_INTENSITY: 0.2,
        REPLAY_ZOOM_FACTOR: 3.0,
        REPLAY_ZOOM_ANGLE: Math.PI / 4,
        FREEZE_FRAME_DURATION: 1.0,
        REPLAY_PAUSE_END: 2.0,

        // Hit Detection
        HEADSHOT_MULTIPLIER: 2.0,
        LIMB_DAMAGE_MULTIPLIER: 0.8,

        // Death threshold
        DEATH_DAMAGE_THRESHOLD: 50,
    },

    // Ability Settings
    ABILITY_CONFIG: {
        GRAVITY_BLAST: {
            COOLDOWN: 5.0,
            RADIUS: 5.0,
            STRENGTH: 35.0,
            UPWARD_FORCE: 40.0,
            SUSPENSION_TIME: 0.5,
            CHARGE_DURATION: 0.3,
            CHARGE_AUDIO_VOLUME: 0.6,
            IMPACT_AUDIO_VOLUME: 1.0,
        },
    },
};

// ============================================
// CAMERA CONFIGURATION
// ============================================
export const CAMERA_CONFIG = {
    // Third-Person Camera
    THIRD_PERSON: {
        // Distance
        MIN_DISTANCE: 3.0,
        MAX_DISTANCE: 15.0,
        DEFAULT_DISTANCE: 8.0,
        ZOOM_SPEED: 2.0,
        
        // Angles
        MIN_VERTICAL_ANGLE: -Math.PI / 3, // -60 degrees
        MAX_VERTICAL_ANGLE: Math.PI / 3,  // 60 degrees
        DEFAULT_VERTICAL_ANGLE: 0.1,
        
        // Rotation
        ROTATION_SPEED: 2.0,
        SMOOTHING_FACTOR: 0.1,
        
        // Offset
        HEIGHT_OFFSET: 0.5,
        SIDE_OFFSET: 0.0,
        
        // Collision
        COLLISION_RADIUS: 0.3,
        COLLISION_OFFSET: 0.2,
    },
    
    // First-Person Camera
    FIRST_PERSON: {
        HEIGHT_OFFSET: 1.6,
        FOV: 75.0,
        MIN_FOV: 60.0,
        MAX_FOV: 90.0,
    },
    
    // Cinematic Camera
    CINEMATIC: {
        SMOOTHING_FACTOR: 0.05,
        MIN_DISTANCE: 5.0,
        MAX_DISTANCE: 20.0,
        AUTO_ROTATION_SPEED: 0.1,
    },
    
    // Camera Shake (EXAGGERATED)
    SHAKE: {
        WALK_INTENSITY: 0.02,
        RUN_INTENSITY: 0.05,
        SPRINT_INTENSITY: 0.08,
        EXPLOSION_INTENSITY: 0.5,
        SHOT_INTENSITY: 0.1,
        DECAY_RATE: 5.0,
        // Exaggerated combat shake
        MELEE_IMPACT_INTENSITY: 0.4,
        MELEE_IMPACT_DURATION: 0.15,
        RANGED_IMPACT_INTENSITY: 0.2,
        RANGED_IMPACT_DURATION: 0.1,
        REPLAY_IMPACT_INTENSITY: 0.6,
    },

    // Mouse Controls
    CONTROLS: {
        MOUSE_SENSITIVITY: 0.005,
        AUTO_FOLLOW: true,
        AUTO_FOLLOW_DELAY: 2.0,
    },

    // Chaos Camera (Cinematic FOV & Tracking)
    CHAOS_CAMERA: {
        FOV_NORMAL: 60,
        FOV_KICK_SINGLE: 50,
        FOV_KICK_DOUBLE: 45,
        FOV_KICK_TRIPLE: 40,
        FOV_KICK_DURATION: 0.5,
        FOV_RECOVERY_SPEED: 0.05,

        TRACKING_DISTANCE: 5,
        TRACKING_HEIGHT: 3,
        TRACKING_SMOOTHING: 0.1,

        KILLCAM_DURATION: 3.0,
        KILLCAM_ROTATION_SPEED: 60, // Grados por segundo
        KILLCAM_DISTANCE: 6,
        KILLCAM_HEIGHT: 2,
        KILLCAM_SLOW_MOTION: 0.1, // 10% timeScale
    }
};

// ============================================
// TARGETING CONFIGURATION
// ============================================
export const TARGET_CONFIG = {
    TARGET_RANGE: 15.0,
    TARGET_CONE: 60.0, // degrees
    AUTO_TARGET_ROTATION: true,
    TARGET_VISUAL_INDICATOR: true,
};

// ============================================
// PHYSICS CONFIGURATION
// ============================================
export const PHYSICS_CONFIG = {
    // Engine Settings
    ENGINE: {
        SUBSTEPS: 8,
        ITERATIONS: 10,
        FIXED_TIMESTEP: 1.0 / 60.0,
    },
    
    // Materials
    MATERIALS: {
        CONCRETE: {
            FRICTION: 0.8,
            RESTITUTION: 0.1,
            DENSITY: 2500.0,
        },
        ASPHALT: {
            FRICTION: 0.9,
            RESTITUTION: 0.1,
            DENSITY: 2400.0,
        },
        GRASS: {
            FRICTION: 0.6,
            RESTITUTION: 0.2,
            DENSITY: 1000.0,
        },
        DIRT: {
            FRICTION: 0.5,
            RESTITUTION: 0.1,
            DENSITY: 1500.0,
        },
        METAL: {
            FRICTION: 0.4,
            RESTITUTION: 0.3,
            DENSITY: 7800.0,
        },
        WOOD: {
            FRICTION: 0.5,
            RESTITUTION: 0.2,
            DENSITY: 700.0,
        },
        GLASS: {
            FRICTION: 0.3,
            RESTITUTION: 0.1,
            DENSITY: 2500.0,
        },
        RUBBER: {
            FRICTION: 0.9,
            RESTITUTION: 0.7,
            DENSITY: 1100.0,
        },
    },
    
    // Collision Layers
    LAYERS: {
        PLAYER: 1,
        VEHICLE: 2,
        ENVIRONMENT: 4,
        NPC: 8,
        PROP: 16,
        WEAPON: 32,
        PROJECTILE: 64,
        SENSOR: 128,
    },
    
    // Ragdoll Physics
    RAGDOLL: {
        ENABLED: true,
        STIFFNESS: 0.5,
        DAMPING: 0.1,
        MASS: 80.0,
    },
};

// ============================================
// INPUT CONFIGURATION
// ============================================
export const INPUT_CONFIG = {
    // Keyboard Controls
    KEYBOARD: {
        // Movement
        MOVE_FORWARD: ['KeyW', 'ArrowUp'],
        MOVE_BACKWARD: ['KeyS', 'ArrowDown'],
        MOVE_LEFT: ['KeyA', 'ArrowLeft'],
        MOVE_RIGHT: ['KeyD', 'ArrowRight'],
        
        // Actions
        JUMP: ['Space'],
        SPRINT: ['ShiftLeft', 'ShiftRight'],
        CROUCH: ['ControlLeft', 'ControlRight', 'KeyC'],
        INTERACT: ['KeyE'],
        ENTER_VEHICLE: ['KeyF'],
        
        // Combat
        ATTACK: ['Mouse0'],
        AIM: ['Mouse1'],
        RELOAD: ['KeyR'],
        SWITCH_WEAPON: ['Tab', 'KeyQ'],
        
        // Abilities
        ABILITY_GRAVITY_BLAST: ['KeyG'],
        
        // Camera
        ZOOM_IN: ['Equal', 'NumpadAdd'],
        ZOOM_OUT: ['Minus', 'NumpadSubtract'],
        
        // Menu
        PAUSE: ['Escape'],
        INVENTORY: ['KeyI'],
        MAP: ['KeyM'],
        
        // Vehicle
        VEHICLE_ACCELERATE: ['KeyW', 'ArrowUp'],
        VEHICLE_BRAKE: ['KeyS', 'ArrowDown'],
        VEHICLE_LEFT: ['KeyA', 'ArrowLeft'],
        VEHICLE_RIGHT: ['KeyD', 'ArrowRight'],
        VEHICLE_HANDBRAKE: ['Space'],
        VEHICLE_HORN: ['KeyH'],
    },
    
    // Mouse Settings
    MOUSE: {
        SENSITIVITY: 0.002,
        INVERT_Y: false,
        SMOOTHING: 0.5,
        ACCELERATION: 0.0,
    },
    
    // Gamepad Settings
    GAMEPAD: {
        DEADZONE: 0.1,
        SENSITIVITY: 1.0,
        VIBRATION_INTENSITY: 0.5,
    },
};

// ============================================
// GRAPHICS CONFIGURATION
// ============================================
export const GRAPHICS_CONFIG = {
    // Render Settings
    RENDERER: {
        ANTIALIASING: true,
        SHADOWS_ENABLED: true,
        SHADOW_MAP_SIZE: 2048,
        SHADOW_MAP_TYPE: 'PCFSoftShadowMap',
        
        // Post-Processing
        BLOOM_ENABLED: true,
        BLOOM_THRESHOLD: 0.8,
        BLOOM_STRENGTH: 1.5,
        BLOOM_RADIUS: 0.4,
        
        CHROMATIC_ABERRATION_ENABLED: false,
        FILM_GRAIN_ENABLED: false,
        VIGNETTE_ENABLED: true,
    },
    
    // Quality Presets
    QUALITY: {
        LOW: {
            SHADOW_MAP_SIZE: 512,
            ANTIALIASING: false,
            BLOOM_ENABLED: false,
            RENDER_DISTANCE: 100,
        },
        MEDIUM: {
            SHADOW_MAP_SIZE: 1024,
            ANTIALIASING: true,
            BLOOM_ENABLED: true,
            RENDER_DISTANCE: 200,
        },
        HIGH: {
            SHADOW_MAP_SIZE: 2048,
            ANTIALIASING: true,
            BLOOM_ENABLED: true,
            RENDER_DISTANCE: 400,
        },
        ULTRA: {
            SHADOW_MAP_SIZE: 4096,
            ANTIALIASING: true,
            BLOOM_ENABLED: true,
            RENDER_DISTANCE: 800,
        },
    },
    
    // View Distance
    VIEW_DISTANCE: {
        NEAR: 0.1,
        FAR: 1000.0,
        FOG_NEAR: 200.0,
        FOG_FAR: 600.0,
    },
};

// ============================================
// GRAPHICS PRESETS (5 LEVELS)
// ============================================
export const GRAPHICS_PRESETS = {
    FLAT_COLORS: {
        PLAYER: 0xFF6B6B,
        NPC_HOSTILE: 0xFF4444,
        NPC_HEAVY: 0x333333,
        GROUND: 0x8B9DC3,
        BUILDING: 0xC0A080,
        SKY: 0x87CEEB,
    },
    ULTRA: {
        name: 'ULTRA',
        shadowMapSize: 2048,
        antialiasing: true,
        bloom: true,
        buildingCount: 45,
        npcMaxCount: 60,
        renderDistance: 800,
        shadowsEnabled: true,
        cameraNear: 0.1,
        cameraFar: 1000,
        lodNear: 50,
        lodMedium: 150,
        lodFar: 300,
        frustumCullingDistance: 850,
    },
    HIGH: {
        name: 'HIGH',
        shadowMapSize: 1024,
        antialiasing: true,
        bloom: true,
        buildingCount: 40,
        npcMaxCount: 40,
        renderDistance: 400,
        shadowsEnabled: true,
        cameraNear: 0.1,
        cameraFar: 800,
        lodNear: 40,
        lodMedium: 120,
        lodFar: 250,
        frustumCullingDistance: 450,
    },
    MEDIUM: {
        name: 'MEDIUM',
        shadowMapSize: 512,
        antialiasing: true,
        bloom: true,
        buildingCount: 30,
        npcMaxCount: 25,
        renderDistance: 200,
        shadowsEnabled: true,
        cameraNear: 0.2,
        cameraFar: 500,
        lodNear: 30,
        lodMedium: 80,
        lodFar: 180,
        frustumCullingDistance: 250,
    },
    LOW: {
        name: 'LOW',
        shadowMapSize: 256,
        antialiasing: false,
        bloom: false,
        buildingCount: 15,
        npcMaxCount: 15,
        renderDistance: 100,
        shadowsEnabled: true,
        cameraNear: 0.3,
        cameraFar: 300,
        lodNear: 25,
        lodMedium: 60,
        lodFar: 120,
        frustumCullingDistance: 150,
        disableSpecular: true,
    },
    POTATO: {
        name: 'POTATO',
        shadowMapSize: 256,
        antialiasing: false,
        bloom: false,
        buildingCount: 8,
        npcMaxCount: 8,
        renderDistance: 50,
        shadowsEnabled: false,
        cameraNear: 0.5,
        cameraFar: 200,
        lodNear: 20,
        lodMedium: 40,
        lodFar: 80,
        frustumCullingDistance: 100,
        disableSpecular: true,
    },
};

// ============================================
// GRAPHICS SETTINGS HELPERS
// ============================================

// Get active preset from localStorage or default to MEDIUM
export function getActivePreset() {
    const saved = localStorage.getItem('graphicsPreset');
    if (saved && GRAPHICS_PRESETS[saved]) {
        return GRAPHICS_PRESETS[saved];
    }
    return GRAPHICS_PRESETS.MEDIUM;
}

// Save preset to localStorage
export function saveGraphicsPreset(presetName) {
    if (GRAPHICS_PRESETS[presetName]) {
        localStorage.setItem('graphicsPreset', presetName);
        console.log(`Graphics preset changed to: ${presetName}`);
        return true;
    }
    return false;
}

// Get preset name from preset object
export function getPresetName(preset) {
    return preset?.name || 'MEDIUM';
}

// Get next lower preset (for auto-downgrade)
export function getLowerPreset(currentPresetName) {
    const order = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW', 'POTATO'];
    const currentIndex = order.indexOf(currentPresetName);
    if (currentIndex < order.length - 1) {
        return GRAPHICS_PRESETS[order[currentIndex + 1]];
    }
    return null; // Already at lowest
}

// Get next higher preset (for auto-upgrade)
export function getHigherPreset(currentPresetName) {
    const order = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW', 'POTATO'];
    const currentIndex = order.indexOf(currentPresetName);
    if (currentIndex > 0) {
        return GRAPHICS_PRESETS[order[currentIndex - 1]];
    }
    return null; // Already at highest
}

// ============================================
// AUDIO CONFIGURATION (EXAGGERATED FOR VIRALITY)
// ============================================
export const AUDIO_CONFIG = {
    // Master Volume
    MASTER_VOLUME: 0.7,
    ENABLED: true,

    // Voice Culling
    MAX_VOICE_CHANNELS: 4,

    // Individual Sound Volumes
    BONK_VOLUME: 0.8,        // Strong knockback impact
    WHOOSH_VOLUME: 0.6,      // Knockback launch
    ARGH_VOLUME: 0.7,        // NPC death/pain
    CRASH_VOLUME: 0.5,       // Wall collision
    IMPACT_VOLUME: 0.9,      // Critical hit

    // Pitch Variation (±15%)
    PITCH_VARIATION: 0.15,

    // Spatial Audio
    SPATIAL_AUDIO: true,
    SPATIAL_MAX_DISTANCE: 50,

    // Category Volumes (Legacy support)
    MUSIC_VOLUME: 0.7,
    SFX_VOLUME: 0.9,
    VOICE_VOLUME: 0.9,
    AMBIENT_VOLUME: 0.6,
    VEHICLE_VOLUME: 0.7,

    // 3D Audio (Legacy)
    MAX_DISTANCE: 100.0,
    ROLLOFF_FACTOR: 1.0,

    // Doppler Effect (Legacy)
    DOPPLER_ENABLED: true,
    DOPPLER_FACTOR: 1.0,

    // Exaggerated Combat Sounds (ARCADE STYLE - NO REALISM)
    COMBAT: {
        // Melee Impact (Comic book style "BIFF!")
        MELEE_IMPACT_VOLUME: 0.7,
        MELEE_IMPACT_PITCH_MIN: 0.9,
        MELEE_IMPACT_PITCH_MAX: 1.1,

        // Ranged (Toy gun style "PEW!")
        RANGED_SHOT_VOLUME: 0.5,
        RANGED_SHOT_PITCH: 1.0,
        RANGED_IMPACT_VOLUME: 0.4,

        // Knockback Sounds
        KNOCKBACK_WALL_VOLUME: 0.8,
        KNOCKBACK_AIR_VOLUME: 0.3,

        // Death Sounds (Arcade style)
        DEATH_VOLUME: 0.9,
        DEATH_PITCH_START: 1.0,
        DEATH_PITCH_END: 0.5,

        // UI Sounds
        WEAPON_SWITCH_VOLUME: 0.3,
        DAMAGE_NUMBER_VOLUME: 0.2,
    },
};

// ============================================
// UI CONFIGURATION
// ============================================
export const UI_CONFIG = {
    // HUD Settings
    HUD: {
        OPACITY: 0.9,
        ANIMATION_DURATION: 0.3,
        MINIMAP_SIZE: 200,
        MINIMAP_ZOOM: 1.0,
    },
    
    // Menu Settings
    MENU: {
        TRANSITION_SPEED: 0.3,
        BLUR_BACKGROUND: true,
        BLUR_INTENSITY: 10,
    },
    
    // Notification Settings
    NOTIFICATIONS: {
        DISPLAY_TIME: 3.0,
        MAX_VISIBLE: 5,
        FADE_IN_DURATION: 0.3,
        FADE_OUT_DURATION: 0.3,
    },
};

// ============================================
// DEBUG CONFIGURATION
// ============================================
export const DEBUG_CONFIG = {
    ENABLED: false,
    
    // Debug Modes
    SHOW_PHYSICS: false,
    SHOW_COLLIDERS: false,
    SHOW_WIREFRAME: false,
    SHOW_FPS: false,
    SHOW_COORDINATES: false,
    
    // Logging
    LOG_LEVEL: 'info', // 'error', 'warn', 'info', 'debug'
    
    // Performance
    PROFILING_ENABLED: false,
    MEMORY_MONITORING: false,
};

// ============================================
// Export all configurations
// ============================================
export default {
    GAME_CONFIG,
    CAMERA_CONFIG,
    PHYSICS_CONFIG,
    INPUT_CONFIG,
    GRAPHICS_CONFIG,
    AUDIO_CONFIG,
    UI_CONFIG,
    DEBUG_CONFIG,
};

// Also export COMBAT separately for easier access
// Satirical Overlay Texts - DOPAMINE ARCHITECTURE
const SATIRICAL_TEXTS = {
    DEATH: [
        "SKILL ISSUE",
        "PHYSICS WINS",
        "OOPS",
        "RIP",
        "YIKES",
    ],
    CHAOS: [
        "PLOT TWIST",
        "ESCALATED",
        "OH NO",
        "ANARCHY",
    ],
    HIGH_VELOCITY: [
        "WHEEE",
        "FLYING",
        "ZOOM",
    ],
    NPC_CHAIN: [
        "FRIENDLY FIRE",
        "BETRAYAL",
        "OUCH",
        "ACCIDENT",
    ],
    RAGDOLL: [
        "DOWN",
        "GRAVITY WINS",
        "TUMBLE",
    ],
};

export const COMBAT_CONFIG = GAME_CONFIG.COMBAT;

// ============================================
// WAVE SYSTEM CONFIG
// ============================================
export const WAVE_SYSTEM_CONFIG = {
    INITIAL_WAVE: 1,
    MAX_WAVES: 10,
    INITIAL_NPC_COUNT: 5,
    SPAWN_RADIUS: 30,
    WAVE_SPAWN_DELAY: 10.0,
};

// ============================================
// JUICE SPRINT CONFIG (Amplified Impact Polish)
// ============================================
export const JUICE_SPRINT_CONFIG = {
    // Squash & Stretch (Ground Impact Deformation)
    SQUASH_STRETCH: {
        ENABLED: true,
        DURATION: 0.15,
        MIN_IMPACT_VELOCITY: 8.0,
        MAX_SQUASH_SCALE_Y: 0.5,
        MAX_STRETCH_SCALE_XZ: 1.3,
    },

    // Trails (Motion Lines for Flying NPCs)
    TRAILS: {
        ENABLED: true,
        SPAWN_THRESHOLD_VELOCITY: 15.0,
        COLOR: 0x00ffff,
        LIFETIME: 0.3,
        MAX_TRAILS: 100,
    },

    // Heavy NPC (Special Enemy Type)
    HEAVY_NPC: {
        SCALE: 1.5,
        COLOR: 0x333333,
        HEALTH: 150,
        KNOCKBACK_IMMUNE_MELEE: true,
        KNOCKBACK_VULNERABLE_BLAST: true,
    },

    // Dust Emitter (Building Impact Particles)
    DUST_EMITTER: {
        ENABLED: true,
        MAX_PARTICLES: 50,
        LIFETIME: 0.5,
        PARTICLES_PER_IMPACT: 5,
        MIN_IMPACT_VELOCITY: 15.0,
    },
};

// ============================================
// DOPAMINE ENGINE CONFIG (Chaos Score + Waves + VFX)
// ============================================
export const DOPAMINE_CONFIG = {
    // Chaos Score
    COMBO_DECAY_TIME: 3.0,
    POINTS_PER_NPC_IN_AIR: 10,
    MULTIPLIER_COLOR_THRESHOLDS: {
        0: 0xffff00,
        10: 0xff8800,
        25: 0xff0000,
    },

    // Wave System
    WAVE_SPAWN_RADIUS: 30,
    WAVE_SPAWN_DELAY: 10.0,
    MAX_WAVES: 10,

    // VFX
    DECAL_MAX_POOL: 20,
    DECAL_LIFETIME: 5.0,
    DECAL_SPAWN_VELOCITY_THRESHOLD: 20.0,

    // Post-Processing
    CHROMATIC_ABERRATION_DURATION: 0.15,
    CHROMATIC_ABERRATION_AMOUNT: 0.005,
};

// ============================================
// GRAB & LAUNCH ENTROPY SYSTEM CONFIG
// ============================================
export const GRAB_SYSTEM_CONFIG = {
    // Grab Mechanic
    GRAB_RANGE: 5.0,
    SPRING_CONSTANT: 500,
    SPRING_DAMPING: 0.3,
    
    // Charge System
    CHARGE_RATE: 5, // per frame (at 60fps = ~2 seconds to full)
    MAX_CHARGE: 100,
    
    // Launch Velocities (base)
    BASE_VELOCITY: 150,
    MAX_VELOCITY_BONUS: 200, // 150 + 200 = 350 at full charge
    
    // Object Type Multipliers
    NPC_MULTIPLIER: 1.0,
    VEHICLE_MULTIPLIER: 3.0,
    BUILDING_MULTIPLIER: 1.0,
    
    // Explosion Forces
    EXPLOSION_RADIUS_BASE: 20,
    EXPLOSION_RADIUS_VEHICLE: 40,
    EXPLOSION_FORCE_BASE: 500,
    EXPLOSION_FORCE_VEHICLE: 1500,
    
    // Screen Shake Multipliers
    SCREEN_SHAKE_NPC: 2.0,
    SCREEN_SHAKE_VEHICLE: 3.0,
    SCREEN_SHAKE_BUILDING: 1.5,
    
    // Impact Frames
    IMPACT_FRAMES_NPC: 3,
    IMPACT_FRAMES_VEHICLE: 6,
    IMPACT_FRAMES_BUILDING: 2,
    
    // Charge Visual
    COLOR_START: 0xFFFFFF, // White
    COLOR_MID: 0xFFFF00,   // Yellow at 50%
    COLOR_END: 0xFF0000,   // Red at 100%
    
    // Charge Audio
    AUDIO_FREQ_START: 400,
    AUDIO_FREQ_END: 800,
    
    // Impact Audio
    IMPACT_AUDIO_PITCH_MIN: 1.0,
    IMPACT_AUDIO_PITCH_MAX: 1.5,
    IMPACT_AUDIO_VOLUME: -3, // dB
    
    // Particles
    CHARGE_PARTICLE_COUNT: 20,
    CHARGE_PARTICLE_RADIUS: 2.0,
    CHARGE_PARTICLE_SPEED: 2.0,
    
    IMPACT_PARTICLE_COUNT_MIN: 50,
    IMPACT_PARTICLE_COUNT_MAX: 100,
    IMPACT_PARTICLE_COUNT_VEHICLE: 200,
    IMPACT_PARTICLE_VELOCITY_MIN: 50,
    IMPACT_PARTICLE_VELOCITY_MAX: 150,
    IMPACT_PARTICLE_LIFETIME: 2.0,
    IMPACT_PARTICLE_LIFETIME_MAX: 4.0,
    
    // Gore-Neon Colors
    GORE_COLORS: [
        0xFF0055, // Neon Red
        0x00FFFF, // Cyan
        0x00FF00, // Acid Green
        0xFF00FF, // Magenta
    ],
    
    // Glitch Effect
    GLITCH_DURATION: 3, // frames
    GLITCH_CHROMATIC_OFFSET: 3, // pixels
    GLITCH_NOISE_OPACITY: 0.1,
    
    // Audio Ducking
    AUDIO_DUCKING_DURATION: 0.1, // seconds
    AUDIO_DUCKING_DB: -9,
};

export { SATIRICAL_TEXTS };
