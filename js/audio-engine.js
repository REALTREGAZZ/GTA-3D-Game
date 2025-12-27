/**
 * Audio Engine - Synthesized Sound Effects
 * BRUTAL IMPACT FEEDBACK - NO SILENCE ALLOWED
 */

import * as THREE from 'three';
import { AUDIO_CONFIG } from './config.js';

// Voice management - track active sounds for culling
const activeSounds = [];
const MAX_VOICES = 4;

/**
 * AudioEngine Singleton
 * Generates dynamic arcade-style sound effects using Web Audio API
 */
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.listenerPosition = new THREE.Vector3();
        this.enabled = true;
        this.initialized = false;
    }

    /**
     * Initialize the AudioContext
     * Must be called after user interaction for browsers
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('AudioEngine initialized');
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
            this.enabled = false;
        }
    }

    /**
     * Update listener position for spatial audio
     * Should be called every frame with camera position
     */
    updateListenerPosition(cameraPos) {
        if (!this.audioContext || !cameraPos) return;
        this.listenerPosition.copy(cameraPos);
    }

    /**
     * Calculate spatial audio parameters
     * Returns { volume, pan } based on position and distance
     */
    calculateSpatialAudio(soundPosition) {
        if (!soundPosition) {
            return { volume: 1.0, pan: 0.0 };
        }

        const dx = soundPosition.x - this.listenerPosition.x;
        const dz = soundPosition.z - this.listenerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Distance falloff
        const maxDistance = AUDIO_CONFIG.SPATIAL_MAX_DISTANCE || 50;
        const volumeFalloff = 1.0 / (1.0 + distance / 10);
        
        // Silence if too far
        if (distance > maxDistance) {
            return { volume: 0.0, pan: 0.0 };
        }

        // Stereo panning (simple 2D)
        const pan = Math.max(-1, Math.min(1, dx / 20));

        return { volume: volumeFalloff, pan };
    }

    /**
     * Calculate priority for voice culling
     * Higher priority = more likely to play
     */
    calculatePriority(soundPosition, intensity) {
        const { volume } = this.calculateSpatialAudio(soundPosition);
        return volume * intensity;
    }

    /**
     * Voice culling - remove lowest priority sounds if over limit
     */
    cullVoices() {
        if (activeSounds.length <= MAX_VOICES) return;

        // Sort by priority (lowest first)
        activeSounds.sort((a, b) => a.priority - b.priority);

        // Stop and remove lowest priority sounds
        while (activeSounds.length > MAX_VOICES) {
            const sound = activeSounds.shift();
            if (sound.gainNode) {
                sound.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            }
        }
    }

    /**
     * Register a sound as active for voice culling
     */
    registerSound(gainNode, priority, duration) {
        const sound = { gainNode, priority, timestamp: Date.now() };
        activeSounds.push(sound);

        // Auto-remove after duration
        setTimeout(() => {
            const index = activeSounds.indexOf(sound);
            if (index !== -1) {
                activeSounds.splice(index, 1);
            }
        }, duration * 1000);
    }

    /**
     * Play synthesized sound effect
     * @param {string} type - Sound type: 'BONK', 'CRASH', 'WHOOSH', 'ARGH', 'IMPACT'
     * @param {THREE.Vector3} position - World position of sound (optional, for spatial audio)
     * @param {number} intensity - Intensity multiplier (0.0 - 1.0+), affects volume and pitch
     */
    playSynthSound(type, position = null, intensity = 1.0) {
        if (!this.enabled || !this.audioContext) {
            this.init(); // Try to init if not done yet
            if (!this.audioContext) return;
        }

        // Resume context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const config = AUDIO_CONFIG;
        const masterVolume = config.MASTER_VOLUME || 0.7;

        // Calculate spatial audio
        const spatial = this.calculateSpatialAudio(position);
        if (spatial.volume < 0.01) return; // Too far, don't play

        // Calculate priority for voice culling
        const priority = this.calculatePriority(position, intensity);

        // Voice culling
        this.cullVoices();

        // NON-LINEAR DYNAMICS: volume × (intensity ^ 1.8)
        const dynamicVolume = Math.pow(intensity, 1.8);

        // PITCH VARIATION: ±15% random variation
        const pitchVariation = 0.85 + Math.random() * 0.3; // 0.85 - 1.15

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Create gain node for volume control
        const gainNode = ctx.createGain();
        
        // Create stereo panner for spatial positioning
        const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pannerNode) {
            pannerNode.pan.value = spatial.pan;
            gainNode.connect(pannerNode);
            pannerNode.connect(ctx.destination);
        } else {
            gainNode.connect(ctx.destination);
        }

        // Generate sound based on type
        switch (type) {
            case 'BONK':
                this.synthesizeBonk(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation, intensity);
                this.registerSound(gainNode, priority, 0.15);
                break;

            case 'CRASH':
                this.synthesizeCrash(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation);
                this.registerSound(gainNode, priority, 0.2);
                break;

            case 'WHOOSH':
                this.synthesizeWhoosh(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation);
                this.registerSound(gainNode, priority, 0.25);
                break;

            case 'ARGH':
                this.synthesizeArgh(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation);
                this.registerSound(gainNode, priority, 0.4);
                break;

            case 'IMPACT':
                this.synthesizeImpact(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation, intensity);
                this.registerSound(gainNode, priority, 0.3);
                break;

            case 'CHARGE':
                this.synthesizeCharge(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation);
                this.registerSound(gainNode, priority, 0.3);
                break;

            case 'THWOOM':
                this.synthesizeThwoom(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation);
                this.registerSound(gainNode, priority, 0.4);
                break;

            case 'PING':
                this.synthesizePing(ctx, gainNode, now, dynamicVolume, spatial.volume, masterVolume, pitchVariation);
                this.registerSound(gainNode, priority, 0.08);
                break;

            default:
                console.warn(`Unknown sound type: ${type}`);
        }
    }

    /**
     * BONK - Strong knockback impact
     * Sine wave: 150Hz → 80Hz (pitch slide, 100ms)
     */
    synthesizeBonk(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar, intensity) {
        const config = AUDIO_CONFIG;
        const baseVolume = (config.BONK_VOLUME || 0.8) * masterVolume * spatialVolume * dynamicVolume;
        
        // Create oscillator
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        
        // Pitch slide with variation
        const startFreq = 150 * pitchVar * (1 + intensity * 0.2);
        const endFreq = 80 * pitchVar;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + 0.1);
        
        // Envelope: attack=10ms, decay=150ms
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * CRASH - Wall collision
     * White noise + bandpass filter (800-1200Hz), 200ms
     */
    synthesizeCrash(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar) {
        const config = AUDIO_CONFIG;
        const baseVolume = (config.CRASH_VOLUME || 0.5) * masterVolume * spatialVolume * dynamicVolume;
        
        // Create noise buffer
        const bufferSize = ctx.sampleRate * 0.2; // 200ms
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        
        // Bandpass filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000 * pitchVar; // Center frequency with variation
        filter.Q.value = 1.5;
        
        // Envelope
        gainNode.gain.setValueAtTime(baseVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        noiseSource.connect(filter);
        filter.connect(gainNode);
        noiseSource.start(now);
        noiseSource.stop(now + 0.2);
    }

    /**
     * WHOOSH - Knockback launch/whoosh sound
     * White noise with pitch slide (2000Hz → 400Hz)
     */
    synthesizeWhoosh(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar) {
        const config = AUDIO_CONFIG;
        const baseVolume = (config.WHOOSH_VOLUME || 0.6) * masterVolume * spatialVolume * dynamicVolume;
        
        // Create noise buffer
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        
        // Highpass filter with frequency sweep
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2000 * pitchVar, now);
        filter.frequency.exponentialRampToValueAtTime(400 * pitchVar, now + 0.25);
        filter.Q.value = 2.0;
        
        // Envelope
        gainNode.gain.setValueAtTime(baseVolume * 0.7, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        noiseSource.connect(filter);
        filter.connect(gainNode);
        noiseSource.start(now);
        noiseSource.stop(now + 0.25);
    }

    /**
     * ARGH - NPC death/pain sound
     * Sine oscillator with AM modulation (vibrato)
     */
    synthesizeArgh(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar) {
        const config = AUDIO_CONFIG;
        const baseVolume = (config.ARGH_VOLUME || 0.7) * masterVolume * spatialVolume * dynamicVolume;
        
        // Create oscillator for voice
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        
        // Variable pitch (200-400Hz range)
        const basePitch = 250 + Math.random() * 150;
        osc.frequency.setValueAtTime(basePitch * pitchVar, now);
        osc.frequency.linearRampToValueAtTime(basePitch * pitchVar * 0.7, now + 0.4); // Pitch drop
        
        // AM modulation for vibrato
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 6 + Math.random() * 4; // 6-10 Hz vibrato
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 20; // Vibrato depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gainNode);
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.4);
        osc.stop(now + 0.4);
    }

    /**
     * IMPACT - Critical hit sound
     * Square wave: 220Hz → 60Hz, immediate attack, long decay
     */
    synthesizeImpact(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar, intensity) {
        const config = AUDIO_CONFIG;
        const baseVolume = (config.IMPACT_VOLUME || 0.9) * masterVolume * spatialVolume * dynamicVolume;
        
        // Create oscillator
        const osc = ctx.createOscillator();
        osc.type = 'square';
        
        // Aggressive pitch drop
        const startFreq = 220 * pitchVar * (1 + intensity * 0.3);
        const endFreq = 60 * pitchVar;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + 0.3);
        
        // Envelope: immediate attack, long decay
        gainNode.gain.setValueAtTime(baseVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * CHARGE - Rising whirrrr sound for ability charging
     * Sine oscillator with rising pitch (400Hz → 2000Hz)
     */
    synthesizeCharge(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar) {
        const baseVolume = 0.6 * masterVolume * spatialVolume * dynamicVolume;
        
        // Create oscillator
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        
        // Rising pitch sweep
        const startFreq = 400 * pitchVar;
        const endFreq = 2000 * pitchVar;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.3);
        
        // Envelope: gradual attack, sustain, quick decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.02);
        gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.25);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * THWOOM - Heavy bass impact for area effect
     * Square wave: 100Hz → 20Hz, massive impact
     */
    synthesizeThwoom(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar) {
        const baseVolume = 1.0 * masterVolume * spatialVolume * dynamicVolume;
        
        // Create oscillator
        const osc = ctx.createOscillator();
        osc.type = 'square';
        
        // Aggressive bass drop
        const startFreq = 100 * pitchVar;
        const endFreq = Math.max(20, 20 * pitchVar);
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.3);
        
        // Envelope: immediate impact, long decay with reverb feel
        gainNode.gain.setValueAtTime(baseVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(baseVolume * 0.3, now + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    /**
     * PING - Combo tick (short dopamine blip)
     * Triangle wave: ~900Hz, 60-80ms
     */
    synthesizePing(ctx, gainNode, now, dynamicVolume, spatialVolume, masterVolume, pitchVar) {
        const baseVolume = 0.35 * masterVolume * spatialVolume * dynamicVolume;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';

        const freq = (850 + Math.random() * 250) * pitchVar;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(100, freq * 0.6), now + 0.07);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.085);
    }

    /**
     * Dispose and cleanup
     */
    dispose() {
        if (this.audioContext) {
            // Clear active sounds
            activeSounds.forEach(sound => {
                if (sound.gainNode) {
                    try {
                        sound.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    } catch (e) {
                        // Ignore
                    }
                }
            });
            activeSounds.length = 0;

            // Close context
            if (this.audioContext.state !== 'closed') {
                this.audioContext.close();
            }
            this.audioContext = null;
            this.initialized = false;
            console.log('AudioEngine disposed');
        }
    }
}

// Export singleton instance
export const audioEngine = new AudioEngine();
