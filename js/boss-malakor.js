import * as THREE from 'three';
import { LegendaryEntity } from './legendary-entity.js';

export class Malakor extends LegendaryEntity {
  constructor(position, model, options = {}) {
    super('MALAKOR, EL ARCHITECTO DEL CAOS', position, model, options);

    this.maxHealth = 1500;
    this.health = 1500;

    this.setupDialogue([
      { text: '¿Creíste que este mundo se construyó para ser habitado?', duration: 3 },
      { text: 'Fue construido...', duration: 2 },
      { text: '...para ser tu TUMBA.', duration: 3 },
    ]);

    this.terrainChunks = [];
  }

  combatPhase1State() {
    if (this.attackCooldown > 0) return;
    this.castDeconstructGeometry();
    this.attackCooldown = 3;
  }

  castDeconstructGeometry() {
    if (!this.scene) return;

    console.log('[MALAKOR] Casting Geometric Deconstruction!');

    const chunkCount = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < chunkCount; i++) {
      const chunkSize = 12 + Math.random() * 10;
      const chunkGeometry = new THREE.BoxGeometry(chunkSize, chunkSize, chunkSize);
      const chunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.6,
        metalness: 0.3,
        emissive: 0xff6600,
        emissiveIntensity: 0.3,
      });

      const chunk = new THREE.Mesh(chunkGeometry, chunkMaterial);
      chunk.castShadow = true;
      chunk.receiveShadow = true;

      chunk.position.set(
        this.model.position.x + (Math.random() - 0.5) * 200,
        this.model.position.y + 60 + Math.random() * 40,
        this.model.position.z + (Math.random() - 0.5) * 200
      );

      this.terrainChunks.push(chunk);
      this.scene.add(chunk);

      setTimeout(() => {
        this.scene?.remove(chunk);
        chunkGeometry.dispose();
        chunkMaterial.dispose();
        this.terrainChunks = this.terrainChunks.filter((c) => c !== chunk);
      }, 5000);
    }
  }

  enragedState() {
    if (this.attackCooldown > 0) return;

    this.castDeconstructGeometry();
    this.castDeconstructGeometry();

    this.attackCooldown = 1.5;
  }
}
