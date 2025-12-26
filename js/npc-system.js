/**
 * NPC System
 * Pool-based management for NPC spawning, updating, and optimization.
 */

import * as THREE from 'three';
import { createNPC } from './npc.js';

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

    function spawnAtPosition(position, count = 1) {
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
            npc.reset(spawnPos);
            state.active.push(npc);
            spawned.push(npc);
            state.totalSpawned++;
        }
        return spawned;
    }

    function spawn(position = null, count = 1) {
        if (position) {
            return spawnAtPosition(position, count);
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

            npc.reset(randomPos);
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

    function update(dt, context = {}) {
        const { player = null, camera = null } = context;

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

        for (let i = 0; i < state.active.length; i++) {
            const npc = state.active[i];
            npc.update(dt, state.active, buildings, {
                player,
                terrainHeightAt,
                isInView,
                attackPlayerRadius,
                fleePlayerRadius,
                detectionRadius,
            });
        }

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
        state,
    };
}
