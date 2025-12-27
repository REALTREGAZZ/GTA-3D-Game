/**
 * Wave System
 * Arcade spawn loop: clear the area, wait a short delay, spawn a bigger wave.
 */

import * as THREE from 'three';
import { DOPAMINE_CONFIG } from './config.js';

const WAVE_CONFIG = {
    1: { basicNPCs: 5, heavyNPCs: 0 },
    2: { basicNPCs: 7, heavyNPCs: 1 },
    3: { basicNPCs: 9, heavyNPCs: 1 },
    4: { basicNPCs: 12, heavyNPCs: 2 },
    // Acceptance criteria: Wave 5 = 15 basic + 2 heavy
    5: { basicNPCs: 15, heavyNPCs: 2 },
    6: { basicNPCs: 16, heavyNPCs: 3 },
    7: { basicNPCs: 18, heavyNPCs: 3 },
    8: { basicNPCs: 20, heavyNPCs: 4 },
    9: { basicNPCs: 22, heavyNPCs: 4 },
    10: { basicNPCs: 25, heavyNPCs: 5 },
};

export function createWaveSystem(scene, npcSystem, gameState, ui, options = {}) {
    const {
        player = null,
        terrainHeightAt = null,
        spawnRadius = DOPAMINE_CONFIG.WAVE_SPAWN_RADIUS,
        waveDelay = DOPAMINE_CONFIG.WAVE_SPAWN_DELAY,
        maxWave = DOPAMINE_CONFIG.MAX_WAVES,
    } = options;

    const state = {
        currentWave: 0,
        waveTimer: 0,
    };

    function updateWaveDisplay(waveNum) {
        if (ui?.updateWaveDisplay) {
            ui.updateWaveDisplay(waveNum);
            return;
        }

        const waveEl = ui?.dopamine?.waveText || document.getElementById('waveHud');
        if (waveEl) waveEl.textContent = `WAVE ${waveNum}`;
    }

    function showMessage(text) {
        if (ui?.showMessage) {
            ui.showMessage(text);
            return;
        }
        if (window.OverlaySystem?.show) {
            window.OverlaySystem.show(text, 2.5, true);
        }
    }

    function spawnNPCAt(pos, type) {
        npcSystem?.spawn?.(pos, 1, { type });
    }

    function computeSpawnPos(playerPos, angle, radius) {
        const x = playerPos.x + Math.cos(angle) * radius;
        const z = playerPos.z + Math.sin(angle) * radius;
        const y = typeof terrainHeightAt === 'function' ? terrainHeightAt(x, z) + 1.0 : 5;
        return new THREE.Vector3(x, y, z);
    }

    function spawnWave(waveNum) {
        const config = WAVE_CONFIG[waveNum] || WAVE_CONFIG[10];
        const playerPos = player?.getPosition?.() || new THREE.Vector3();

        // Basics
        for (let i = 0; i < config.basicNPCs; i++) {
            const angle = (i / Math.max(1, config.basicNPCs)) * Math.PI * 2;
            const r = spawnRadius * (0.7 + Math.random() * 0.3);
            spawnNPCAt(computeSpawnPos(playerPos, angle, r), 'BASIC');
        }

        // Heavies
        for (let i = 0; i < config.heavyNPCs; i++) {
            const angle = ((i + 0.25) / Math.max(1, config.heavyNPCs)) * Math.PI * 2;
            const r = spawnRadius * 0.9;
            spawnNPCAt(computeSpawnPos(playerPos, angle, r), 'HEAVY');
        }

        state.waveTimer = 0;
        updateWaveDisplay(waveNum);
    }

    function countLivingNPCs() {
        const npcs = npcSystem?.getAllActiveNPCs?.() || npcSystem?.state?.active || [];
        let alive = 0;
        for (let i = 0; i < npcs.length; i++) {
            const npc = npcs[i];
            if (!npc?.state?.active) continue;
            if (npc.state.state === 'DEAD') continue;
            alive++;
        }
        return alive;
    }

    return {
        startWaveMode() {
            npcSystem?.clear?.();
            state.currentWave = 1;
            spawnWave(1);
        },

        update(deltaTime) {
            if (state.currentWave <= 0) return;

            const living = countLivingNPCs();

            if (living < 2) {
                state.waveTimer += deltaTime;
                if (state.waveTimer >= waveDelay) {
                    if (state.currentWave < maxWave) {
                        state.currentWave++;
                        spawnWave(state.currentWave);
                    } else {
                        showMessage('APOCALYPSE COMPLETE');
                    }
                }
            } else {
                state.waveTimer = 0;
            }
        },

        getCurrentWave() {
            return state.currentWave;
        },
    };
}
