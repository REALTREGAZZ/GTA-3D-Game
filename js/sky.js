/**
 * Sky + Epic Lighting Setup
 * - Epic golden amber directional light (#FFB347)
 * - Blue ambient light (#6699CC)
 * - Sunset HDRI skybox support
 * - Dynamic time-of-day update hooks
 */

import * as THREE from 'three';

export function createSky({ scene, sunLight, ambientLight, hdriPath = '/assets/textures/sky-sunset-hdri.jpg' } = {}) {
    const group = new THREE.Group();
    group.name = 'Sky';

    // Create gradient skydome with clear day/sunset
    const skyGeometry = new THREE.SphereGeometry(800, 32, 16);
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x4A90D9) },  // Sky blue
            bottomColor: { value: new THREE.Color(0xFFFFFF) },  // White/light blue horizon
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
    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    skyMesh.frustumCulled = false;
    group.add(skyMesh);

    // Load HDRI skybox if path provided
    let hdriTexture = null;
    if (hdriPath) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(hdriPath, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            hdriTexture = texture;

            if (scene) {
                scene.background = texture;
                scene.environment = texture;
            }
            console.log('[Sky] HDRI skybox loaded:', hdriPath);
        }, undefined, (err) => {
            console.warn('[Sky] Could not load HDRI skybox:', err.message);
        });
    }

    // Hemisphere light for ambient fill
    const hemiLight = new THREE.HemisphereLight(0x6699CC, 0x0a0a1a, 0.4);
    group.add(hemiLight);

    if (scene) {
        scene.add(group);
    }

    function update({ timeHours = 12, camera } = {}) {
        // Keep skydome centered on camera
        if (camera) {
            skyMesh.position.copy(camera.position);
        }

        // Time-of-day: sunrise ~6, sunset ~18
        const dayAngle = ((timeHours - 6) / 24) * Math.PI * 2;
        const elevation = Math.sin(dayAngle); // [-1..1]
        const azimuth = ((timeHours / 24) * Math.PI * 2) + Math.PI * 0.2;

        const dayFactor = THREE.MathUtils.clamp((elevation + 0.15) / 1.15, 0, 1);

        // Sunset colors - golden amber to deep purple
        const sunsetTop = new THREE.Color(0xFFB347);     // Golden amber
        const sunsetBottom = new THREE.Color(0xFF6B35);  // Orange sunset
        const dayTop = new THREE.Color(0x6699CC);        // Blue sky
        const dayBottom = new THREE.Color(0x87CEEB);     // Light blue
        const nightTop = new THREE.Color(0x0a0a1a);      // Dark night
        const nightBottom = new THREE.Color(0x1a1a3a);   // Dark purple

        // Lerp between day/night
        const topColor = nightTop.clone().lerp(dayTop, dayFactor).lerp(sunsetTop, dayFactor > 0.3 ? 1 : 0);
        const bottomColor = nightBottom.clone().lerp(dayBottom, dayFactor).lerp(sunsetBottom, dayFactor > 0.3 ? 1 : 0);

        skyMaterial.uniforms.topColor.value.copy(topColor);
        skyMaterial.uniforms.bottomColor.value.copy(bottomColor);

        // Update directional sun light (golden amber)
        if (sunLight) {
            const sunY = THREE.MathUtils.clamp(elevation, -0.25, 1) * 140;
            const sunR = 160;
            const sunX = Math.cos(azimuth) * sunR;
            const sunZ = Math.sin(azimuth) * sunR;

            sunLight.position.set(sunX, sunY + 40, sunZ);
            sunLight.target.position.set(0, 0, 0);
            sunLight.target.updateMatrixWorld(true);

            // Golden amber sun color
            const sunIntensity = THREE.MathUtils.clamp(dayFactor * 1.8, 0.5, 1.8);
            sunLight.intensity = sunIntensity;

            const warmSun = new THREE.Color(0xFFB347);    // Golden amber
            const whiteSun = new THREE.Color(0xffffff);
            sunLight.color.copy(warmSun).lerp(whiteSun, dayFactor * 0.3);

            // Enable shadows
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 2048;
            sunLight.shadow.mapSize.height = 2048;
            sunLight.shadow.camera.near = 0.5;
            sunLight.shadow.camera.far = 500;
            sunLight.shadow.camera.left = -100;
            sunLight.shadow.camera.right = 100;
            sunLight.shadow.camera.top = 100;
            sunLight.shadow.camera.bottom = -100;
        }

        // Update blue ambient light
        if (ambientLight) {
            ambientLight.intensity = THREE.MathUtils.lerp(0.15, 0.4, dayFactor);
            ambientLight.color.setHex(0x6699CC);  // Blue soft light
        }

        hemiLight.intensity = THREE.MathUtils.lerp(0.2, 0.6, dayFactor);

        if (scene?.fog) {
            const fogDay = new THREE.Color(0x6699CC);
            const fogNight = new THREE.Color(0x0a0a1a);
            scene.fog.color.copy(fogNight).lerp(fogDay, dayFactor);
        }
    }

    return {
        group,
        skyMesh,
        hemiLight,
        update,
        loadHDRI: (path) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(path, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.colorSpace = THREE.SRGBColorSpace;
                hdriTexture = texture;
                if (scene) {
                    scene.background = texture;
                    scene.environment = texture;
                }
                console.log('[Sky] HDRI skybox loaded:', path);
            });
        },
    };
}
