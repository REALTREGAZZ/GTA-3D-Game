/**
 * Replay System
 * Automatic replay camera for epic death clips
 */

import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';

export function createReplaySystem(scene, camera, player) {
    const state = {
        isReplaying: false,
        replayTime: 0,
        totalDuration: GAME_CONFIG.COMBAT.REPLAY_DURATION,
        freezeFrameTime: 0,
        isFrozen: false,
        phase: 'IDLE', // IDLE, OVERVIEW, ZOOM_IN, IMPACT, FOLLOW, PAUSE_END

        // Camera state
        originalPosition: new THREE.Vector3(),
        originalLookAt: new THREE.Vector3(),
        replayPosition: new THREE.Vector3(),
        replayLookAt: new THREE.Vector3(),

        // Death event data
        deathEvent: null,

        // Recorded frames for replay
        recordedFrames: [],

        // Slow motion
        slowmoFactor: 1.0,
        targetSlowmo: 1.0,

        // UI callbacks
        onStatsUpdate: null,
        onReplayEnd: null,
    };

    // Temporary vectors for calculations
    const tempVec1 = new THREE.Vector3();
    const tempVec2 = new THREE.Vector3();
    const tempVec3 = new THREE.Vector3();

    function startReplay(deathEvent, stats) {
        if (state.isReplaying) return;

        console.log('Starting replay for epic death clip...');

        state.deathEvent = deathEvent;
        state.isReplaying = true;
        state.replayTime = 0;
        state.phase = 'OVERVIEW';
        state.slowmoFactor = 1.0;
        state.targetSlowmo = GAME_CONFIG.COMBAT.DEATH_SLOWMO;
        state.isFrozen = false;

        // Store original camera position
        state.originalPosition.copy(camera.position);
        state.originalLookAt.copy(player.getCameraTarget());

        // Setup overview camera (zoomed out, angled)
        const deathPos = deathEvent.position;
        state.replayPosition.set(
            deathPos.x + Math.sin(Math.PI / 4) * GAME_CONFIG.COMBAT.REPLAY_ZOOM_FACTOR * 10,
            deathPos.y + 15,
            deathPos.z + Math.cos(Math.PI / 4) * GAME_CONFIG.COMBAT.REPLAY_ZOOM_FACTOR * 10
        );
        state.replayLookAt.copy(deathPos);
        state.replayLookAt.y += 1;

        // Create death overlay UI
        createDeathOverlay();

        // Play death sound
        playReplaySound('IMPACT');

        // Notify UI
        if (state.onStatsUpdate) {
            state.onStatsUpdate({
                ...stats,
                deathCause: deathEvent.type === 'MELEE' ? 'FISTS OF FURY' : 'BULLET HELL',
            });
        }
    }

    function createDeathOverlay() {
        // Create overlay if it doesn't exist
        let overlay = document.getElementById('replayOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'replayOverlay';
            overlay.innerHTML = `
                <div id="replayGreyScreen"></div>
                <div id="replayUI">
                    <div id="replayTimer">REPLAY</div>
                    <div id="replayPhase">EPIC ANGLE</div>
                    <div id="deathMessage">EPIC FAIL!</div>
                    <div id="replayStats"></div>
                    <div id="replayControls">
                        <span class="key-hint">[SPACE] REINICIAR</span>
                        <span class="key-hint">[S] GUARDAR CLIP</span>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                #replayOverlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1000;
                }
                #replayGreyScreen {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                #replayUI {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                #replayTimer {
                    position: absolute;
                    top: 20px;
                    right: 30px;
                    font-family: 'Arial Black', sans-serif;
                    font-size: 24px;
                    color: #fff;
                    text-shadow: 2px 2px 0 #000;
                }
                #replayPhase {
                    position: absolute;
                    top: 60px;
                    right: 30px;
                    font-family: 'Arial', sans-serif;
                    font-size: 16px;
                    color: #ffcc00;
                    text-shadow: 1px 1px 0 #000;
                }
                #deathMessage {
                    font-family: 'Arial Black', sans-serif;
                    font-size: 72px;
                    color: #ff3333;
                    text-shadow: 4px 4px 0 #000, -2px -2px 0 #fff;
                    animation: pulse 0.5s ease-in-out infinite alternate;
                }
                @keyframes pulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.05); }
                }
                #replayStats {
                    margin-top: 20px;
                    font-family: 'Arial', sans-serif;
                    font-size: 14px;
                    color: #fff;
                    text-align: center;
                    text-shadow: 1px 1px 0 #000;
                    background: rgba(0, 0, 0, 0.6);
                    padding: 15px 25px;
                    border-radius: 8px;
                }
                #replayControls {
                    position: absolute;
                    bottom: 40px;
                    font-family: 'Arial', sans-serif;
                    font-size: 18px;
                    color: #fff;
                    text-shadow: 1px 1px 0 #000;
                }
                .key-hint {
                    margin: 0 15px;
                    padding: 8px 15px;
                    background: rgba(0, 0, 0, 0.7);
                    border-radius: 5px;
                    border: 1px solid #fff;
                }
                .frozen #replayGreyScreen {
                    opacity: 1;
                }
                .frozen #replayUI {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }

        // Show overlay with delay
        setTimeout(() => {
            overlay.classList.add('visible');
            document.getElementById('replayGreyScreen').style.opacity = '0.3';
            document.getElementById('replayUI').style.opacity = '1';
        }, 100);
    }

    function updateReplayUI(time, phase) {
        const overlay = document.getElementById('replayOverlay');
        const timer = document.getElementById('replayTimer');
        const phaseEl = document.getElementById('replayPhase');
        const message = document.getElementById('deathMessage');

        if (timer) {
            const remaining = Math.max(0, state.totalDuration - time).toFixed(1);
            timer.textContent = `${remaining}s REPLAY`;
        }

        if (phaseEl) {
            const phaseNames = {
                'OVERVIEW': '📍 ESTABLECIENDO PERSPECTIVA',
                'ZOOM_IN': '🎬 ACERCÁNDOSE...',
                'IMPACT': '💥 IMPACTO!',
                'FOLLOW': '📹 SIGUIENDO CUERPO',
                'PAUSE_END': '⏸️ FIN DEL CLIP',
            };
            phaseEl.textContent = phaseNames[phase] || phase;
        }

        if (message) {
            if (state.isFrozen) {
                message.textContent = '¡CLIP EPICO!';
                message.style.color = '#00ff00';
            } else if (phase === 'IMPACT') {
                message.textContent = 'EPIC FAIL!';
                message.style.color = '#ff3333';
            }
        }
    }

    function update(deltaTime) {
        if (!state.isReplaying) return;

        // Apply slow motion
        const slowmoDelta = deltaTime * state.slowmoFactor;
        state.replayTime += slowmoDelta;

        const deathPos = state.deathEvent.position;
        const impactDir = state.deathEvent.direction;

        // Phases of replay
        switch (state.phase) {
            case 'OVERVIEW':
                // Frames -5 to -2: Overview shot, zoom out
                updateOverviewCamera(slowmoDelta, deathPos);
                updateReplayUI(state.replayTime, 'OVERVIEW');

                if (state.replayTime >= GAME_CONFIG.COMBAT.REPLAY_FRAMES_BEFORE) {
                    state.phase = 'ZOOM_IN';
                    state.replayTime = 0;
                }
                break;

            case 'ZOOM_IN':
                // Frames -2 to 0: Dramatic zoom in, slow-mo intensifies
                updateZoomInCamera(slowmoDelta, deathPos);
                updateReplayUI(state.replayTime + GAME_CONFIG.COMBAT.REPLAY_FRAMES_BEFORE, 'ZOOM_IN');

                // Increase slowmo
                state.slowmoFactor = THREE.MathUtils.lerp(
                    state.slowmoFactor,
                    GAME_CONFIG.COMBAT.REPLAY_SLOWMO_INTENSITY,
                    slowmoDelta * 2
                );

                if (state.replayTime >= GAME_CONFIG.COMBAT.REPLAY_FRAMES_AFTER) {
                    state.phase = 'IMPACT';
                    state.replayTime = 0;
                    triggerFreezeFrame();
                }
                break;

            case 'IMPACT':
                // Frame 0: Maximum impact, freeze frame
                if (!state.isFrozen) {
                    triggerFreezeFrame();
                }

                state.freezeFrameTime += deltaTime;
                updateReplayUI(
                    GAME_CONFIG.COMBAT.REPLAY_FRAMES_BEFORE + GAME_CONFIG.COMBAT.REPLAY_FRAMES_AFTER,
                    'IMPACT'
                );

                if (state.freezeFrameTime >= GAME_CONFIG.COMBAT.FREEZE_FRAME_DURATION) {
                    state.isFrozen = false;
                    document.getElementById('replayOverlay')?.classList.remove('frozen');
                    state.phase = 'FOLLOW';
                }
                break;

            case 'FOLLOW':
                // Frames 0 to +5: Body flies and bounces, slow-mo normalizes
                updateFollowCamera(slowmoDelta, deathPos, impactDir);
                updateReplayUI(
                    GAME_CONFIG.COMBAT.REPLAY_FRAMES_BEFORE + GAME_CONFIG.COMBAT.REPLAY_FRAMES_AFTER + state.freezeFrameTime,
                    'FOLLOW'
                );

                // Normalize slowmo
                state.slowmoFactor = THREE.MathUtils.lerp(
                    state.slowmoFactor,
                    1.0,
                    slowmoDelta * 0.5
                );

                const followDuration = GAME_CONFIG.COMBAT.REPLAY_FRAMES_AFTER * 2;
                if (state.replayTime >= followDuration) {
                    state.phase = 'PAUSE_END';
                    state.replayTime = 0;
                }
                break;

            case 'PAUSE_END':
                // Final pause before allowing restart
                updateReplayUI(state.totalDuration, 'PAUSE_END');

                if (state.replayTime >= GAME_CONFIG.COMBAT.REPLAY_PAUSE_END) {
                    stopReplay();
                    if (state.onReplayEnd) {
                        state.onReplayEnd();
                    }
                }
                break;
        }

        // Update camera shake during replay
        if (!state.isFrozen) {
            const shakeIntensity = state.phase === 'IMPACT'
                ? GAME_CONFIG.CAMERA_CONFIG.SHAKE.REPLAY_IMPACT_INTENSITY
                : 0.05;
            const shakeDuration = state.phase === 'IMPACT' ? 0.1 : 0.05;
            camera.addShake(shakeIntensity, shakeDuration);
        }
    }

    function updateOverviewCamera(deltaTime, deathPos) {
        // Smooth zoom out
        const zoomProgress = Math.min(1, state.replayTime / GAME_CONFIG.COMBAT.REPLAY_FRAMES_BEFORE);
        const zoomFactor = 1 + (GAME_CONFIG.COMBAT.REPLAY_ZOOM_FACTOR - 1) * zoomProgress;

        tempVec1.set(
            deathPos.x + Math.sin(GAME_CONFIG.COMBAT.REPLAY_ZOOM_ANGLE) * 10 * zoomFactor,
            deathPos.y + 10,
            deathPos.z + Math.cos(GAME_CONFIG.COMBAT.REPLAY_ZOOM_ANGLE) * 10 * zoomFactor
        );

        state.replayPosition.lerp(tempVec1, deltaTime * 3);
        camera.position.copy(state.replayPosition);

        tempVec2.copy(deathPos);
        tempVec2.y += 1;
        state.replayLookAt.lerp(tempVec2, deltaTime * 3);
        camera.lookAt(state.replayLookAt);
    }

    function updateZoomInCamera(deltaTime, deathPos) {
        // Dramatic zoom in toward impact point
        const zoomProgress = state.replayTime / GAME_CONFIG.COMBAT.REPLAY_FRAMES_AFTER;

        tempVec1.set(
            deathPos.x - Math.sin(Math.PI / 4) * 5 * (1 - zoomProgress * 0.5),
            deathPos.y + 3 + zoomProgress * 5,
            deathPos.z - Math.cos(Math.PI / 4) * 5 * (1 - zoomProgress * 0.5)
        );

        state.replayPosition.lerp(tempVec1, deltaTime * 5);
        camera.position.copy(state.replayPosition);

        tempVec2.copy(deathPos);
        tempVec2.y += 1;
        camera.lookAt(tempVec2);
    }

    function updateFollowCamera(deltaTime, deathPos, impactDir) {
        // Camera follows the "flying" body
        const flyDistance = state.replayTime * 8; // Player flies at 8 units/sec
        tempVec1.copy(deathPos);
        tempVec1.add(impactDir.clone().multiplyScalar(flyDistance));
        tempVec1.y += 2 + Math.sin(state.replayTime * 3) * 0.5; // Slight bob

        state.replayPosition.lerp(tempVec1, deltaTime * 2);
        camera.position.copy(state.replayPosition);

        // Look slightly ahead of the "body"
        tempVec2.copy(tempVec1);
        tempVec2.add(impactDir.clone().multiplyScalar(2));
        camera.lookAt(tempVec2);
    }

    function triggerFreezeFrame() {
        state.isFrozen = true;
        state.freezeFrameTime = 0;

        const overlay = document.getElementById('replayOverlay');
        if (overlay) {
            overlay.classList.add('frozen');
        }

        // Extreme shake during freeze
        camera.addShake(GAME_CONFIG.CAMERA_CONFIG.SHAKE.REPLAY_IMPACT_INTENSITY * 1.5, 0.3);

        // Play impact sound
        playReplaySound('BONK');
    }

    function playReplaySound(type) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const volume = 0.8;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch (type) {
            case 'IMPACT':
                // Dramatic impact sound
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;

            case 'BONK':
                // "BONK!" - freeze frame impact
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
        }
    }

    function stopReplay() {
        if (!state.isReplaying) return;

        console.log('Stopping replay...');

        state.isReplaying = false;
        state.phase = 'IDLE';
        state.replayTime = 0;
        state.freezeFrameTime = 0;
        state.isFrozen = false;
        state.slowmoFactor = 1.0;

        // Hide overlay
        const overlay = document.getElementById('replayOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
            document.getElementById('replayGreyScreen').style.opacity = '0';
            document.getElementById('replayUI').style.opacity = '0';
        }
    }

    function saveClip() {
        // Create video download (canvas to video simulation)
        console.log('Saving clip...');

        // In a real implementation, this would use MediaRecorder API
        // For now, we simulate the save
        const overlay = document.getElementById('replayOverlay');
        if (overlay) {
            const controls = document.getElementById('replayControls');
            if (controls) {
                controls.innerHTML = '<span style="color: #00ff00;">¡CLIP GUARDADO! 🎬</span>';
            }
        }

        // Simulate download
        setTimeout(() => {
            console.log('Clip saved successfully!');
        }, 500);
    }

    function isReplaying() {
        return state.isReplaying;
    }

    function getPhase() {
        return state.phase;
    }

    return {
        startReplay,
        stopReplay,
        update,
        saveClip,
        isReplaying,
        getPhase,
        setOnStatsUpdate: (callback) => { state.onStatsUpdate = callback; },
        setOnReplayEnd: (callback) => { state.onReplayEnd = callback; },
    };
}
