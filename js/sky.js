/**
 * Sky + more realistic lighting setup.
 * - Gradient skydome
 * - Hemisphere light
 * - Time-of-day update hooks
 */

import * as THREE from 'three';

function createSkyMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x78b7ff) },
            bottomColor: { value: new THREE.Color(0xffffff) },
            offset: { value: 33 },
            exponent: { value: 0.6 },
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
                float t = pow(max(h, 0.0), exponent);
                gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false,
    });
}

export function createSky({ scene, sunLight, ambientLight } = {}) {
    const group = new THREE.Group();
    group.name = 'Sky';

    const skyGeometry = new THREE.SphereGeometry(800, 32, 16);
    const skyMaterial = createSkyMaterial();
    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    skyMesh.frustumCulled = false;

    group.add(skyMesh);

    const hemiLight = new THREE.HemisphereLight(0x9fd0ff, 0x2d2d2d, 0.45);
    group.add(hemiLight);

    if (scene) {
        scene.add(group);
    }

    function update({ timeHours = 12, camera } = {}) {
        // Keep skydome centered on the camera.
        if (camera) {
            skyMesh.position.copy(camera.position);
        }

        // Time-of-day: sunrise ~6, sunset ~18.
        const dayAngle = ((timeHours - 6) / 24) * Math.PI * 2;
        const elevation = Math.sin(dayAngle); // [-1..1]
        const azimuth = ((timeHours / 24) * Math.PI * 2) + Math.PI * 0.2;

        const dayFactor = THREE.MathUtils.clamp((elevation + 0.15) / 1.15, 0, 1);

        // Sky colors
        const dayTop = new THREE.Color(0x78b7ff);
        const dayBottom = new THREE.Color(0xeaf6ff);
        const nightTop = new THREE.Color(0x06121f);
        const nightBottom = new THREE.Color(0x0b1d33);

        skyMaterial.uniforms.topColor.value.copy(nightTop).lerp(dayTop, dayFactor);
        skyMaterial.uniforms.bottomColor.value.copy(nightBottom).lerp(dayBottom, dayFactor);

        // Lighting adjustments
        if (sunLight) {
            const sunY = THREE.MathUtils.clamp(elevation, -0.25, 1) * 140;
            const sunR = 160;
            const sunX = Math.cos(azimuth) * sunR;
            const sunZ = Math.sin(azimuth) * sunR;

            sunLight.position.set(sunX, sunY + 40, sunZ);
            sunLight.target.position.set(0, 0, 0);
            sunLight.target.updateMatrixWorld(true);

            const sunIntensity = THREE.MathUtils.clamp(dayFactor * 1.25, 0.02, 1.25);
            sunLight.intensity = sunIntensity;

            const warmSun = new THREE.Color(0xffd6a3);
            const whiteSun = new THREE.Color(0xffffff);
            sunLight.color.copy(warmSun).lerp(whiteSun, dayFactor);
        }

        if (ambientLight) {
            ambientLight.intensity = THREE.MathUtils.lerp(0.08, 0.38, dayFactor);
        }

        hemiLight.intensity = THREE.MathUtils.lerp(0.12, 0.55, dayFactor);

        if (scene?.fog) {
            const fogDay = new THREE.Color(0x87ceeb);
            const fogNight = new THREE.Color(0x06121f);
            scene.fog.color.copy(fogNight).lerp(fogDay, dayFactor);
        }
    }

    return {
        group,
        skyMesh,
        hemiLight,
        update,
    };
}
