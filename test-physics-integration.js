/**
 * Test script to verify physics integration is working
 * This can be run in the browser console to test player physics
 */

// Test 1: Check if physics system is initialized
console.log('=== Physics Integration Test ===');
console.log('Physics System:', window.Physics || 'Not initialized');
console.log('Player Controller:', window.Player || 'Not initialized');

if (window.Player && window.Player.state) {
    console.log('Player Physics Body:', window.Player.state.physicsBody || 'Not set');
    console.log('Player Position:', window.Player.getPosition());
    console.log('Player Grounded:', window.Player.state.isGrounded);
}

// Test 2: Check if terrain colliders exist
if (window.Physics) {
    console.log('Terrain Colliders:', window.Physics.colliders.length);
    console.log('Physics World:', window.Physics.world || 'Not initialized');
}

// Test 3: Movement test (can be run manually)
window.testPlayerMovement = function() {
    if (!window.Player) {
        console.warn('Player not available');
        return;
    }
    
    console.log('Testing player movement...');
    const originalPos = window.Player.getPosition().clone();
    
    // Simulate WASD input
    const mockInput = {
        KeyW: true, // Forward
        ArrowUp: false,
        KeyA: false,
        ArrowLeft: false,
        KeyS: false,
        ArrowDown: false,
        KeyD: false,
        ArrowRight: false,
        ShiftLeft: false,
        ShiftRight: false,
        ControlLeft: false,
        ControlRight: false,
        Space: false
    };
    
    // Update player with mock input
    window.Player.update(0.016, mockInput, [], 0, 0);
    
    const newPos = window.Player.getPosition();
    const moved = originalPos.distanceTo(newPos);
    
    console.log('Movement test result:');
    console.log('  Original position:', originalPos);
    console.log('  New position:', newPos);
    console.log('  Distance moved:', moved.toFixed(4));
    console.log('  Movement working:', moved > 0.01 ? '✅ YES' : '❌ NO');
};

// Test 4: Physics collision test
window.testPhysicsCollision = function() {
    if (!window.Player || !window.Player.state.physicsBody) {
        console.warn('Physics not properly initialized');
        return;
    }
    
    console.log('Testing physics collision...');
    const physicsBody = window.Player.state.physicsBody;
    
    // Check if body has proper properties
    const hasMass = physicsBody.mass() > 0;
    const hasPosition = physicsBody.translation();
    const hasVelocity = physicsBody.linvel();
    
    console.log('Physics body properties:');
    console.log('  Mass:', physicsBody.mass());
    console.log('  Position:', hasPosition);
    console.log('  Velocity:', hasVelocity);
    console.log('  Dynamic body:', !physicsBody.isKinematic());
    console.log('  Collider count:', window.Physics.colliders.length);
    
    const physicsWorking = hasMass && hasPosition && hasVelocity && window.Physics.colliders.length > 0;
    console.log('Physics integration:', physicsWorking ? '✅ WORKING' : '❌ NOT WORKING');
};

// Test 5: Performance test
window.testPerformance = function() {
    console.log('Testing performance systems...');
    
    console.log('Performance Manager:', window.PerformanceManager || 'Not available');
    console.log('Enhanced Performance Manager:', window.PerformanceManagerEnhanced || 'Not available');
    
    if (window.PerformanceManagerEnhanced) {
        const perfState = window.PerformanceManagerEnhanced.getState();
        console.log('Performance state:', perfState);
    }
    
    // Check FPS
    const fpsElement = document.getElementById('fpsValue') || document.getElementById('fpsCounter');
    if (fpsElement) {
        console.log('Current FPS:', fpsElement.textContent);
    }
};

console.log('\n=== Test Functions Available ===');
console.log('Run these in console to test:');
console.log('  testPlayerMovement() - Test player movement');
console.log('  testPhysicsCollision() - Test physics collision');
console.log('  testPerformance() - Test performance systems');
console.log('==================================');