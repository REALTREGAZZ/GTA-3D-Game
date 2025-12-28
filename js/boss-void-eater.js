import * as THREE from 'three';
import { LegendaryEntity } from './legendary-entity.js';

export class VoidEater extends LegendaryEntity {
  constructor(position, model, options = {}) {
    super('VOID-EATER', position, model, options);

    this.maxHealth = 2000;
    this.health = 2000;

    this.setupDialogue([
      { text: '[Estática ininteligible]', duration: 2 },
      { text: '...CONSUMIR...', duration: 2 },
      { text: '...TODO...', duration: 3 },
    ]);

    this.gravityWell = null;
    this.wellRadius = 150;
  }

  combatPhase1State() {
    if (this.attackCooldown > 0) return;

    this.castGravityWell();
    this.attackCooldown = 5;
  }

  castGravityWell() {
    if (!this.scene) return;

    console.log('[VOID-EATER] Casting Gravity Well!');

    if (this.gravityWell) {
      this.scene.remove(this.gravityWell);
      this.gravityWell.geometry.dispose();
      this.gravityWell.material.dispose();
      this.gravityWell = null;
    }

    const wellGeometry = new THREE.SphereGeometry(this.wellRadius, 32, 32);
    const wellMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      emissive: 0x6600ff,
      emissiveIntensity: 0.8,
    });

    this.gravityWell = new THREE.Mesh(wellGeometry, wellMaterial);
    this.gravityWell.position.copy(this.model.position);
    this.gravityWell.position.y += 50;
    this.gravityWell.receiveShadow = false;
    this.gravityWell.castShadow = false;

    this.scene.add(this.gravityWell);

    setTimeout(() => {
      this.explodeGravityWell();
    }, 6000);
  }

  explodeGravityWell() {
    if (!this.scene || !this.gravityWell) return;

    console.log('[VOID-EATER] Gravity Well explodes!');

    this.scene.remove(this.gravityWell);
    this.gravityWell.geometry.dispose();
    this.gravityWell.material.dispose();
    this.gravityWell = null;
  }

  enragedState() {
    if (this.attackCooldown > 0) return;

    this.castGravityWell();
    this.attackCooldown = 3;
  }
}
