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
    
    // Combat Settings
    COMBAT: {
        // Weapons
        WEAPON_SWITCH_TIME: 0.3,
        RELOAD_TIME: 2.0,
        
        // Melee
        MELEE_RANGE: 2.0,
        MELEE_DAMAGE: 10,
        MELEE_COOLDOWN: 0.5,
        
        // Firearms
        BULLET_SPEED: 200.0,
        BULLET_GRAVITY: 0.0,
        BULLET_LIFETIME: 5.0,
        
        // Hit Detection
        HEADSHOT_MULTIPLIER: 2.0,
        LIMB_DAMAGE_MULTIPLIER: 0.8,
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
        MIN_VERTICAL_ANGLE: 0.1,
        MAX_VERTICAL_ANGLE: Math.PI / 2 - 0.1,
        DEFAULT_VERTICAL_ANGLE: 0.3,
        
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
    
    // Camera Shake
    SHAKE: {
        WALK_INTENSITY: 0.02,
        RUN_INTENSITY: 0.05,
        SPRINT_INTENSITY: 0.08,
        EXPLOSION_INTENSITY: 0.5,
        SHOT_INTENSITY: 0.1,
        DECAY_RATE: 5.0,
    },
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
    ULTRA: {
        name: 'ULTRA',
        shadowMapSize: 4096,
        antialiasing: true,
        bloom: true,
        buildingCount: 45,
        renderDistance: 800,
        shadowsEnabled: true,
    },
    HIGH: {
        name: 'HIGH',
        shadowMapSize: 2048,
        antialiasing: true,
        bloom: true,
        buildingCount: 40,
        renderDistance: 400,
        shadowsEnabled: true,
    },
    MEDIUM: {
        name: 'MEDIUM',
        shadowMapSize: 1024,
        antialiasing: true,
        bloom: true,
        buildingCount: 30,
        renderDistance: 200,
        shadowsEnabled: true,
    },
    LOW: {
        name: 'LOW',
        shadowMapSize: 512,
        antialiasing: false,
        bloom: false,
        buildingCount: 15,
        renderDistance: 100,
        shadowsEnabled: true,
    },
    POTATO: {
        name: 'POTATO',
        shadowMapSize: 256,
        antialiasing: false,
        bloom: false,
        buildingCount: 8,
        renderDistance: 50,
        shadowsEnabled: false,
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
// AUDIO CONFIGURATION
// ============================================
export const AUDIO_CONFIG = {
    // Master Volume
    MASTER_VOLUME: 1.0,
    
    // Category Volumes
    MUSIC_VOLUME: 0.7,
    SFX_VOLUME: 0.8,
    VOICE_VOLUME: 0.9,
    AMBIENT_VOLUME: 0.6,
    VEHICLE_VOLUME: 0.7,
    
    // 3D Audio
    SPATIAL_AUDIO: true,
    MAX_DISTANCE: 100.0,
    ROLLOFF_FACTOR: 1.0,
    
    // Doppler Effect
    DOPPLER_ENABLED: true,
    DOPPLER_FACTOR: 1.0,
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
