/**
 * Procedural Rigged Character System
 * Creates skeletal rigged characters procedurally when Mixamo models are not available
 * Provides the same interface as Mixamo characters for seamless fallback
 */

import * as THREE from 'three';

// ============================================
// SKELETAL HUMANOID GENERATOR
// ============================================

/**
 * Create a procedurally rigged humanoid character with bones
 * Compatible with the MixamoCharacter interface
 */
export function createProceduralRiggedCharacter(colorPreset = null) {
    // Default color if none provided
    if (!colorPreset) {
        const colors = [0xff4444, 0x4444ff, 0x44ff44, 0xffff44, 0xaa44ff, 0xff8844, 0x44ffff, 0xff44aa];
        colorPreset = colors[Math.floor(Math.random() * colors.length)];
    }

    // Create skeleton bones
    const bones = createSkeletonBones();

    // Create skinned mesh
    const geometry = createHumanoidGeometry();
    const material = new THREE.MeshToonMaterial({
        color: colorPreset,
        skinning: true,
    });

    const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
    const skeleton = new THREE.Skeleton(bones);
    
    skinnedMesh.add(bones[0]); // Add root bone
    skinnedMesh.bind(skeleton);
    skinnedMesh.castShadow = true;
    skinnedMesh.receiveShadow = true;

    // Create scene container
    const scene = new THREE.Group();
    scene.add(skinnedMesh);

    // Create bone map for easy access
    const boneMap = {};
    bones.forEach(bone => {
        boneMap[bone.name] = bone;
    });

    // Generate procedural animations
    const animations = generateProceduralAnimations(bones);

    return {
        scene: scene,
        skinnedMesh: skinnedMesh,
        skeleton: skeleton,
        bones: bones,
        boneMap: boneMap,
        animations: animations,
        originalMaterial: material,
    };
}

// ============================================
// SKELETON CREATION
// ============================================

function createSkeletonBones() {
    const bones = [];

    // Root bone (Hips)
    const hips = new THREE.Bone();
    hips.name = 'Hips';
    hips.position.set(0, 1.0, 0);
    bones.push(hips);

    // Spine chain
    const spine = new THREE.Bone();
    spine.name = 'Spine';
    spine.position.set(0, 0.15, 0);
    hips.add(spine);
    bones.push(spine);

    const spine1 = new THREE.Bone();
    spine1.name = 'Spine1';
    spine1.position.set(0, 0.15, 0);
    spine.add(spine1);
    bones.push(spine1);

    const spine2 = new THREE.Bone();
    spine2.name = 'Spine2';
    spine2.position.set(0, 0.15, 0);
    spine1.add(spine2);
    bones.push(spine2);

    // Neck and Head
    const neck = new THREE.Bone();
    neck.name = 'Neck';
    neck.position.set(0, 0.15, 0);
    spine2.add(neck);
    bones.push(neck);

    const head = new THREE.Bone();
    head.name = 'Head';
    head.position.set(0, 0.1, 0);
    neck.add(head);
    bones.push(head);

    // Left Arm
    const leftShoulder = new THREE.Bone();
    leftShoulder.name = 'LeftShoulder';
    leftShoulder.position.set(0.15, 0.1, 0);
    spine2.add(leftShoulder);
    bones.push(leftShoulder);

    const leftArm = new THREE.Bone();
    leftArm.name = 'LeftArm';
    leftArm.position.set(0.1, 0, 0);
    leftShoulder.add(leftArm);
    bones.push(leftArm);

    const leftForeArm = new THREE.Bone();
    leftForeArm.name = 'LeftForeArm';
    leftForeArm.position.set(0.3, 0, 0);
    leftArm.add(leftForeArm);
    bones.push(leftForeArm);

    const leftHand = new THREE.Bone();
    leftHand.name = 'LeftHand';
    leftHand.position.set(0.3, 0, 0);
    leftForeArm.add(leftHand);
    bones.push(leftHand);

    // Right Arm
    const rightShoulder = new THREE.Bone();
    rightShoulder.name = 'RightShoulder';
    rightShoulder.position.set(-0.15, 0.1, 0);
    spine2.add(rightShoulder);
    bones.push(rightShoulder);

    const rightArm = new THREE.Bone();
    rightArm.name = 'RightArm';
    rightArm.position.set(-0.1, 0, 0);
    rightShoulder.add(rightArm);
    bones.push(rightArm);

    const rightForeArm = new THREE.Bone();
    rightForeArm.name = 'RightForeArm';
    rightForeArm.position.set(-0.3, 0, 0);
    rightArm.add(rightForeArm);
    bones.push(rightForeArm);

    const rightHand = new THREE.Bone();
    rightHand.name = 'RightHand';
    rightHand.position.set(-0.3, 0, 0);
    rightForeArm.add(rightHand);
    bones.push(rightHand);

    // Left Leg
    const leftUpLeg = new THREE.Bone();
    leftUpLeg.name = 'LeftUpLeg';
    leftUpLeg.position.set(0.1, -0.05, 0);
    hips.add(leftUpLeg);
    bones.push(leftUpLeg);

    const leftLeg = new THREE.Bone();
    leftLeg.name = 'LeftLeg';
    leftLeg.position.set(0, -0.45, 0);
    leftUpLeg.add(leftLeg);
    bones.push(leftLeg);

    const leftFoot = new THREE.Bone();
    leftFoot.name = 'LeftFoot';
    leftFoot.position.set(0, -0.45, 0);
    leftLeg.add(leftFoot);
    bones.push(leftFoot);

    // Right Leg
    const rightUpLeg = new THREE.Bone();
    rightUpLeg.name = 'RightUpLeg';
    rightUpLeg.position.set(-0.1, -0.05, 0);
    hips.add(rightUpLeg);
    bones.push(rightUpLeg);

    const rightLeg = new THREE.Bone();
    rightLeg.name = 'RightLeg';
    rightLeg.position.set(0, -0.45, 0);
    rightUpLeg.add(rightLeg);
    bones.push(rightLeg);

    const rightFoot = new THREE.Bone();
    rightFoot.name = 'RightFoot';
    rightFoot.position.set(0, -0.45, 0);
    rightLeg.add(rightFoot);
    bones.push(rightFoot);

    return bones;
}

// ============================================
// GEOMETRY CREATION WITH SKINNING
// ============================================

function createHumanoidGeometry() {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 16, 8);
    
    // Add skinning data
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    const skinIndices = [];
    const skinWeights = [];

    for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);

        // Simple skinning based on Y position
        const y = vertex.y;
        let indices = [0, 0, 0, 0];
        let weights = [0, 0, 0, 0];

        if (y > 0.6) {
            // Head/neck region
            indices = [5, 4, 0, 0]; // Head, Neck
            weights = [0.7, 0.3, 0, 0];
        } else if (y > 0.3) {
            // Upper torso
            indices = [3, 2, 0, 0]; // Spine2, Spine1
            weights = [0.6, 0.4, 0, 0];
        } else if (y > 0) {
            // Lower torso
            indices = [1, 0, 0, 0]; // Spine, Hips
            weights = [0.6, 0.4, 0, 0];
        } else if (y > -0.5) {
            // Upper legs
            if (vertex.x > 0) {
                indices = [14, 0, 0, 0]; // LeftUpLeg, Hips
                weights = [0.7, 0.3, 0, 0];
            } else {
                indices = [17, 0, 0, 0]; // RightUpLeg, Hips
                weights = [0.7, 0.3, 0, 0];
            }
        } else {
            // Lower legs/feet
            if (vertex.x > 0) {
                indices = [15, 16, 0, 0]; // LeftLeg, LeftFoot
                weights = [0.6, 0.4, 0, 0];
            } else {
                indices = [18, 19, 0, 0]; // RightLeg, RightFoot
                weights = [0.6, 0.4, 0, 0];
            }
        }

        skinIndices.push(indices[0], indices[1], indices[2], indices[3]);
        skinWeights.push(weights[0], weights[1], weights[2], weights[3]);
    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return geometry;
}

// ============================================
// PROCEDURAL ANIMATION GENERATION
// ============================================

function generateProceduralAnimations(bones) {
    const animations = [];

    // Find bones
    const hips = bones.find(b => b.name === 'Hips');
    const leftUpLeg = bones.find(b => b.name === 'LeftUpLeg');
    const rightUpLeg = bones.find(b => b.name === 'RightUpLeg');
    const leftLeg = bones.find(b => b.name === 'LeftLeg');
    const rightLeg = bones.find(b => b.name === 'RightLeg');
    const leftArm = bones.find(b => b.name === 'LeftArm');
    const rightArm = bones.find(b => b.name === 'RightArm');
    const spine = bones.find(b => b.name === 'Spine');

    // IDLE Animation
    const idleTracks = [];
    const idleTimes = [0, 1, 2];
    
    // Subtle breathing movement on hips
    const idleHipsY = [1.0, 1.02, 1.0];
    idleTracks.push(new THREE.VectorKeyframeTrack(
        'Hips.position',
        idleTimes,
        [0, idleHipsY[0], 0, 0, idleHipsY[1], 0, 0, idleHipsY[2], 0]
    ));

    const idleClip = new THREE.AnimationClip('idle', 2, idleTracks);
    animations.push({ name: 'idle', clip: idleClip });

    // WALK Animation
    const walkTracks = [];
    const walkTimes = [0, 0.25, 0.5, 0.75, 1.0];

    // Hip bobbing
    const walkHipsY = [1.0, 0.98, 1.0, 0.98, 1.0];
    walkTracks.push(new THREE.VectorKeyframeTrack(
        'Hips.position',
        walkTimes,
        walkHipsY.flatMap(y => [0, y, 0])
    ));

    // Left leg swing
    const walkLeftLegRot = [0, 0.5, 0, -0.5, 0];
    walkTracks.push(new THREE.QuaternionKeyframeTrack(
        'LeftUpLeg.quaternion',
        walkTimes,
        walkLeftLegRot.flatMap(angle => {
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
            return [q.x, q.y, q.z, q.w];
        })
    ));

    // Right leg swing (opposite)
    const walkRightLegRot = [0, -0.5, 0, 0.5, 0];
    walkTracks.push(new THREE.QuaternionKeyframeTrack(
        'RightUpLeg.quaternion',
        walkTimes,
        walkRightLegRot.flatMap(angle => {
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
            return [q.x, q.y, q.z, q.w];
        })
    ));

    const walkClip = new THREE.AnimationClip('walk', 1.0, walkTracks);
    animations.push({ name: 'walk', clip: walkClip });

    // RUN Animation (faster, more exaggerated)
    const runTracks = [];
    const runTimes = [0, 0.15, 0.3, 0.45, 0.6];

    // Hip bobbing (more pronounced)
    const runHipsY = [1.0, 0.95, 1.0, 0.95, 1.0];
    runTracks.push(new THREE.VectorKeyframeTrack(
        'Hips.position',
        runTimes,
        runHipsY.flatMap(y => [0, y, 0])
    ));

    // Left leg swing (exaggerated)
    const runLeftLegRot = [0, 0.8, 0, -0.8, 0];
    runTracks.push(new THREE.QuaternionKeyframeTrack(
        'LeftUpLeg.quaternion',
        runTimes,
        runLeftLegRot.flatMap(angle => {
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
            return [q.x, q.y, q.z, q.w];
        })
    ));

    // Right leg swing (opposite)
    const runRightLegRot = [0, -0.8, 0, 0.8, 0];
    runTracks.push(new THREE.QuaternionKeyframeTrack(
        'RightUpLeg.quaternion',
        runTimes,
        runRightLegRot.flatMap(angle => {
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
            return [q.x, q.y, q.z, q.w];
        })
    ));

    const runClip = new THREE.AnimationClip('run', 0.6, runTracks);
    animations.push({ name: 'run', clip: runClip });

    // JUMP Animation
    const jumpTracks = [];
    const jumpTimes = [0, 0.2, 0.4];

    // Crouch then extend
    const jumpHipsY = [1.0, 0.8, 1.2];
    jumpTracks.push(new THREE.VectorKeyframeTrack(
        'Hips.position',
        jumpTimes,
        jumpHipsY.flatMap(y => [0, y, 0])
    ));

    // Legs compress then extend
    const jumpLegRot = [0, 0.5, -0.3];
    jumpTracks.push(new THREE.QuaternionKeyframeTrack(
        'LeftUpLeg.quaternion',
        jumpTimes,
        jumpLegRot.flatMap(angle => {
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
            return [q.x, q.y, q.z, q.w];
        })
    ));

    const jumpClip = new THREE.AnimationClip('jump', 0.4, jumpTracks);
    animations.push({ name: 'jump', clip: jumpClip });

    // FALL Animation
    const fallTracks = [];
    const fallTimes = [0, 0.5];

    // Arms up
    const fallLeftArmRot = [0, -1.0];
    fallTracks.push(new THREE.QuaternionKeyframeTrack(
        'LeftArm.quaternion',
        fallTimes,
        fallLeftArmRot.flatMap(angle => {
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
            return [q.x, q.y, q.z, q.w];
        })
    ));

    const fallClip = new THREE.AnimationClip('fall', 0.5, fallTracks);
    animations.push({ name: 'fall', clip: fallClip });

    return animations;
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Create a character that matches the Mixamo character loader interface
 * This allows seamless switching between Mixamo and procedural characters
 */
export function createProceduralCharacter(colorPreset = null) {
    const characterData = createProceduralRiggedCharacter(colorPreset);
    
    // Convert animations array to map for AnimationStateMachine
    const animationMap = {};
    characterData.animations.forEach(anim => {
        animationMap[anim.name] = anim.clip;
    });
    
    return {
        ...characterData,
        animationMap: animationMap,
    };
}

// ============================================
// EXPORTS
// ============================================

export default {
    createProceduralRiggedCharacter,
    createProceduralCharacter,
};
