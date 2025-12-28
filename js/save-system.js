/**
 * Save System
 * Simple LocalStorage persistence for player/world state.
 */

import * as THREE from 'three';

export function createSaveSystem({ storageKey = 'gta5ds_save_v1' } = {}) {
    function save({
        player,
        gameState,
        graphicsPresetName = null,
    } = {}) {
        const pos = player?.getPosition?.() || player?.mesh?.position;
        const pState = player?.getState?.() || player?.state;

        const payload = {
            version: 1,
            time: Date.now(),
            graphicsPresetName,
            player: {
                position: pos ? { x: pos.x, y: pos.y, z: pos.z } : null,
                stamina: pState?.stamina ?? gameState?.player?.stamina ?? null,
            },
            game: gameState ? {
                health: gameState.player.health,
                armor: gameState.player.armor,
                stamina: gameState.player.stamina,
                money: gameState.player.money,
                worldTime: gameState.world?.time,
            } : null,
        };

        localStorage.setItem(storageKey, JSON.stringify(payload));
        return payload;
    }

    function load() {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function applyLoaded(saveData, { player, gameState } = {}) {
        if (!saveData || !gameState || !player) return false;

        if (saveData.game) {
            gameState.player.health = saveData.game.health ?? gameState.player.health;
            gameState.player.armor = saveData.game.armor ?? gameState.player.armor;
            gameState.player.stamina = saveData.game.stamina ?? gameState.player.stamina;
            gameState.player.money = saveData.game.money ?? gameState.player.money;
            if (typeof saveData.game.worldTime === 'number') {
                gameState.world.time = saveData.game.worldTime;
            }
        }

        const p = saveData.player?.position;
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)) {
            const pos = new THREE.Vector3(p.x, p.y, p.z);
            if (typeof player.respawn === 'function') {
                player.respawn(pos);
            } else if (player.mesh?.position) {
                player.mesh.position.copy(pos);
            }
        }

        // Restore stamina to controller if present
        const stamina = saveData.player?.stamina;
        if (Number.isFinite(stamina) && player?.state) {
            player.state.stamina = stamina;
        }

        return true;
    }

    return {
        save,
        load,
        applyLoaded,
    };
}
