# Mixamo Character System Setup Guide

## Overview

This game now supports realistic humanoid characters imported from Mixamo with full skeletal rigging, animations, IK, and ragdoll physics.

## 📥 Downloading Models from Mixamo

### Step 1: Create Mixamo Account
1. Visit [https://www.mixamo.com/](https://www.mixamo.com/)
2. Sign in with your Adobe ID (free account)

### Step 2: Choose Character Models
Recommended characters for variety:
- **Player Character**: "Aj" or "Knight" (distinct, heroic look)
- **NPC Variants**:
  - "Ty" (casual civilian)
  - "Rufus" (street style)
  - "Kaya" (diverse body type)
  - "Malcolm" (heavy build)

### Step 3: Download Character
1. Select a character
2. Click "Download"
3. Format: **glTF Binary (.glb)** ← IMPORTANT!
4. Options:
   - Include: ✅ T-Pose (rest pose)
   - Skin: ✅ With Skin
   - Save to: `/assets/models/[CharacterName].glb`

### Step 4: Download Animations
For each animation needed:

#### Core Animations (Required)
- **Idle**: "Idle" or "Breathing Idle"
- **Walk**: "Walking" or "Catwalk Walk"
- **Run**: "Running" or "Fast Run"
- **Jump**: "Jump" or "Standing Jump"
- **Fall**: "Falling Idle" or "Free Fall"
- **Land**: "Hard Landing" or "Landing"

#### Combat Animations (Recommended)
- **Hit Reaction**: "Hit Reaction" or "Being Hit"
- **Death**: "Death" or "Dying"
- **Punch**: "Punching" or "Hook Punch"
- **Kick**: "Kick" or "Roundhouse Kick"

#### Grab System Animations
- **Grabbed**: "Hanging Idle" or "Struggling"
- **Launched**: "Falling Back" or "Knocked Down"

### Download Settings for Animations:
1. Apply animation to your chosen character
2. Format: **glTF Binary (.glb)**
3. Settings:
   - ✅ In Place (for locomotion)
   - Frame Rate: 30 fps
   - Reduce Keyframes: ✅ Uniform
4. Save to: `/assets/models/animations/[AnimationName].glb`

## 📁 File Structure

```
/assets/
  /models/
    # Character Models
    Player_Aj.glb          # Player character
    NPC_Ty.glb             # Civilian NPC
    NPC_Rufus.glb          # Street NPC
    NPC_Malcolm.glb        # Heavy NPC
    
    /animations/
      # Locomotion
      Idle.glb
      Walk.glb
      Run.glb
      Jump.glb
      Fall.glb
      Land.glb
      
      # Combat
      HitReaction.glb
      Death.glb
      Punch.glb
      Kick.glb
      
      # Grab System
      Grabbed.glb
      Launched.glb
```

## 🔧 Integration Code Example

### Loading a Character

```javascript
import { MixamoCharacterLoader, MixamoCharacter } from './mixamo-character-system.js';

const loader = new MixamoCharacterLoader();

// Load player character
const playerCharacter = await loader.loadCharacter('/assets/models/Player_Aj.glb');

// Create character controller
const player = new MixamoCharacter(playerCharacter, physicsWorld, terrainMesh);

// Load animations
const idleAnim = await loader.loadAnimations('/assets/models/animations/Idle.glb');
const walkAnim = await loader.loadAnimations('/assets/models/animations/Walk.glb');
const runAnim = await loader.loadAnimations('/assets/models/animations/Run.glb');

// Setup animation state machine
player.setupAnimations({
    'idle': idleAnim[0],
    'walk': walkAnim[0],
    'run': runAnim[0],
});

// Add to scene
scene.add(player.scene);

// Game loop
function update(deltaTime) {
    player.update(deltaTime);
    
    // Play animations based on state
    if (isMoving) {
        player.playAnimation(isRunning ? 'run' : 'walk');
    } else {
        player.playAnimation('idle');
    }
}
```

### Color Variations for NPCs

```javascript
// Load base NPC model
const npcData = await loader.loadCharacter('/assets/models/NPC_Ty.glb');
const npc = new MixamoCharacter(npcData, physicsWorld, terrainMesh);

// Apply random color variation
const colors = [0xff4444, 0x4444ff, 0x44ff44, 0xffff44, 0xaa44ff];
const randomColor = colors[Math.floor(Math.random() * colors.length)];

const material = new THREE.MeshToonMaterial({
    color: randomColor,
    skinning: true, // IMPORTANT for skeletal animation
});

npc.setMaterial(material);
```

### Ragdoll on Impact

```javascript
// When NPC is grabbed/hit with high force
if (impactForce > 10) {
    npc.enableRagdoll();
    
    // Apply knockback force
    const knockbackForce = new THREE.Vector3(direction.x, 5, direction.z);
    knockbackForce.multiplyScalar(impactForce);
    
    const impactPoint = npc.getPosition();
    npc.applyKnockback(knockbackForce, impactPoint);
}

// Recover from ragdoll after 3 seconds
setTimeout(() => {
    npc.disableRagdoll();
    npc.playAnimation('idle');
}, 3000);
```

### Foot IK (Automatic)

```javascript
// Foot IK is automatically applied when character is grounded
// To disable IK (e.g., during ragdoll):
npc.footIK.setEnabled(false);

// Re-enable when recovered:
npc.footIK.setEnabled(true);
```

## 🎨 Material Setup for Toon Shading

To maintain the game's aesthetic, apply toon materials to Mixamo characters:

```javascript
function applyToonMaterial(character, color) {
    const material = new THREE.MeshToonMaterial({
        color: color,
        skinning: true, // Required for skeletal animation
        gradientMap: createToonGradientTexture(), // 3-step toon gradient
    });
    
    character.setMaterial(material);
}

function createToonGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    
    // 3-step gradient (dark, mid, light)
    ctx.fillStyle = '#222222'; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#888888'; ctx.fillRect(1, 0, 2, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    
    return texture;
}
```

## ⚡ Performance Optimization

### LOD (Level of Detail)

```javascript
// Disable animations for off-screen NPCs
function updateNPCs(deltaTime, camera) {
    npcs.forEach(npc => {
        const distanceToCamera = npc.getPosition().distanceTo(camera.position);
        
        if (distanceToCamera > 50) {
            // Don't update animations for distant NPCs
            npc.animationStateMachine?.setSpeed(0);
        } else {
            npc.animationStateMachine?.setSpeed(1);
            npc.update(deltaTime);
        }
    });
}
```

### Frustum Culling

```javascript
// Only update visible NPCs
const frustum = new THREE.Frustum();
const cameraViewProjectionMatrix = new THREE.Matrix4();

function updateVisibleNPCs(deltaTime, camera) {
    camera.updateMatrixWorld();
    cameraViewProjectionMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
    
    npcs.forEach(npc => {
        if (frustum.containsPoint(npc.getPosition())) {
            npc.update(deltaTime);
        }
    });
}
```

## 🐛 Troubleshooting

### Issue: Character appears but doesn't animate
**Solution**: Ensure animations are loaded and mapped correctly
```javascript
console.log('Available animations:', characterData.animations);
```

### Issue: Feet sink into ground
**Solution**: Adjust capsule collider offset
```javascript
// In MixamoCharacter.update()
this.scene.position.y -= 0.9; // Adjust this value (typically 0.8-1.0)
```

### Issue: Ragdoll flies off wildly
**Solution**: Reduce impulse force or add damping
```javascript
ragdollSystem.applyImpulse(force.multiplyScalar(0.5), point);
```

### Issue: Animations are too fast/slow
**Solution**: Adjust animation speed
```javascript
player.animationStateMachine.setSpeed(0.8); // 80% speed
```

## 📚 Advanced Features

### Custom Animation Blending

```javascript
// Blend between walk and run based on speed
const speed = velocity.length();
const walkWeight = Math.max(0, 1 - (speed - 3) / 2);
const runWeight = Math.max(0, (speed - 3) / 2);

walkAction.setEffectiveWeight(walkWeight);
runAction.setEffectiveWeight(runWeight);
```

### Bone-Targeted Effects

```javascript
// Add glow effect to specific bone (e.g., weapon hand)
const rightHandBone = character.skeleton.boneMap['RightHand'];
if (rightHandBone) {
    const glowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1),
        new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    rightHandBone.add(glowSphere);
}
```

### Procedural Animation Mixing

```javascript
// Add head look-at during idle
const headBone = character.skeleton.boneMap['Head'];
if (headBone && target) {
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(target.position, headBone.position, new THREE.Vector3(0, 1, 0));
    const lookAtQuat = new THREE.Quaternion();
    lookAtQuat.setFromRotationMatrix(lookAtMatrix);
    
    // Blend with animation
    headBone.quaternion.slerp(lookAtQuat, 0.1);
}
```

## ✅ Acceptance Checklist

- [ ] Downloaded 3+ character models from Mixamo
- [ ] Downloaded all core animations (idle, walk, run, jump, fall)
- [ ] Models load without errors
- [ ] Characters animate smoothly
- [ ] Feet stay on ground (no sinking/floating)
- [ ] Capsule collision prevents interpenetration
- [ ] Ragdoll activates on high impacts
- [ ] Color variations applied to NPCs
- [ ] Player character has distinct appearance
- [ ] 30+ FPS with 20+ animated NPCs
- [ ] Foot IK prevents unnatural poses
- [ ] Transitions between animations are smooth

## 🎮 Integration with Existing Systems

### Grab System
```javascript
// In grab-system.js
if (grabbedNPC.enableRagdoll) {
    grabbedNPC.enableRagdoll();
}
```

### Combat System
```javascript
// In combat-system.js
npc.playAnimation('hitReaction');
setTimeout(() => {
    npc.enableRagdoll();
    npc.applyKnockback(knockbackForce, impactPoint);
}, 100);
```

### Emotion System (Optional)
While Mixamo characters don't have the canvas-based emotion system, you can use blend shapes or morph targets if included in the model, or overlay UI emotion indicators above character heads.

## 📞 Support

For issues or questions, consult:
- Mixamo Documentation: https://helpx.adobe.com/creative-cloud/help/mixamo.html
- Three.js SkinnedMesh: https://threejs.org/docs/#api/en/objects/SkinnedMesh
- Cannon.js Physics: https://pmndrs.github.io/cannon-es/

---

**Note**: This system is designed to work alongside the existing low-poly character system. Both can coexist, and you can switch between them by setting a configuration flag.
