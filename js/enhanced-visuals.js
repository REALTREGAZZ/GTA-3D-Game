/**
 * Enhanced Visuals System
 * Provides:
 * - Better lighting configuration
 * - Atmospheric fog
 * - Gradient skybox
 * - Terrain material improvements
 */

import * as THREE from 'three';

export function setupEnhancedLighting(scene) {
    // DirectionalLight (Sun) - warm golden daylight
    const sunLight = new THREE.DirectionalLight(0xFFD89B, 2.5);
    sunLight.position.set(200, 300, 150);
    sunLight.castShadow = true;
    
    // Configure shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.normalBias = 0.02;
    
    // Point sun downward
    const target = new THREE.Object3D();
    target.position.set(0, 0, 0);
    sunLight.target = target;
    
    scene.add(sunLight);
    scene.add(target);
    
    // AmbientLight (Fill light) - cool sky-blue
    const ambientLight = new THREE.AmbientLight(0x7DB8E0, 0.6);
    scene.add(ambientLight);
    
    // Optional HemisphereLight for sky/ground contrast
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.5);
    scene.add(hemiLight);
    
    return {
        sunLight,
        ambientLight,
        hemiLight,
    };
}

export function setupEnhancedFog(scene) {
    // Fog for atmospheric depth
    const fogColor = 0x87CEEB; // Sky blue
    const fog = new THREE.Fog(fogColor, 50, 500);
    scene.fog = fog;
    
    return fog;
}

export function setupEnhancedSkybox(scene) {
    // Create gradient skydome using shader
    const skyGeometry = new THREE.SphereGeometry(800, 32, 16);
    
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x4A90D9) },    // Sky blue
            bottomColor: { value: new THREE.Color(0xFFFFFF) },   // White/light blue
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
    skyMesh.name = 'Sky';
    skyMesh.frustumCulled = false;
    scene.add(skyMesh);
    
    // Function to keep sky centered on camera
    function updateSkyPosition(camera) {
        if (camera) {
            skyMesh.position.copy(camera.position);
        }
    }
    
    return {
        skyMesh,
        updateSkyPosition,
        skyMaterial,
    };
}

export function createEnhancedTerrainTexture() {
    // Create grass texture procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base green color
    ctx.fillStyle = '#3D8C40';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise texture for grass detail
    for (let i = 0; i < 50000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const brightness = Math.random();
        
        if (brightness > 0.5) {
            ctx.fillStyle = `rgba(70, 140, 70, ${brightness * 0.3})`;
        } else {
            ctx.fillStyle = `rgba(30, 100, 30, ${(1 - brightness) * 0.3})`;
        }
        ctx.fillRect(x, y, 2, 2);
    }
    
    // Add some brown/dirt patches
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = 10 + Math.random() * 30;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(139, 90, 43, 0.6)');
        gradient.addColorStop(1, 'rgba(139, 90, 43, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    texture.anisotropy = 8;
    
    return texture;
}

export function createEnhancedTerrainNormalMap() {
    // Create simple normal map for terrain relief
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base normal (flat surface) - blue color (128, 128, 255)
    ctx.fillStyle = '#8080FF';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add subtle bumps for grass texture
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        
        const nx = 128 + (Math.random() - 0.5) * 40;
        const ny = 128 + (Math.random() - 0.5) * 40;
        const nz = 255;
        
        ctx.fillStyle = `rgb(${nx}, ${ny}, ${nz})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    const normalMap = new THREE.CanvasTexture(canvas);
    normalMap.colorSpace = THREE.SRGBColorSpace;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(10, 10);
    
    return normalMap;
}

export function setupEnhancedTerrain(terrainMesh) {
    // Create textured materials
    const texture = createEnhancedTerrainTexture();
    const normalMap = createEnhancedTerrainNormalMap();
    
    const material = new THREE.MeshStandardMaterial({
        color: 0x3D8C40,  // Grass green
        map: texture,
        normalMap: normalMap,
        roughness: 0.8,     // Not too shiny
        metalness: 0.0,     // Not metallic
        side: THREE.DoubleSide,
    });
    
    // Apply material to terrain mesh
    if (terrainMesh) {
        terrainMesh.material = material;
        terrainMesh.castShadow = true;
        terrainMesh.receiveShadow = true;
    }
    
    return material;
}

export function updateEnhancedVisuals(scene, camera, deltaTime) {
    // Update sky position
    const skyMesh = scene.getObjectByName('Sky');
    if (skyMesh && camera) {
        skyMesh.position.copy(camera.position);
    }
}
