/**
 * UI System
 * Updates stamina bar, minimap marker, and area name.
 */

import * as THREE from 'three';

export function createUISystem({
    ui,
    player,
    gameState,
    terrainSize = 600,
    world = null,
} = {}) {
    const staminaBar = document.getElementById('staminaBar');
    const staminaValue = document.getElementById('staminaValue');

    const minimap = document.getElementById('minimap');
    const marker = minimap?.querySelector?.('.player-marker') || null;

    const areaNameEl = document.getElementById('areaName');

    const half = terrainSize / 2;

    function updateMinimap(position) {
        if (!minimap || !marker || !position) return;

        const rect = minimap.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const nx = THREE.MathUtils.clamp(position.x / half, -1, 1);
        const nz = THREE.MathUtils.clamp(position.z / half, -1, 1);

        const px = (w * 0.5) + nx * (w * 0.5 - 6);
        const py = (h * 0.5) + nz * (h * 0.5 - 6);

        marker.style.transform = `translate(${px}px, ${py}px)`;
    }

    function update() {
        const pState = player?.getState?.() || player?.state;
        const pos = player?.getPosition?.() || player?.mesh?.position;

        if (staminaBar && gameState?.player) {
            const stamina = pState?.stamina ?? gameState.player.stamina ?? 0;
            const max = gameState.player?.maxStamina || 100;
            const pct = max > 0 ? (stamina / max) * 100 : 0;
            staminaBar.style.width = `${THREE.MathUtils.clamp(pct, 0, 100)}%`;
            if (staminaValue) staminaValue.textContent = Math.round(stamina);
        }

        updateMinimap(pos);

        if (areaNameEl && world && pos) {
            areaNameEl.textContent = world.getAreaNameAt(pos.x, pos.z);
        }
    }

    return {
        update,
    };
}
