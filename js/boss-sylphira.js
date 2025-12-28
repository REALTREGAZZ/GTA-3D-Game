import * as THREE from 'three';
import { LegendaryEntity } from './legendary-entity.js';

export class Sylphira extends LegendaryEntity {
  constructor(position, model, options = {}) {
    super('SYLPHIRA, LA VOZ DEL SILENCIO', position, model, options);

    this.maxHealth = 1200;
    this.health = 1200;

    this.setupDialogue([
      { text: 'Escucha...', duration: 2 },
      { text: '¿Oyes el sonido de tu código borrándose?', duration: 4 },
      { text: 'Pronto no existirás...', duration: 3 },
    ]);

    this.clones = [];
  }

  combatPhase1State() {
    if (this.attackCooldown > 0) return;

    this.castMirrorDimension(4);
    this.attackCooldown = 4;
  }

  castMirrorDimension(cloneCount = 4) {
    if (!this.scene || !this.model) return;

    console.log('[SYLPHIRA] Creating Mirror Dimension!');

    // Cleanup previous clones
    for (const c of this.clones) {
      this.scene.remove(c.model);
    }
    this.clones = [];

    this.model.visible = false;

    for (let i = 0; i < cloneCount; i++) {
      const angle = (i / cloneCount) * Math.PI * 2;
      const clonePos = new THREE.Vector3(
        this.position.x + Math.cos(angle) * 50,
        this.position.y,
        this.position.z + Math.sin(angle) * 50
      );

      const clone = this.model.clone(true);
      clone.position.copy(clonePos);
      clone.visible = true;

      clone.traverse((node) => {
        if (node.isMesh && node.material) {
          if (node.material.emissive) {
            node.material.emissive.setHex(0x9370db);
            node.material.emissiveIntensity = 0.5;
            node.material.needsUpdate = true;
          }
        }
      });

      this.scene.add(clone);
      this.clones.push({ model: clone, position: clonePos, isReal: i === 0 });
    }
  }

  takeDamage(amount, source) {
    if (source === 'clone' && this.clones.length > 0) {
      console.log('[SYLPHIRA] Reflecting damage back to player!');
      return;
    }

    super.takeDamage(amount);
  }

  enragedState() {
    if (this.attackCooldown > 0) return;

    this.castMirrorDimension(6);
    this.attackCooldown = 2;
  }
}
