/**
 * Chaos Score System
 * Tracks airborne chaos (ragdolls/suspension) and drives an arcade combo HUD.
 */

import { DOPAMINE_CONFIG } from './config.js';
import { audioEngine } from './audio-engine.js';

function getComboColorClass(multiplier) {
    if (multiplier >= 25) return 'combo-red';
    if (multiplier >= 10) return 'combo-orange';
    return '';
}

export function createChaosScoreSystem(gameState, ui, options = {}) {
    const { npcSystem = null, player = null } = options;

    const state = {
        currentMultiplier: 0,
        comboActive: false,
        comboDecayTimer: DOPAMINE_CONFIG.COMBO_DECAY_TIME,
        totalScore: 0,
        lastAirCount: 0,
        lastMultiplier: 0,
        bumpTimer: 0,
    };

    const comboContainer = ui?.dopamine?.comboContainer || document.getElementById('comboHud');
    const comboText = ui?.dopamine?.comboText || document.getElementById('comboText');
    const comboBarFill = ui?.dopamine?.comboBarFill || document.getElementById('comboBarFill');

    function getAllAirborneNPCs() {
        const npcs = npcSystem?.getAllActiveNPCs?.() || npcSystem?.state?.active || [];
        return npcs.filter((npc) => {
            if (!npc?.state?.active) return false;
            if (npc.state.state === 'DEAD') return false;
            return Boolean(npc.state.isRagdoll || npc.state.isSuspended);
        });
    }

    function updateComboDisplay() {
        if (!comboContainer || !comboText || !comboBarFill) return;

        if (!state.comboActive || state.currentMultiplier <= 0) {
            comboContainer.classList.add('hidden');
            comboBarFill.style.transform = 'scaleX(0)';
            return;
        }

        comboContainer.classList.remove('hidden');
        comboText.textContent = `X${state.currentMultiplier} COMBO`;

        comboText.classList.remove('combo-orange', 'combo-red');
        const c = getComboColorClass(state.currentMultiplier);
        if (c) comboText.classList.add(c);

        const decayT = Math.max(0.0001, DOPAMINE_CONFIG.COMBO_DECAY_TIME);
        const barT = Math.max(0, Math.min(1, state.comboDecayTimer / decayT));
        comboBarFill.style.transform = `scaleX(${barT})`;

        if (state.bumpTimer > 0) {
            comboText.classList.add('bump');
        } else {
            comboText.classList.remove('bump');
        }
    }

    return {
        update(deltaTime) {
            const airCount = getAllAirborneNPCs().length;

            if (airCount > 0) {
                state.currentMultiplier = airCount;
                state.comboDecayTimer = DOPAMINE_CONFIG.COMBO_DECAY_TIME;
                state.comboActive = true;

                // Score ticks while the chaos is in the air (points/sec style)
                state.totalScore += airCount * DOPAMINE_CONFIG.POINTS_PER_NPC_IN_AIR * deltaTime;

                if (airCount !== state.lastAirCount) {
                    const playerPos = player?.getPosition?.() || null;
                    audioEngine?.playSynthSound?.('PING', playerPos, 0.35);
                }

                if (state.currentMultiplier > state.lastMultiplier) {
                    state.bumpTimer = 0.12;
                }
            } else {
                state.comboDecayTimer -= deltaTime;
                if (state.comboDecayTimer <= 0) {
                    state.comboDecayTimer = 0;
                    state.currentMultiplier = 0;
                    state.comboActive = false;
                }
            }

            state.lastAirCount = airCount;
            state.lastMultiplier = state.currentMultiplier;
            state.bumpTimer = Math.max(0, state.bumpTimer - deltaTime);

            updateComboDisplay();
        },

        addScore(points) {
            const multiplier = Math.max(1, state.currentMultiplier || 1);
            const multiplied = points * multiplier;
            state.totalScore += multiplied;
            return multiplied;
        },

        getScore() {
            return Math.round(state.totalScore);
        },

        getMultiplier() {
            return state.currentMultiplier;
        },
    };
}
