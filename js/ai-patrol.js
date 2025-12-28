/**
 * AI Patrol
 * Minimal waypoint patrol support for NPCs.
 */

import * as THREE from 'three';

export function assignPatrolRoute(npc, points = []) {
    if (!npc?.state) return;

    npc.state.patrol = {
        points: points.map((p) => (p?.isVector3 ? p.clone() : new THREE.Vector3(p.x, p.y ?? 0, p.z))),
        index: 0,
        arriveRadius: 2.5,
    };
}

export function generatePatrolPointsAround(position, {
    count = 4,
    radius = 18,
    terrainHeightAt = null,
} = {}) {
    const pts = [];

    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const r = radius * (0.65 + Math.random() * 0.35);
        const x = position.x + Math.cos(a) * r;
        const z = position.z + Math.sin(a) * r;
        const y = typeof terrainHeightAt === 'function' ? terrainHeightAt(x, z) : position.y;
        pts.push(new THREE.Vector3(x, y, z));
    }

    return pts;
}
