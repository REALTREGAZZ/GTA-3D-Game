/**
 * World Streaming
 * Chunk-based load/unload for open-world decoration and colliders.
 */

import * as THREE from 'three';

export function createWorldStreaming({
    parent,
    chunkSize = 100,
    viewDistance = 250,
    buildChunk,
} = {}) {
    if (!parent) throw new Error('createWorldStreaming: parent is required');
    if (typeof buildChunk !== 'function') throw new Error('createWorldStreaming: buildChunk(chunkX,chunkZ) is required');

    const state = {
        chunks: new Map(),
        chunkSize,
        viewDistance,
        collidersDirty: true,
        collidersCache: [],
    };

    function key(cx, cz) {
        return `${cx},${cz}`;
    }

    function worldToChunkCoord(v) {
        return Math.floor(v / state.chunkSize);
    }

    function loadChunk(cx, cz) {
        const k = key(cx, cz);
        if (state.chunks.has(k)) return;

        const chunk = buildChunk(cx, cz);
        if (!chunk?.group) return;

        chunk.group.name = chunk.group.name || `Chunk_${k}`;
        parent.add(chunk.group);

        state.chunks.set(k, {
            cx,
            cz,
            group: chunk.group,
            colliders: chunk.colliders || [],
            dispose: chunk.dispose || null,
        });
        state.collidersDirty = true;
    }

    function unloadChunk(k) {
        const chunk = state.chunks.get(k);
        if (!chunk) return;

        parent.remove(chunk.group);

        if (typeof chunk.dispose === 'function') {
            chunk.dispose();
        } else {
            // Best-effort dispose.
            chunk.group.traverse((obj) => {
                if (obj.isMesh) {
                    obj.geometry?.dispose?.();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m) => m.dispose?.());
                    } else {
                        obj.material?.dispose?.();
                    }
                }
            });
        }

        state.chunks.delete(k);
        state.collidersDirty = true;
    }

    function update(playerPosition) {
        if (!playerPosition) return;

        const minX = playerPosition.x - state.viewDistance;
        const maxX = playerPosition.x + state.viewDistance;
        const minZ = playerPosition.z - state.viewDistance;
        const maxZ = playerPosition.z + state.viewDistance;

        const minCx = worldToChunkCoord(minX);
        const maxCx = worldToChunkCoord(maxX);
        const minCz = worldToChunkCoord(minZ);
        const maxCz = worldToChunkCoord(maxZ);

        const needed = new Set();
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cz = minCz; cz <= maxCz; cz++) {
                const k = key(cx, cz);
                needed.add(k);
                loadChunk(cx, cz);
            }
        }

        for (const k of state.chunks.keys()) {
            if (!needed.has(k)) {
                unloadChunk(k);
            }
        }
    }

    function getActiveColliders() {
        if (!state.collidersDirty) return state.collidersCache;

        const colliders = [];
        for (const chunk of state.chunks.values()) {
            if (chunk.colliders?.length) colliders.push(...chunk.colliders);
        }

        state.collidersCache = colliders;
        state.collidersDirty = false;
        return colliders;
    }

    function dispose() {
        for (const k of Array.from(state.chunks.keys())) {
            unloadChunk(k);
        }
        state.chunks.clear();
        state.collidersCache = [];
        state.collidersDirty = true;
    }

    return {
        update,
        getActiveColliders,
        dispose,
        state,
    };
}
