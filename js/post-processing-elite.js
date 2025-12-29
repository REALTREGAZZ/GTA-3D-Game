/**
 * Post Processing Elite
 * Advanced effects pipeline: RenderPass + Bloom + Vignette + Chromatic Aberration
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import { DOPAMINE_CONFIG } from './config.js';

export const POST_PROCESSING_CONFIG = {
    // Bloom settings - Epic glow for powers and UI
    // EMERGENCY FIX #3: Clamped bloom to prevent blinding glow bug in void
    BLOOM: {
        strength: 0.5,        // Reduced from 1.5 to prevent blinding effect
        radius: 0.8,
        threshold: 0.95,      // Increased from 0.8 to 0.95 - less pixels trigger bloom
    },

    // Vignette settings
    VIGNETTE: {
        enabled: true,
        intensity: 0.5,
        smoothness: 0.5,
    },

    // Chromatic aberration settings
    CHROMATIC: {
        enabled: true,
        maxAmount: 0.01,
        decaySpeed: 2.0,
    },
};

export class PostProcessingElite {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Create composer
        this.composer = new EffectComposer(renderer);
        this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Render pass
        this.renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this.renderPass);

        // Bloom pass
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            POST_PROCESSING_CONFIG.BLOOM.strength,
            POST_PROCESSING_CONFIG.BLOOM.radius,
            POST_PROCESSING_CONFIG.BLOOM.threshold
        );
        this.composer.addPass(this.bloomPass);

        // Vignette pass
        this.vignettePass = this.createVignettePass();
        this.composer.addPass(this.vignettePass);

        // Chromatic aberration pass
        this.chromaticPass = this.createChromaticPass();
        this.composer.addPass(this.chromaticPass);

        // State
        this.chromaticAmount = 0;
        this.chromaticTimer = 0;

        console.log('[PostProcessingElite] Initialized');
    }

    /**
     * Create vignette shader pass
     */
    createVignettePass() {
        const shader = {
            uniforms: {
                tDiffuse: { value: null },
                intensity: { value: POST_PROCESSING_CONFIG.VIGNETTE.intensity },
                smoothness: { value: POST_PROCESSING_CONFIG.VIGNETTE.smoothness },
                enabled: { value: POST_PROCESSING_CONFIG.VIGNETTE.enabled ? 1.0 : 0.0 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float intensity;
                uniform float smoothness;
                uniform float enabled;
                varying vec2 vUv;

                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);

                    if (enabled > 0.5) {
                        vec2 center = vec2(0.5, 0.5);
                        float dist = distance(vUv, center);
                        float vignette = smoothstep(0.5, 0.5 * (1.0 - smoothness), dist);

                        // Darken edges
                        color.rgb *= mix(1.0 - intensity * 0.7, 1.0, vignette);
                    }

                    gl_FragColor = color;
                }
            `,
        };

        return new ShaderPass(shader);
    }

    /**
     * Create chromatic aberration shader pass
     */
    createChromaticPass() {
        const shader = {
            uniforms: {
                tDiffuse: { value: null },
                amount: { value: 0.0 },
                maxAmount: { value: POST_PROCESSING_CONFIG.CHROMATIC.maxAmount },
                enabled: { value: POST_PROCESSING_CONFIG.CHROMATIC.enabled ? 1.0 : 0.0 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                uniform float maxAmount;
                uniform float enabled;
                varying vec2 vUv;

                void main() {
                    vec2 offset = vec2(amount * maxAmount);
                    vec3 color;

                    if (enabled > 0.5 && amount > 0.001) {
                        // RGB split
                        float r = texture2D(tDiffuse, vUv + offset).r;
                        float g = texture2D(tDiffuse, vUv).g;
                        float b = texture2D(tDiffuse, vUv - offset).b;
                        color = vec3(r, g, b);
                    } else {
                        color = texture2D(tDiffuse, vUv).rgb;
                    }

                    gl_FragColor = vec4(color, 1.0);
                }
            `,
        };

        return new ShaderPass(shader);
    }

    /**
     * Trigger chromatic aberration effect
     */
    triggerChromaticAberration() {
        this.chromaticAmount = 1.0;
        this.chromaticTimer = DOPAMINE_CONFIG.CHROMATIC_ABERRATION_DURATION || 0.5;
    }

    /**
     * Update post-processing effects
     */
    update(deltaTime) {
        // Update chromatic aberration
        if (this.chromaticTimer > 0) {
            this.chromaticTimer = Math.max(0, this.chromaticTimer - deltaTime);

            const decay = 1.0 / Math.max(0.0001, DOPAMINE_CONFIG.CHROMATIC_ABERRATION_DURATION || 0.5);
            this.chromaticAmount = Math.max(0, this.chromaticAmount - decay * deltaTime);

            this.chromaticPass.uniforms.amount.value = this.chromaticAmount;
        } else {
            this.chromaticPass.uniforms.amount.value = 0.0;
        }
    }

    /**
     * Render the scene with post-processing
     */
    render() {
        this.composer.render();
    }

    /**
     * Resize composer to new dimensions
     */
    setSize(width, height) {
        this.composer.setSize(width, height);

        // Update bloom resolution
        this.bloomPass.resolution.set(width, height);
    }

    /**
     * Set bloom strength
     */
    setBloomStrength(strength) {
        this.bloomPass.strength = strength;
    }

    /**
     * Set bloom threshold
     */
    setBloomThreshold(threshold) {
        this.bloomPass.threshold = threshold;
    }

    /**
     * Set bloom radius
     */
    setBloomRadius(radius) {
        this.bloomPass.radius = radius;
    }

    /**
     * Set vignette intensity
     */
    setVignetteIntensity(intensity) {
        this.vignettePass.uniforms.intensity.value = intensity;
    }

    /**
     * Enable or disable vignette
     */
    setVignetteEnabled(enabled) {
        this.vignettePass.uniforms.enabled.value = enabled ? 1.0 : 0.0;
    }

    /**
     * Enable or disable chromatic aberration
     */
    setChromaticEnabled(enabled) {
        this.chromaticPass.uniforms.enabled.value = enabled ? 1.0 : 0.0;
    }

    /**
     * Get composer instance
     */
    getComposer() {
        return this.composer;
    }

    /**
     * Get bloom pass instance
     */
    getBloomPass() {
        return this.bloomPass;
    }
}

/**
 * Factory function to create elite post-processing pipeline
 */
export function createPostProcessingElite(renderer, scene, camera, options = {}) {
    const elite = new PostProcessingElite(renderer, scene, camera);

    // Apply options if provided
    if (options.bloomStrength !== undefined) {
        elite.setBloomStrength(options.bloomStrength);
    }
    if (options.bloomThreshold !== undefined) {
        elite.setBloomThreshold(options.bloomThreshold);
    }
    if (options.bloomRadius !== undefined) {
        elite.setBloomRadius(options.bloomRadius);
    }
    if (options.vignetteIntensity !== undefined) {
        elite.setVignetteIntensity(options.vignetteIntensity);
    }
    if (options.vignetteEnabled !== undefined) {
        elite.setVignetteEnabled(options.vignetteEnabled);
    }
    if (options.chromaticEnabled !== undefined) {
        elite.setChromaticEnabled(options.chromaticEnabled);
    }

    return elite;
}
