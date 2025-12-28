/**
 * Low-Poly Character System with Expressive Faces
 * Gang Beasts meets GTA - simple blocky characters with dynamic expressions
 */

import * as THREE from 'three';

// ============================================
// FACE TEXTURE GENERATION
// ============================================

/**
 * Generate face texture procedurally using Canvas API
 * Creates a 768x256 texture with 3 emotion frames
 */
export function generateFaceTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frameWidth = 256;
    const frameHeight = 256;
    canvas.width = frameWidth * 3;
    canvas.height = frameHeight;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each emotion frame
    drawNeutralFace(ctx, 0, frameWidth, frameHeight);
    drawPanicFace(ctx, frameWidth, frameWidth, frameHeight);
    drawKnockedOutFace(ctx, frameWidth * 2, frameWidth, frameHeight);

    // Create Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.format = THREE.RGBAFormat;

    return texture;
}

function drawNeutralFace(ctx, offsetX, width, height) {
    const centerX = offsetX + width / 2;
    const centerY = height / 2;

    // Eyes - normal circles
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 40, centerY - 20, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX + 40, centerY - 20, 15, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights (white dots)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - 35, centerY - 25, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX + 45, centerY - 25, 5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth - straight line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY + 40);
    ctx.lineTo(centerX + 20, centerY + 40);
    ctx.stroke();
}

function drawPanicFace(ctx, offsetX, width, height) {
    const centerX = offsetX + width / 2;
    const centerY = height / 2;

    // Eyes - wide circles with dilated pupils
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;

    // Left eye - wide open
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(centerX - 40, centerY - 20, 25, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 40, centerY - 20, 8, 0, Math.PI * 2);
    ctx.fill();

    // Right eye - wide open
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(centerX + 40, centerY - 20, 25, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX + 40, centerY - 20, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows - raised high
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - 70, centerY - 60);
    ctx.quadraticCurveTo(centerX - 40, centerY - 70, centerX - 10, centerY - 60);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 10, centerY - 60);
    ctx.quadraticCurveTo(centerX + 40, centerY - 70, centerX + 70, centerY - 60);
    ctx.stroke();

    // Mouth - O-shaped (panic)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 50, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawKnockedOutFace(ctx, offsetX, width, height) {
    const centerX = offsetX + width / 2;
    const centerY = height / 2;

    // Eyes - X marks
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    // Left X eye
    ctx.beginPath();
    ctx.moveTo(centerX - 55, centerY - 35);
    ctx.lineTo(centerX - 25, centerY - 5);
    ctx.moveTo(centerX - 25, centerY - 35);
    ctx.lineTo(centerX - 55, centerY - 5);
    ctx.stroke();

    // Right X eye
    ctx.beginPath();
    ctx.moveTo(centerX + 25, centerY - 35);
    ctx.lineTo(centerX + 55, centerY - 5);
    ctx.moveTo(centerX + 55, centerY - 35);
    ctx.lineTo(centerX + 25, centerY - 5);
    ctx.stroke();

    // Tongue sticking out
    ctx.fillStyle = '#ff6699';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 65, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dizzy lines above head
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 3;
    const time = Date.now() * 0.001;

    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 * i / 3) + time;
        const startX = centerX + Math.cos(angle) * 60;
        const startY = centerY - 80 + Math.sin(angle) * 20;
        const endX = centerX + Math.cos(angle + 0.5) * 80;
        const endY = centerY - 80 + Math.sin(angle + 0.5) * 20;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}

// ============================================
// COLOR PRESETS
// ============================================

export const COLOR_PRESETS = [
    {
        name: 'red_gang',
        torso: 0xff4444,
        arms: 0xff4444,
        legs: 0xcc3333,
    },
    {
        name: 'blue_gang',
        torso: 0x4444ff,
        arms: 0x4444ff,
        legs: 0x3333cc,
    },
    {
        name: 'green_hoodie',
        torso: 0x44ff44,
        arms: 0x44ff44,
        legs: 0x2da22d,
    },
    {
        name: 'yellow',
        torso: 0xffff44,
        arms: 0xffff44,
        legs: 0xcccc33,
    },
    {
        name: 'purple_trench',
        torso: 0xaa44ff,
        arms: 0xaa44ff,
        legs: 0x8833cc,
    },
    {
        name: 'orange_jacket',
        torso: 0xff8844,
        arms: 0xff8844,
        legs: 0xcc6633,
    },
    {
        name: 'cyan_vest',
        torso: 0x44ffff,
        arms: 0x44ffff,
        legs: 0x33cccc,
    },
    {
        name: 'pink_outfit',
        torso: 0xff44aa,
        arms: 0xff44aa,
        legs: 0xcc3388,
    },
];

/**
 * Get random color preset
 */
export function getRandomColorPreset() {
    return COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)];
}

// ============================================
// EMOTION CONSTANTS
// ============================================

export const EMOTIONS = {
    NEUTRAL: 'neutral',
    PANIC: 'panic',
    KNOCKED_OUT: 'knocked_out',
};

const EMOTION_MAP = {
    [EMOTIONS.NEUTRAL]: { offsetX: 0, offsetY: 0 },
    [EMOTIONS.PANIC]: { offsetX: 1, offsetY: 0 },
    [EMOTIONS.KNOCKED_OUT]: { offsetX: 2, offsetY: 0 },
};

// ============================================
// LOW-POLY HUMANOID BUILDER
// ============================================

/**
 * Create low-poly humanoid mesh
 * @param {Object} colorPreset - Color configuration
 * @param {boolean} isPlayer - Whether this is the player model
 * @returns {Object} - Mesh components and face system
 */
export function createLowPolyHumanoid(colorPreset = null, isPlayer = false) {
    const group = new THREE.Group();
    group.name = isPlayer ? 'Player' : 'NPC';

    // Use random color if no preset provided
    if (!colorPreset) {
        colorPreset = getRandomColorPreset();
    }

    // Player-specific overrides
    if (isPlayer) {
        colorPreset = {
            torso: 0xffffff,
            arms: 0xffffff,
            legs: 0x333333,
        };
    }

    // Material with slight metallic tint for neon reflection
    const bodyMaterial = new THREE.MeshToonMaterial({
        color: colorPreset.torso,
    });

    const armMaterial = new THREE.MeshToonMaterial({
        color: colorPreset.arms,
    });

    const legMaterial = new THREE.MeshToonMaterial({
        color: colorPreset.legs,
    });

    const headMaterial = new THREE.MeshToonMaterial({
        color: 0xffddaa, // Light skin tone for face readability
    });

    // Body proportions (GTA-inspired)
    const headSize = 0.4;
    const torsoHeight = 0.6;
    const torsoWidth = 0.5;
    const pelvisHeight = 0.15;
    const pelvisWidth = 0.4;

    // Arm/Leg segments
    const upperArmLength = 0.35;
    const lowerArmLength = 0.35;
    const upperLegLength = 0.5;
    const lowerLegLength = 0.5; // Legs 1.2x longer for heroic sprinting

    const armThickness = 0.12;
    const legThickness = 0.14;

    // Player scale (slightly larger)
    const scale = isPlayer ? 1.15 : 1.0;

    // ============================================
    // HEAD
    // ============================================
    const headGeometry = new THREE.BoxGeometry(headSize * 0.9, headSize, headSize * 0.8);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.y = torsoHeight + pelvisHeight + headSize / 2;
    group.add(head);

    // Face plane (for emotions)
    const faceTexture = generateFaceTexture();
    const faceMaterial = new THREE.MeshBasicMaterial({
        map: faceTexture,
        transparent: true,
        alphaTest: 0.1,
    });

    const faceGeometry = new THREE.PlaneGeometry(headSize * 0.6, headSize * 0.6);
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.z = headSize * 0.41; // Slight z-offset to avoid z-fighting
    face.position.y = 0;
    face.position.x = 0;
    head.add(face);

    // ============================================
    // TORSO (slightly squat for dramatic ragdoll)
    // ============================================
    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, 0.35);
    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.position.y = pelvisHeight + torsoHeight / 2;
    group.add(torso);

    // ============================================
    // PELVIS
    // ============================================
    const pelvisGeometry = new THREE.BoxGeometry(pelvisWidth, pelvisHeight, 0.3);
    const pelvis = new THREE.Mesh(pelvisGeometry, bodyMaterial);
    pelvis.castShadow = true;
    pelvis.receiveShadow = true;
    pelvis.position.y = pelvisHeight / 2;
    group.add(pelvis);

    // ============================================
    // LEFT ARM (two segments with elbow bend)
    // ============================================
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-(torsoWidth / 2 + armThickness / 2), pelvisHeight + torsoHeight * 0.7, 0);

    // Upper arm
    const upperArmGeometry = new THREE.BoxGeometry(armThickness, upperArmLength, armThickness);
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
    leftUpperArm.castShadow = true;
    leftUpperArm.receiveShadow = true;
    leftUpperArm.position.y = -upperArmLength / 2;
    leftArmGroup.add(leftUpperArm);

    // Lower arm (slight elbow bend)
    const lowerArmGeometry = new THREE.BoxGeometry(armThickness, lowerArmLength, armThickness);
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, armMaterial);
    leftLowerArm.castShadow = true;
    leftLowerArm.receiveShadow = true;
    leftLowerArm.position.y = -(upperArmLength + lowerArmLength / 2);
    leftLowerArm.position.x = 0.08; // Slight elbow bend
    leftArmGroup.add(leftLowerArm);

    group.add(leftArmGroup);

    // ============================================
    // RIGHT ARM (two segments with elbow bend)
    // ============================================
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set((torsoWidth / 2 + armThickness / 2), pelvisHeight + torsoHeight * 0.7, 0);

    // Upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
    rightUpperArm.castShadow = true;
    rightUpperArm.receiveShadow = true;
    rightUpperArm.position.y = -upperArmLength / 2;
    rightArmGroup.add(rightUpperArm);

    // Lower arm (slight elbow bend)
    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, armMaterial);
    rightLowerArm.castShadow = true;
    rightLowerArm.receiveShadow = true;
    rightLowerArm.position.y = -(upperArmLength + lowerArmLength / 2);
    rightLowerArm.position.x = -0.08; // Slight elbow bend
    rightArmGroup.add(rightLowerArm);

    group.add(rightArmGroup);

    // ============================================
    // LEFT LEG (two segments)
    // ============================================
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-(pelvisWidth / 3), pelvisHeight / 2, 0);

    // Thigh
    const upperLegGeometry = new THREE.BoxGeometry(legThickness, upperLegLength, legThickness);
    const leftThigh = new THREE.Mesh(upperLegGeometry, legMaterial);
    leftThigh.castShadow = true;
    leftThigh.receiveShadow = true;
    leftThigh.position.y = -upperLegLength / 2;
    leftLegGroup.add(leftThigh);

    // Calf
    const lowerLegGeometry = new THREE.BoxGeometry(legThickness * 0.9, lowerLegLength, legThickness * 0.9);
    const leftCalf = new THREE.Mesh(lowerLegGeometry, legMaterial);
    leftCalf.castShadow = true;
    leftCalf.receiveShadow = true;
    leftCalf.position.y = -(upperLegLength + lowerLegLength / 2);
    leftLegGroup.add(leftCalf);

    group.add(leftLegGroup);

    // ============================================
    // RIGHT LEG (two segments)
    // ============================================
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set((pelvisWidth / 3), pelvisHeight / 2, 0);

    // Thigh
    const rightThigh = new THREE.Mesh(upperLegGeometry, legMaterial);
    rightThigh.castShadow = true;
    rightThigh.receiveShadow = true;
    rightThigh.position.y = -upperLegLength / 2;
    rightLegGroup.add(rightThigh);

    // Calf
    const rightCalf = new THREE.Mesh(lowerLegGeometry, legMaterial);
    rightCalf.castShadow = true;
    rightCalf.receiveShadow = true;
    rightCalf.position.y = -(upperLegLength + lowerLegLength / 2);
    rightLegGroup.add(rightCalf);

    group.add(rightLegGroup);

    // ============================================
    // PLAYER-SPECIAL: Glowing Helmet/Crown
    // ============================================
    let helmet = null;
    if (isPlayer) {
        const helmetGeometry = new THREE.BoxGeometry(headSize * 1.2, headSize * 0.4, headSize * 1.1);
        const helmetMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
        });
        helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = headSize * 0.6;
        head.add(helmet);

        // Add neon outline effect
        const outlineGeometry = new THREE.BoxGeometry(headSize * 1.3, headSize * 1.1, headSize * 0.9);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.3,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        head.add(outline);
    }

    // ============================================
    // APPLY SCALE
    // ============================================
    group.scale.setScalar(scale);

    // ============================================
    // RETURN COMPONENTS
    // ============================================
    return {
        group,
        head,
        face,
        torso,
        pelvis,
        leftArm: leftArmGroup,
        rightArm: rightArmGroup,
        leftLeg: leftLegGroup,
        rightLeg: rightLegGroup,
        helmet,
        materials: {
            body: bodyMaterial,
            arm: armMaterial,
            leg: legMaterial,
            head: headMaterial,
            face: faceMaterial,
        },
        colorPreset,
        isPlayer,
    };
}

// ============================================
// EMOTION SYSTEM
// ============================================

/**
 * Create emotion system for a character
 * @param {Object} faceMesh - The face plane mesh
 * @returns {Object} - Emotion control interface
 */
export function createEmotionSystem(faceMesh) {
    const state = {
        currentEmotion: EMOTIONS.NEUTRAL,
        emotionDuration: 0,
        maxEmotionDuration: 2000, // Default 2 seconds
    };

    /**
     * Set character emotion
     * @param {string} emotion - 'neutral', 'panic', 'knocked_out'
     * @param {number} duration - Duration in milliseconds (0 = infinite)
     */
    function setEmotion(emotion, duration = 2000) {
        if (!EMOTIONS[emotion.toUpperCase()]) {
            console.warn(`[EmotionSystem] Unknown emotion: ${emotion}`);
            return;
        }

        state.currentEmotion = emotion;
        state.emotionDuration = duration;

        // Update face texture UV offset
        const offset = EMOTION_MAP[emotion];
        if (faceMesh.material.map) {
            faceMesh.material.map.offset.set(offset.offsetX / 3, offset.offsetY);
        }
    }

    /**
     * Update emotion system (called each frame)
     * @param {number} delta - Delta time in milliseconds
     */
    function update(delta) {
        // Emotion timeout
        if (state.emotionDuration > 0) {
            state.emotionDuration -= delta;

            if (state.emotionDuration <= 0 && state.currentEmotion !== EMOTIONS.NEUTRAL) {
                setEmotion(EMOTIONS.NEUTRAL, 0);
            }
        }
    }

    /**
     * Get current emotion state
     */
    function getCurrentEmotion() {
        return state.currentEmotion;
    }

    return {
        setEmotion,
        update,
        getCurrentEmotion,
        state,
    };
}

// ============================================
// PLAYER CLOTH EFFECT (OPTIONAL)
// ============================================

/**
 * Create simple cloth/cape effect for player
 * @param {THREE.Group} parent - Parent group to attach cloth to
 * @returns {Object} - Cloth control interface
 */
export function createPlayerCloth(parent) {
    const segments = 5;
    const clothLength = 0.8;
    const clothWidth = 0.4;
    const clothGroup = new THREE.Group();
    clothGroup.position.set(0, 1.3, 0.15); // On player's back

    // Create cloth segments
    const clothPieces = [];
    const clothMaterial = new THREE.MeshToonMaterial({
        color: 0xff00ff,
        side: THREE.DoubleSide,
    });

    for (let i = 0; i < segments; i++) {
        const geometry = new THREE.PlaneGeometry(clothWidth, clothLength / segments);
        const piece = new THREE.Mesh(geometry, clothMaterial.clone());
        piece.position.y = -(i * clothLength / segments) / 2;
        clothGroup.add(piece);
        clothPieces.push({
            mesh: piece,
            velocity: new THREE.Vector3(),
            targetY: piece.position.y,
        });
    }

    parent.add(clothGroup);

    const state = {
        velocity: new THREE.Vector3(),
    };

    /**
     * Update cloth simulation
     * @param {number} delta - Delta time in seconds
     * @param {THREE.Vector3} playerVelocity - Player's velocity for cloth reaction
     */
    function update(delta, playerVelocity) {
        // Cloth follows player with lag
        const followSpeed = 8.0;
        const clothVelocity = playerVelocity.clone().multiplyScalar(-0.3);

        for (let i = 0; i < clothPieces.length; i++) {
            const piece = clothPieces[i];
            const lag = (i + 1) * 0.1;

            // Apply player velocity with lag
            piece.velocity.x += clothVelocity.x * lag * delta * 60;
            piece.velocity.z += clothVelocity.z * lag * delta * 60;

            // Spring back to rest position
            const displacement = new THREE.Vector3(
                piece.mesh.position.x - 0,
                piece.mesh.position.y - piece.targetY,
                piece.mesh.position.z - 0
            );

            piece.velocity.sub(displacement.multiplyScalar(followSpeed * delta));

            // Apply damping
            piece.velocity.multiplyScalar(0.95);

            // Update position
            piece.mesh.position.add(piece.velocity.clone().multiplyScalar(delta));

            // Rotate based on velocity (wind effect)
            piece.mesh.rotation.x = piece.velocity.z * 0.5;
        }
    }

    return {
        group: clothGroup,
        update,
    };
}
