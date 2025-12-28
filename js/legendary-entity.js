import * as THREE from 'three';

export class LegendaryEntity {
  constructor(name, position, model, options = {}) {
    this.name = name;
    this.position = position?.clone?.() || new THREE.Vector3();
    this.model = model || new THREE.Group();

    this.scene = options.scene || null;
    this.player = options.player || null;
    this.dialogueSystem = options.dialogueSystem || null;

    this.model.position.copy(this.position);

    this.state = 'IDLE';
    this.states = {
      IDLE: () => this.idleState(),
      MONOLOGUE: () => this.monologueState(),
      COMBAT_PHASE_1: () => this.combatPhase1State(),
      ENRAGED: () => this.enragedState(),
    };

    this.health = 1000;
    this.maxHealth = 1000;
    this.isMonologuing = false;
    this.detectionRadius = 100;

    this.dialogue = [];
    this.dialogueIndex = 0;
    this.dialogueTimer = 0;

    this.attackCooldown = 0;
    this.phase = 1;
  }

  setPlayer(player) {
    this.player = player;
  }

  setScene(scene) {
    this.scene = scene;
  }

  setDialogueSystem(dialogueSystem) {
    this.dialogueSystem = dialogueSystem;
  }

  setupDialogue(lines) {
    this.dialogue = Array.isArray(lines) ? lines : [];
    this.dialogueIndex = 0;
  }

  startMonologue() {
    if (this.isMonologuing || this.dialogue.length === 0) return;

    this.isMonologuing = true;
    this.state = 'MONOLOGUE';
    this.dialogueIndex = 0;

    this._showDialogueLine();
  }

  _showDialogueLine() {
    if (this.dialogueIndex >= this.dialogue.length) {
      this.endMonologue();
      return;
    }

    const line = this.dialogue[this.dialogueIndex];
    const text = line?.text ?? '';
    const duration = Math.max(0.5, line?.duration ?? 3);

    if (this.dialogueSystem?.showDialogue) {
      this.dialogueSystem.showDialogue(this.name, text, duration);
    } else {
      console.log(`[${this.name}] ${text}`);
    }

    this.dialogueTimer = duration;
  }

  endMonologue() {
    this.isMonologuing = false;
    this.state = 'COMBAT_PHASE_1';
  }

  idleState() {
    if (!this.player) return;

    const playerPos = this.player.position || this.player.mesh?.position;
    if (!playerPos) return;

    const dist = playerPos.distanceTo(this.model.position);
    if (dist <= this.detectionRadius) {
      this.startMonologue();
    }
  }

  monologueState() {
    // Driven by dialogue timer in update().
  }

  combatPhase1State() {
    // Override in subclasses.
  }

  enragedState() {
    // Override in subclasses.
  }

  takeDamage(amount) {
    this.health -= amount;

    if (this.health <= this.maxHealth * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.state = 'ENRAGED';
      console.log(`[${this.name}] ENRAGED!`);
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    console.log(`[${this.name}] Defeated!`);
  }

  update(deltaTime) {
    if (this.state && this.states[this.state]) {
      this.states[this.state]();
    }

    if (this.state === 'MONOLOGUE') {
      this.dialogueTimer -= deltaTime;
      if (this.dialogueTimer <= 0) {
        this.dialogueIndex++;
        this._showDialogueLine();
      }
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

    if (this.model?.mixer) {
      this.model.mixer.update(deltaTime);
    }
  }
}
