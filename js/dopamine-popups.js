/**
 * Dopamine Popups System
 * Creates neon text popups for epic combat moments
 */

import * as THREE from 'three';

const POPUP_MESSAGES = {
    YEET: { text: 'YEET!', color: 0xFFFF00, trigger: 'launch' },
    SQUASH: { text: 'SQUASH!', color: 0x00FFFF, trigger: 'squash' },
    BONK: { text: 'BONK!', color: 0xFF00FF, trigger: 'impact' },
    TRIPLE_BONK: { text: 'TRIPLE BONK!', color: 0x00FF00, trigger: 'multi' },
    MEGA_YEET: { text: 'MEGA YEET!', color: 0xFF6600, trigger: 'gravity_blast' },
    OCTUPLE_BONK: { text: 'OCTUPLE BONK!', color: 0xFF00FF, trigger: 'epic_event' },
};

export function createDopaminePopupSystem(scene, camera) {
    const popups = [];
    const pool = [];
    const poolSize = 50;
    
    // Pre-create pool of popup objects
    for (let i = 0; i < poolSize; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(4, 2);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        
        scene.add(mesh);
        
        pool.push({
            mesh,
            canvas,
            texture,
            active: false,
            timer: 0,
            duration: 1.5,
            scale: 1.0,
            velocity: new THREE.Vector3(),
            worldPos: new THREE.Vector3(),
        });
    }
    
    function drawTextOnCanvas(canvas, text, color) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Glow effect
        ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}99`;
        ctx.lineWidth = 3;
        ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }
    
    function getInactivePopup() {
        for (let i = 0; i < pool.length; i++) {
            if (!pool[i].active) {
                return pool[i];
            }
        }
        return null;
    }
    
    function spawn(worldPos, messageType, randomRotation = true) {
        const popup = getInactivePopup();
        if (!popup) return;
        
        const msgConfig = POPUP_MESSAGES[messageType] || POPUP_MESSAGES.BONK;
        
        // Draw text
        drawTextOnCanvas(popup.canvas, msgConfig.text, msgConfig.color);
        popup.texture.needsUpdate = true;
        
        // Position
        popup.worldPos.copy(worldPos);
        popup.mesh.position.copy(worldPos);
        popup.mesh.visible = true;
        
        // Random rotation (billboard effect)
        if (randomRotation) {
            popup.mesh.rotation.z = (Math.random() - 0.5) * Math.PI * 0.3;
        }
        
        // Velocity (float upward)
        popup.velocity.set(
            (Math.random() - 0.5) * 2,
            3,  // Upward
            0
        );
        
        // Reset animation
        popup.timer = 0;
        popup.duration = 1.5;
        popup.scale = 1.0;
        popup.active = true;
        
        popups.push(popup);
    }
    
    function update(dt) {
        for (let i = popups.length - 1; i >= 0; i--) {
            const popup = popups[i];
            
            popup.timer += dt;
            const progress = popup.timer / popup.duration;
            
            if (progress >= 1) {
                popup.active = false;
                popup.mesh.visible = false;
                popups.splice(i, 1);
                continue;
            }
            
            // Update position (float upward)
            popup.worldPos.add(popup.velocity.clone().multiplyScalar(dt));
            popup.mesh.position.copy(popup.worldPos);
            
            // Spring animation: scale up then down
            const springProgress = Math.sin(progress * Math.PI) * 0.3 + 0.7;
            popup.mesh.scale.set(springProgress, springProgress, 1);
            
            // Fade out at the end
            const alpha = 1 - (progress > 0.8 ? (progress - 0.8) / 0.2 : 0);
            popup.mesh.material.opacity = alpha;
            
            // Billboard: always face camera
            popup.mesh.lookAt(camera.position);
        }
    }
    
    function getActiveCount() {
        return popups.length;
    }
    
    return {
        spawn,
        update,
        getActiveCount,
    };
}