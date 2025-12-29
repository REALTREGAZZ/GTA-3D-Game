/**
 * Audio Manager
 * Simple ambient loop and footstep sounds
 */

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.initialized = false;
        
        this.ambientGain = null;
        this.footstepGain = null;
        
        this.lastFootstepTime = 0;
        this.footstepInterval = 0.4;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);

            this._setupAmbient();
            this._setupFootsteps();

            this.initialized = true;
            console.log('[AudioManager] Initialized');
        } catch (error) {
            console.error('[AudioManager] Failed to initialize:', error);
        }
    }

    _setupAmbient() {
        if (!this.audioContext || !this.masterGain) return;

        this.ambientGain = this.audioContext.createGain();
        this.ambientGain.gain.value = 0.15;
        this.ambientGain.connect(this.masterGain);

        this.ambientOscillators = [];
        this._createWindSound();
    }

    _createWindSound() {
        const ctx = this.audioContext;
        if (!ctx) return;

        const baseFreq = 100;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        
        lfo.type = 'sine';
        lfo.frequency.value = 0.2;
        lfoGain.gain.value = 30;
        
        lfo.connect(lfoGain);
        
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = baseFreq;
        
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = baseFreq * 1.5;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 1;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(this.ambientGain);

        lfo.connect(osc1.frequency);
        lfo.connect(osc2.frequency);

        this.ambientOscillators = [osc1, osc2, lfo];
        
        osc1.start();
        osc2.start();
        lfo.start();

        this.isAmbientPlaying = true;
        console.log('[AudioManager] Ambient wind sound started');
    }

    _setupFootsteps() {
        if (!this.audioContext || !this.masterGain) return;

        this.footstepGain = this.audioContext.createGain();
        this.footstepGain.gain.value = 0.3;
        this.footstepGain.connect(this.masterGain);
    }

    playFootstep() {
        if (!this.initialized || !this.footstepGain) return;

        const now = Date.now() / 1000;
        if (now - this.lastFootstepTime < this.footstepInterval) return;
        this.lastFootstepTime = now;

        const ctx = this.audioContext;
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
        }

        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300 + Math.random() * 150;

        const gain = ctx.createGain();
        gain.gain.value = 0.2 + Math.random() * 0.1;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.footstepGain);

        noise.start();
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    update(deltaTime) {
        // Update any continuous audio parameters if needed
    }
}
