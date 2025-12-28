/**
 * Dark Souls World Builder (lightweight, procedural)
 * Provides 5 themed areas + chunk-based decoration streaming.
 */

import * as THREE from 'three';
import { createWorldStreaming } from './world-streaming.js';

const WORLD_DATA = {
    mapSize: 600,
    chunkSize: 100,
    areas: [
        { id: 'hub', name: 'Firelink Ruins', center: { x: 0, z: 0 }, radius: 70, theme: 'hub' },
        { id: 'parish', name: 'Undead Parish', center: { x: -180, z: -40 }, radius: 140, theme: 'ruins' },
        { id: 'forest', name: 'Forest of Giants', center: { x: 180, z: 160 }, radius: 180, theme: 'forest' },
        { id: 'lava', name: 'Lava Cavern', center: { x: 180, z: -180 }, radius: 160, theme: 'lava' },
        { id: 'tower', name: 'Castle Tower', center: { x: -180, z: 180 }, radius: 110, theme: 'tower' },
    ],
};

function distance2D(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
}

function getAreaForPosition(x, z) {
    const p = { x, z };

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const area of WORLD_DATA.areas) {
        const d = distance2D(p, area.center);
        if (d <= area.radius) {
            return area;
        }
        const score = d - area.radius;
        if (score < bestScore) {
            bestScore = score;
            best = area;
        }
    }

    return best || WORLD_DATA.areas[0];
}

function createBoxColliderFromMesh(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    return { box, mesh };
}

function createStoneMaterial({ color = 0x4a4a4a, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.95,
        metalness: 0.05,
        emissive,
        emissiveIntensity,
    });
}

function chunkOrigin(cx, cz, chunkSize) {
    return {
        x: cx * chunkSize,
        z: cz * chunkSize,
    };
}

function randomSeeded(cx, cz) {
    // cheap deterministic pseudo-rng per chunk
    let s = (cx * 73856093) ^ (cz * 19349663);
    return () => {
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        return ((s >>> 0) % 10000) / 10000;
    };
}

export function createDarkSoulsWorldBuilder({
    scene,
    terrainHeightAt,
    mapSize = WORLD_DATA.mapSize,
    chunkSize = WORLD_DATA.chunkSize,
    viewDistance = 240,
} = {}) {
    const root = new THREE.Group();
    root.name = 'DarkSoulsWorld';

    const half = mapSize / 2;

    const materials = {
        stone: createStoneMaterial({ color: 0x3e3e3e }),
        ruin: createStoneMaterial({ color: 0x2f2f2f }),
        wood: new THREE.MeshStandardMaterial({ color: 0x2d1c12, roughness: 1.0, metalness: 0.0 }),
        leaves: new THREE.MeshStandardMaterial({ color: 0x123018, roughness: 1.0, metalness: 0.0 }),
        lava: createStoneMaterial({ color: 0x1a0a0a, emissive: 0xff3300, emissiveIntensity: 0.9 }),
        lavaSurface: new THREE.MeshStandardMaterial({
            color: 0x2a0a00,
            roughness: 0.2,
            metalness: 0.0,
            emissive: 0xff2200,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.85,
        }),
    };

    const geometries = {
        wall: new THREE.BoxGeometry(1, 1, 1),
        slab: new THREE.BoxGeometry(1, 1, 1),
        trunk: new THREE.CylinderGeometry(0.22, 0.35, 2.5, 6),
        canopy: new THREE.ConeGeometry(1.2, 2.5, 7),
        rock: new THREE.IcosahedronGeometry(0.8, 0),
    };

    function buildChunk(cx, cz) {
        const origin = chunkOrigin(cx, cz, chunkSize);

        // Hard cull chunks outside the playable map.
        if (Math.abs(origin.x) > half + chunkSize || Math.abs(origin.z) > half + chunkSize) return null;

        const centerX = origin.x + chunkSize * 0.5;
        const centerZ = origin.z + chunkSize * 0.5;

        const area = getAreaForPosition(centerX, centerZ);

        const rng = randomSeeded(cx, cz);
        const group = new THREE.Group();
        group.position.set(0, 0, 0);

        const colliders = [];

        // Avoid interfering with the city center spawn too much.
        const yAt = (x, z) => (typeof terrainHeightAt === 'function' ? terrainHeightAt(x, z) : 0);

        if (area.theme === 'hub') {
            // Only build the actual hub setpiece on the center chunk.
            if (Math.abs(centerX - area.center.x) < chunkSize * 0.5 && Math.abs(centerZ - area.center.z) < chunkSize * 0.5) {
                const baseY = yAt(area.center.x, area.center.z);

                const platform = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 1.2, 10), materials.stone);
                platform.position.set(area.center.x, baseY + 0.6, area.center.z);
                platform.receiveShadow = true;
                platform.castShadow = true;
                group.add(platform);
                colliders.push(createBoxColliderFromMesh(platform));

                const bonfire = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 8), materials.lava);
                bonfire.position.set(area.center.x, baseY + 1.3, area.center.z);
                bonfire.castShadow = false;
                group.add(bonfire);

                const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.25, 10, 20), materials.ruin);
                ring.rotation.x = Math.PI / 2;
                ring.position.set(area.center.x, baseY + 0.15, area.center.z);
                ring.receiveShadow = true;
                group.add(ring);
            }
        }

        if (area.theme === 'ruins') {
            const walls = 6 + Math.floor(rng() * 6);
            for (let i = 0; i < walls; i++) {
                const x = origin.x + rng() * chunkSize;
                const z = origin.z + rng() * chunkSize;
                const h = 3 + rng() * 6;
                const w = 2 + rng() * 5;
                const d = 0.8 + rng() * 1.4;

                const y = yAt(x, z);
                const mesh = new THREE.Mesh(geometries.wall, materials.ruin);
                mesh.scale.set(w, h, d);
                mesh.position.set(x, y + h / 2, z);
                mesh.rotation.y = rng() * Math.PI;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);

                colliders.push(createBoxColliderFromMesh(mesh));
            }
        }

        if (area.theme === 'forest') {
            const count = 18 + Math.floor(rng() * 14);

            const trunks = new THREE.InstancedMesh(geometries.trunk, materials.wood, count);
            const canopies = new THREE.InstancedMesh(geometries.canopy, materials.leaves, count);
            trunks.castShadow = false;
            trunks.receiveShadow = true;
            canopies.castShadow = false;
            canopies.receiveShadow = false;

            const m = new THREE.Matrix4();
            const q = new THREE.Quaternion();
            const s = new THREE.Vector3();
            const p = new THREE.Vector3();

            for (let i = 0; i < count; i++) {
                const x = origin.x + rng() * chunkSize;
                const z = origin.z + rng() * chunkSize;
                const y = yAt(x, z);

                const scale = 0.7 + rng() * 0.8;
                q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);

                p.set(x, y + 1.25 * scale, z);
                s.set(scale, scale, scale);
                m.compose(p, q, s);
                trunks.setMatrixAt(i, m);

                p.set(x, y + (2.3 * scale), z);
                s.set(scale, scale, scale);
                m.compose(p, q, s);
                canopies.setMatrixAt(i, m);
            }

            trunks.instanceMatrix.needsUpdate = true;
            canopies.instanceMatrix.needsUpdate = true;

            group.add(trunks);
            group.add(canopies);
        }

        if (area.theme === 'lava') {
            // Lava surface patches + rocks.
            const patchChance = rng();
            if (patchChance > 0.45) {
                const x = origin.x + chunkSize * 0.5;
                const z = origin.z + chunkSize * 0.5;
                const y = yAt(x, z);

                const lavaPlane = new THREE.Mesh(new THREE.PlaneGeometry(chunkSize * 0.9, chunkSize * 0.9, 1, 1), materials.lavaSurface);
                lavaPlane.rotation.x = -Math.PI / 2;
                lavaPlane.position.set(x, y + 0.02, z);
                lavaPlane.receiveShadow = false;
                group.add(lavaPlane);
            }

            const rocks = 10 + Math.floor(rng() * 10);
            const rockMesh = new THREE.InstancedMesh(geometries.rock, materials.lava, rocks);
            rockMesh.castShadow = false;
            rockMesh.receiveShadow = true;

            const m = new THREE.Matrix4();
            const q = new THREE.Quaternion();
            const s = new THREE.Vector3();
            const p = new THREE.Vector3();

            for (let i = 0; i < rocks; i++) {
                const x = origin.x + rng() * chunkSize;
                const z = origin.z + rng() * chunkSize;
                const y = yAt(x, z);
                const scale = 0.6 + rng() * 1.4;

                q.setFromAxisAngle(new THREE.Vector3(rng(), rng(), rng()).normalize(), rng() * Math.PI);
                p.set(x, y + 0.4 * scale, z);
                s.set(scale, scale * (0.7 + rng() * 0.6), scale);
                m.compose(p, q, s);
                rockMesh.setMatrixAt(i, m);
            }

            rockMesh.instanceMatrix.needsUpdate = true;
            group.add(rockMesh);
        }

        if (area.theme === 'tower') {
            // Only create the tower in the tower center chunk.
            if (Math.abs(centerX - area.center.x) < chunkSize * 0.5 && Math.abs(centerZ - area.center.z) < chunkSize * 0.5) {
                const baseY = yAt(area.center.x, area.center.z);

                const tower = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, 40, 10, 1), materials.stone);
                tower.position.set(area.center.x, baseY + 20, area.center.z);
                tower.castShadow = true;
                tower.receiveShadow = true;
                group.add(tower);
                colliders.push(createBoxColliderFromMesh(tower));

                const bridge = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 6), materials.ruin);
                bridge.position.set(area.center.x + 18, baseY + 10, area.center.z);
                bridge.castShadow = true;
                bridge.receiveShadow = true;
                group.add(bridge);
                colliders.push(createBoxColliderFromMesh(bridge));
            }
        }

        // Ensure geometry is within chunk area (helps culling)
        group.updateMatrixWorld(true);

        return {
            group,
            colliders,
        };
    }

    const streaming = createWorldStreaming({
        parent: root,
        chunkSize,
        viewDistance,
        buildChunk,
    });

    function update(playerPosition) {
        streaming.update(playerPosition);
    }

    function getAreaNameAt(x, z) {
        return getAreaForPosition(x, z)?.name || 'Wilderness';
    }

    function getLavaDamageAt(x, z) {
        const area = getAreaForPosition(x, z);
        if (area?.theme !== 'lava') return 0;
        const d = distance2D({ x, z }, area.center);
        const t = THREE.MathUtils.clamp(1 - d / area.radius, 0, 1);
        return t;
    }

    return {
        root,
        update,
        getAreaNameAt,
        getLavaDamageAt,
        getColliders: () => streaming.getActiveColliders(),
        dispose: () => streaming.dispose(),
        data: WORLD_DATA,
    };
}
