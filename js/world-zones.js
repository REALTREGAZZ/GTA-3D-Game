import * as THREE from 'three';

export const WORLD_ZONES = {
  ASH_THRONE: {
    name: 'El Trono de Ceniza',
    bounds: { min: { x: -500, z: -500 }, max: { x: -100, z: -100 } },
    boss: 'MALAKOR',
    ambience: { color: 0x8b4513, fogDensity: 0.005 },
    music: 'throne-of-ash.ogg',
    particle_effect: 'ash-dust',
  },

  WHISPER_GARDEN: {
    name: 'El Jardín de los Susurros',
    bounds: { min: { x: -100, z: -500 }, max: { x: 300, z: -100 } },
    boss: 'SYLPHIRA',
    ambience: { color: 0x4b7c59, fogDensity: 0.008 },
    music: 'whisper-garden.ogg',
    particle_effect: 'whisper-sparkles',
  },

  VOID_BREACH: {
    name: 'La Brecha del Vacío',
    bounds: { min: { x: -100, z: 100 }, max: { x: 300, z: 500 } },
    boss: 'VOID_EATER',
    ambience: { color: 0x1a0033, fogDensity: 0.01 },
    music: 'void-breach.ogg',
    particle_effect: 'void-vortex',
  },
};

export class ZoneManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.currentZone = null;
    this.zones = WORLD_ZONES;

    this._areaEl = typeof document !== 'undefined' ? document.getElementById('areaName') : null;
  }

  update() {
    if (!this.player) return;

    const playerPos = this.player.position || this.player.mesh?.position;
    if (!playerPos) return;

    for (const [key, zone] of Object.entries(this.zones)) {
      const inBounds =
        playerPos.x >= zone.bounds.min.x &&
        playerPos.x <= zone.bounds.max.x &&
        playerPos.z >= zone.bounds.min.z &&
        playerPos.z <= zone.bounds.max.z;

      if (inBounds && this.currentZone !== key) {
        this.transitionToZone(key, zone);
        break;
      }
    }
  }

  transitionToZone(zoneKey, zoneData) {
    console.log(`[ZoneManager] Transitioning to: ${zoneData.name}`);
    this.currentZone = zoneKey;

    // Fog/lighting ambience.
    const color = new THREE.Color(zoneData.ambience.color);

    if (this.scene.fog?.isFogExp2) {
      this.scene.fog.color.copy(color);
      this.scene.fog.density = zoneData.ambience.fogDensity;
    } else {
      // Swap to exponential fog so the "density" config works consistently.
      this.scene.fog = new THREE.FogExp2(color, zoneData.ambience.fogDensity);
    }

    // UI
    if (this._areaEl) {
      this._areaEl.textContent = zoneData.name;
    }

    // Music/particles hooks intentionally left as integration points.
    // audioEngine.playMusic(zoneData.music)
    // particleManager.startEffect(zoneData.particle_effect)
  }
}
