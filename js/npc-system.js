/**
 * NPC System
 * Pool-based management for NPC spawning, updating, and optimization.
 */

import * as THREE from 'three';
import { createNPC } from './npc.js';
import { GAME_CONFIG } from './config.js';

export function createNPCSystem(config = {}) {
    const {
        scene,
        maxNPCs = 25,
        spawnInterval = 12.0,
        detectionRadius = 20,
        attackPlayerRadius = 2.2,
        fleePlayerRadius = 4.0,
        mapSize = 600,
        buildings = null,
        terrainHeightAt = null,
    } = config;

    const state = {
        pool: [],
        active: [],
        spawnTimer: 0,
        totalSpawned: 0,
        trailsSystem: null,
        dustEmitterSystem: null,
    };

    // Create pool of NPCs
    for (let i = 0; i < maxNPCs; i++) {
        const npc = createNPC(new THREE.Vector3(0, -1000, 0));
        npc.setActive(false);
        state.pool.push(npc);
        if (scene) {
            scene.add(npc.mesh);
        }
    }

    function spawnAtPosition(position, count = 1, options = {}) {
        const spawned = [];
        for (let i = 0; i < count; i++) {
            const npc = getInactiveNPC();
            if (!npc) break;

            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                0,
                (Math.random() - 0.5) * 3
            );
            const spawnPos = position.clone().add(offset);
            npc.reset(spawnPos, options);
            state.active.push(npc);
            spawned.push(npc);
            state.totalSpawned++;
        }
        return spawned;
    }

    function spawn(position = null, count = 1, options = {}) {
        if (position) {
            return spawnAtPosition(position, count, options);
        }

        // Random spawn across map
        const spawned = [];
        for (let i = 0; i < count; i++) {
            const npc = getInactiveNPC();
            if (!npc) break;

            const randomPos = new THREE.Vector3(
                (Math.random() - 0.5) * mapSize * 0.7,
                5,
                (Math.random() - 0.5) * mapSize * 0.7
            );

            npc.reset(randomPos, options);
            state.active.push(npc);
            spawned.push(npc);
            state.totalSpawned++;
        }
        return spawned;
    }

    function getInactiveNPC() {
        for (let i = 0; i < state.pool.length; i++) {
            if (!state.pool[i].state.active) {
                return state.pool[i];
            }
        }
        return null;
    }

    const NPC_COLLISION_CONFIG = {
        radius: 0.55,
        heavyRadius: 0.85,
        iterations: 2,
        maxPushPerIteration: 0.25,
    };

    function getNPCRadius(npc) {
        return npc?.state?.type === 'HEAVY' ? NPC_COLLISION_CONFIG.heavyRadius : NPC_COLLISION_CONFIG.radius;
    }

    function resolveNPCCollisions(dt, feedback) {
        const npcs = state.active;
        if (npcs.length < 2) return;

        const threshold = GAME_CONFIG.COMBAT.COLLISION_SHAKE_THRESHOLD || 15.0;
        const ragdollCollisionDamage = GAME_CONFIG.COMBAT.FURIA?.RAGDOLL_COLLISION_DAMAGE || 5;

        for (let iter = 0; iter < NPC_COLLISION_CONFIG.iterations; iter++) {
            for (let i = 0; i < npcs.length; i++) {
                const a = npcs[i];
                if (!a?.state?.active || a.state?.state === 'DEAD') continue;

                for (let j = i + 1; j < npcs.length; j++) {
                    const b = npcs[j];
                    if (!b?.state?.active || b.state?.state === 'DEAD') continue;

                    const ax = a.mesh.position.x;
                    const az = a.mesh.position.z;
                    const bx = b.mesh.position.x;
                    const bz = b.mesh.position.z;

                    let dx = bx - ax;
                    let dz = bz - az;
                    let distSq = dx * dx + dz * dz;

                    const minDist = getNPCRadius(a) + getNPCRadius(b);
                    const minDistSq = minDist * minDist;

                    if (distSq < 1e-10) {
                        const angle = Math.random() * Math.PI * 2;
                        dx = Math.cos(angle) * 1e-4;
                        dz = Math.sin(angle) * 1e-4;
                        distSq = dx * dx + dz * dz;
                    }

                    if (distSq >= minDistSq) continue;

                    const dist = Math.sqrt(distSq);
                    const penetration = minDist - dist;

                    const nx = dx / dist;
                    const nz = dz / dist;

                    const push = Math.min(NPC_COLLISION_CONFIG.maxPushPerIteration, penetration * 0.5);

                    a.mesh.position.x -= nx * push;
                    a.mesh.position.z -= nz * push;
                    b.mesh.position.x += nx * push;
                    b.mesh.position.z += nz * push;

                    // Collision feedback + ragdoll collision damage (ported from npc.js)
                    const aVel = a.state?.velocity;
                    const bVel = b.state?.velocity;
                    const relSpeed = aVel && bVel ? aVel.clone().sub(bVel).length() : 0;

                    const aCd = a.state?.collisionShakeCooldown ?? 0;
                    const bCd = b.state?.collisionShakeCooldown ?? 0;

                    if (
                        feedback?.applyScreenShake &&
                        aCd <= 0 &&
                        bCd <= 0 &&
                        relSpeed > threshold
                    ) {
                        const impact = Math.min(1.0, (relSpeed - threshold) / threshold);
                        feedback.applyScreenShake(0.3 + 0.7 * impact, (GAME_CONFIG.COMBAT.SCREEN_SHAKE_DURATION || 0.25) * 0.75);

                        a.state.collisionShakeCooldown = 0.25;
                        b.state.collisionShakeCooldown = 0.25;
                    }

                    if (a.state?.isRagdoll && ragdollCollisionDamage > 0) {
                        b.takeDamage?.(ragdollCollisionDamage, a, relSpeed);
                        b.state?.velocity?.add?.(new THREE.Vector3(nx, 0, nz).multiplyScalar(15.0));
                    }

                    if (b.state?.isRagdoll && ragdollCollisionDamage > 0) {
                        a.takeDamage?.(ragdollCollisionDamage, b, relSpeed);
                        a.state?.velocity?.add?.(new THREE.Vector3(-nx, 0, -nz).multiplyScalar(15.0));
                    }
                }
            }
        }

        // Re-snap non-ragdoll NPCs to ground after resolution
        if (typeof terrainHeightAt === 'function') {
            for (const npc of npcs) {
                if (!npc?.state?.active || npc.state?.state === 'DEAD') continue;
                if (npc.state.isRagdoll || npc.state.isSuspended) continue;

                const groundY = terrainHeightAt(npc.mesh.position.x, npc.mesh.position.z);
                npc.mesh.position.y = groundY + 1.0;
            }
        }
    }

    function update(dt, context = {}) {
        const { player = null, camera = null, feedback = null, decalSystem = null } = context;

        // Frustum culling helper (optional)
        let isInView = null;
        if (camera) {
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            );
            frustum.setFromProjectionMatrix(matrix);

            isInView = (position) => {
                return frustum.containsPoint(position);
            };
        }

        // Update active NPCs
        // Remove dead/inactive from active list
        state.active = state.active.filter((npc) => npc.state.active);

        const cullingDistSq = Math.pow(GAME_CONFIG.AI_CULLING_DISTANCE || 40, 2);
        const camPos = camera?.position;

        for (let i = 0; i < state.active.length; i++) {
            const npc = state.active[i];
            
            // Aggressive AI culling
            if (camPos) {
                const distSq = npc.mesh.position.distanceToSquared(camPos);
                if (distSq > cullingDistSq) {
                    // Skip AI update for far NPCs
                    // But still update their basic status
                    npc.state.attackCooldown = Math.max(0, npc.state.attackCooldown - dt);
                    npc.state.timeToChangeDir = Math.max(0, npc.state.timeToChangeDir - dt);
                    npc.state.collisionShakeCooldown = Math.max(0, npc.state.collisionShakeCooldown - dt);
                    continue;
                }
            }

            npc.update(dt, state.active, buildings, {
                player,
                terrainHeightAt,
                isInView,
                attackPlayerRadius,
                fleePlayerRadius,
                detectionRadius,
                feedback,
                decalSystem,
                trailsSystem: state.trailsSystem,
                dustEmitterSystem: state.dustEmitterSystem,
            });
        }

        // Capsule-style NPC-vs-NPC resolution (prevents interpenetration)
        resolveNPCCollisions(dt, feedback);

        // Auto-spawn new NPCs if population is low
        state.spawnTimer += dt;
        if (state.spawnTimer >= spawnInterval) {
            state.spawnTimer = 0;
            const numActive = state.active.length;
            if (numActive < maxNPCs * 0.6) {
                const toSpawn = Math.min(3, maxNPCs - numActive);
                spawn(null, toSpawn);
            }
        }
    }

    function getNPCsNear(position, radius) {
        return state.active.filter((npc) => {
            return npc.mesh.position.distanceTo(position) < radius;
        });
    }

    function getAllActiveNPCs() {
        return state.active;
    }

    function getStats() {
        return {
            active: state.active.length,
            poolSize: state.pool.length,
            totalSpawned: state.totalSpawned,
        };
    }

    function clear() {
        for (let i = 0; i < state.pool.length; i++) {
            state.pool[i].setActive(false);
        }
        state.active.length = 0;
        state.spawnTimer = 0;
    }

    return {
        spawn,
        update,
        getNPCsNear,
        getAllActiveNPCs,
        getStats,
        clear,
        setTrailsSystem(ts) { state.trailsSystem = ts; },
        setDustEmitterSystem(des) { state.dustEmitterSystem = des; },
        state,
    };
}
