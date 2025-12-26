# Knockback & Ragdoll-Lite System

## Overview
This system adds exaggerated physics-based knockback to NPCs when they are hit by the player, followed by a 2-second "ragdoll-lite" state where they lose control and behave as simple physics objects.

## Features

### 1. Knockback Physics
- **Strong Initial Impulse**: NPCs are launched backward with configurable force (default: 25 units/s)
- **Upward Component**: 40% of horizontal force is applied vertically for dramatic arc
- **Gradual Deceleration**: Friction reduces velocity smoothly (default: 0.92 per frame)
- **Direction Accuracy**: Always from player towards NPC

### 2. Ragdoll-Lite State
- **Duration**: 2 seconds (configurable)
- **AI Disabled**: No pathfinding, attacking, or decision-making during ragdoll
- **Physics Only**: Velocity + gravity + friction only
- **Visual Feedback**: 
  - Body tilts based on horizontal speed
  - Color changes to gray during ragdoll
  - Gradual recovery animation when standing up
- **Collision Handling**: 
  - Buildings: Bounce off with velocity reversal
  - Terrain: Snap to ground, stop falling on impact

### 3. Combat Integration
- **Melee Attacks**: Full knockback force (25 units/s)
- **Ranged Attacks**: 70% knockback force (17.5 units/s)
- **Visual Effects**: Impact particles, camera shake, sound effects

## Configuration

Add these parameters to `GAME_CONFIG.COMBAT` in `js/config.js`:

```javascript
// Knockback & Ragdoll-Lite (for NPCs)
KNOCKBACK_FORCE: 25.0,           // Magnitude of initial impulse
KNOCKBACK_FRICTION: 0.92,        // Deceleration per frame (1.0 = no friction)
RAGDOLL_DURATION: 2.0,           // Seconds in ragdoll state
RAGDOLL_GRAVITY_SCALE: 1.2,      // Gravity during ragdoll (can be stronger)
```

## Implementation Details

### Files Modified

1. **js/config.js**
   - Added 4 new combat configuration parameters

2. **js/npc.js**
   - Added `isRagdoll`, `ragdollTimer`, `savedState` to NPC state
   - Added `enterRagdoll()` and `exitRagdoll()` functions
   - Added ragdoll physics loop in `update()` function
   - Ragdoll physics handles:
     - Gravity application (1.2x stronger)
     - Friction to horizontal velocity
     - Building collision with bounce
     - Terrain snapping
     - Visual tilt based on speed
     - Timer countdown and recovery

3. **js/combat-system.js**
   - Added `applyKnockbackToNPC(npc, direction, force)` function
   - Modified `performMeleeAttack()` to apply knockback
   - Modified bullet collision handler to apply knockback
   - Added impact particles and camera shake

## Usage

### From Combat System
```javascript
// Apply knockback to an NPC
applyKnockbackToNPC(npc, attackDirection, GAME_CONFIG.COMBAT.KNOCKBACK_FORCE);
```

### From NPC API
```javascript
// Manually trigger ragdoll (advanced usage)
npc.enterRagdoll(2.0);  // 2 seconds

// Check if NPC is in ragdoll
if (npc.state.isRagdoll) {
    // NPC is currently ragdolled
}
```

## Technical Notes

- **No External Physics Engine**: Uses manual integration for simplicity
- **Performance**: Minimal overhead, only active ragdoll NPCs run physics
- **Compatibility**: Works with existing NPC AI, buildings, terrain systems
- **Visual Polish**: Smooth transitions, particle effects, camera shake

## Future Enhancements (for Aggro Chain phase)

- NPCs can knockback other NPCs
- Chain reactions when ragdolled NPCs collide
- Damage transfer between NPCs during collisions
- Environmental hazards (water, edges, etc.)

## Testing

To test the knockback system:
1. Start the game
2. Find an NPC
3. Left-click (melee) or Right-click (ranged) to attack
4. Observe NPC flying backward
5. Watch for 2-second ragdoll recovery
6. Verify NPC returns to normal AI after recovery

Expected behavior:
- NPCs fly backward dramatically
- NPCs bounce off buildings if hit
- NPCs gradually decelerate and land
- NPCs stand up after 2 seconds
- NPCs resume normal behavior after recovery
