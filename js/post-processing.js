/**
 * Post Processing Effects
 * Minimal EffectComposer setup for punchy arcade camera feedback.
 */

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import { DOPAMINE_CONFIG } from './config.js';

export function createPostProcessingEffects(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const chromaticShader = {
        uniforms: {
            tDiffuse: { value: null },
            amount: { value: 0.0 },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D tDiffuse;
            uniform float amount;
            varying vec2 vUv;

            void main() {
                vec2 offset = vec2(amount, amount);
                vec3 r = texture2D(tDiffuse, vUv + offset).rgb;
                vec3 g = texture2D(tDiffuse, vUv).rgb;
                vec3 b = texture2D(tDiffuse, vUv - offset).rgb;
                gl_FragColor = vec4(r.r, g.g, b.b, 1.0);
            }
        `,
    };

    const chromaticPass = new ShaderPass(chromaticShader);
    composer.addPass(chromaticPass);

    let aberrationAmount = 0;
    let aberrationTimer = 0;

    function setSize(width, height) {
        composer.setSize(width, height);
    }

    function triggerChromaticAberration() {
        aberrationAmount = DOPAMINE_CONFIG.CHROMATIC_ABERRATION_AMOUNT;
        aberrationTimer = DOPAMINE_CONFIG.CHROMATIC_ABERRATION_DURATION;
    }

    function update(deltaTime) {
        if (aberrationTimer > 0) {
            aberrationTimer = Math.max(0, aberrationTimer - deltaTime);
            const decay = DOPAMINE_CONFIG.CHROMATIC_ABERRATION_AMOUNT / Math.max(0.0001, DOPAMINE_CONFIG.CHROMATIC_ABERRATION_DURATION);
            aberrationAmount = Math.max(0, aberrationAmount - decay * deltaTime);
            chromaticPass.uniforms.amount.value = aberrationAmount;
        } else {
            chromaticPass.uniforms.amount.value = 0.0;
        }
    }

    function render() {
        composer.render();
    }

    return {
        triggerChromaticAberration,
        update,
        render,
        setSize,
        getComposer: () => composer,
    };
}
