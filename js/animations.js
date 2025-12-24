/**
 * Animation System (procedural)
 * Player animations: idle, walk, run (+ jump)
 * Includes smooth cross-fade between states.
 */

import * as THREE from 'three';

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createEmptyPose() {
    return {
        body: {
            pos: new THREE.Vector3(),
            rot: new THREE.Euler(),
            scale: new THREE.Vector3(1, 1, 1),
        },
        head: {
            pos: new THREE.Vector3(),
            rot: new THREE.Euler(),
            scale: new THREE.Vector3(1, 1, 1),
        },
        feet: {
            pos: new THREE.Vector3(),
            rot: new THREE.Euler(),
            scale: new THREE.Vector3(1, 1, 1),
        },
        indicator: {
            pos: new THREE.Vector3(),
            rot: new THREE.Euler(),
            scale: new THREE.Vector3(1, 1, 1),
        },
    };
}

function clonePose(pose) {
    return {
        body: {
            pos: pose.body.pos.clone(),
            rot: pose.body.rot.clone(),
            scale: pose.body.scale.clone(),
        },
        head: {
            pos: pose.head.pos.clone(),
            rot: pose.head.rot.clone(),
            scale: pose.head.scale.clone(),
        },
        feet: {
            pos: pose.feet.pos.clone(),
            rot: pose.feet.rot.clone(),
            scale: pose.feet.scale.clone(),
        },
        indicator: {
            pos: pose.indicator.pos.clone(),
            rot: pose.indicator.rot.clone(),
            scale: pose.indicator.scale.clone(),
        },
    };
}

function lerpPose(a, b, t) {
    const pose = createEmptyPose();

    pose.body.pos.lerpVectors(a.body.pos, b.body.pos, t);
    pose.head.pos.lerpVectors(a.head.pos, b.head.pos, t);
    pose.feet.pos.lerpVectors(a.feet.pos, b.feet.pos, t);
    pose.indicator.pos.lerpVectors(a.indicator.pos, b.indicator.pos, t);

    pose.body.rot.set(
        THREE.MathUtils.lerp(a.body.rot.x, b.body.rot.x, t),
        THREE.MathUtils.lerp(a.body.rot.y, b.body.rot.y, t),
        THREE.MathUtils.lerp(a.body.rot.z, b.body.rot.z, t),
    );
    pose.head.rot.set(
        THREE.MathUtils.lerp(a.head.rot.x, b.head.rot.x, t),
        THREE.MathUtils.lerp(a.head.rot.y, b.head.rot.y, t),
        THREE.MathUtils.lerp(a.head.rot.z, b.head.rot.z, t),
    );
    pose.feet.rot.set(
        THREE.MathUtils.lerp(a.feet.rot.x, b.feet.rot.x, t),
        THREE.MathUtils.lerp(a.feet.rot.y, b.feet.rot.y, t),
        THREE.MathUtils.lerp(a.feet.rot.z, b.feet.rot.z, t),
    );
    pose.indicator.rot.set(
        THREE.MathUtils.lerp(a.indicator.rot.x, b.indicator.rot.x, t),
        THREE.MathUtils.lerp(a.indicator.rot.y, b.indicator.rot.y, t),
        THREE.MathUtils.lerp(a.indicator.rot.z, b.indicator.rot.z, t),
    );

    pose.body.scale.lerpVectors(a.body.scale, b.body.scale, t);
    pose.head.scale.lerpVectors(a.head.scale, b.head.scale, t);
    pose.feet.scale.lerpVectors(a.feet.scale, b.feet.scale, t);
    pose.indicator.scale.lerpVectors(a.indicator.scale, b.indicator.scale, t);

    return pose;
}

function getPoseForAnimation(name, timeSeconds, durations) {
    const pose = createEmptyPose();

    switch (name) {
        case 'idle': {
            const duration = durations.idle;
            const phase = (timeSeconds / duration) * Math.PI * 2;
            const breathe = Math.sin(phase);

            pose.body.pos.y += breathe * 0.02;
            pose.head.pos.y += breathe * 0.03;
            pose.head.rot.y += Math.sin(phase * 0.25) * 0.08;
            break;
        }

        case 'walk': {
            const duration = durations.walk;
            const phase = (timeSeconds / duration) * Math.PI * 2;

            pose.body.pos.y += Math.abs(Math.sin(phase)) * 0.05;
            pose.head.pos.y += Math.abs(Math.sin(phase)) * 0.08;

            pose.feet.pos.y += Math.sin(phase) * 0.03;
            pose.feet.pos.z += Math.sin(phase) * 0.02;

            pose.body.rot.z += Math.sin(phase) * 0.03;
            break;
        }

        case 'run': {
            const duration = durations.run;
            const phase = (timeSeconds / duration) * Math.PI * 2;

            pose.body.pos.y += Math.abs(Math.sin(phase)) * 0.1;
            pose.head.pos.y += Math.abs(Math.sin(phase)) * 0.15;

            pose.feet.pos.y += Math.sin(phase) * 0.08;
            pose.feet.pos.z += Math.sin(phase) * 0.05;

            pose.body.rot.z += Math.sin(phase) * 0.05;
            pose.body.rot.x += Math.sin(phase * 0.5) * 0.03;
            pose.head.rot.x += Math.sin(phase) * 0.05;
            break;
        }

        case 'jump': {
            const duration = durations.jump;
            const p = Math.min(timeSeconds / Math.max(0.0001, duration), 1);

            // Stretch on takeoff, compress on landing
            if (p < 0.25) {
                const s = p / 0.25;
                pose.body.scale.y = 1 + s * 0.2;
                pose.body.scale.x = 1 - s * 0.05;
                pose.body.scale.z = 1 - s * 0.05;
            } else if (p > 0.75) {
                const c = (p - 0.75) / 0.25;
                pose.body.scale.y = 1.2 - c * 0.2;
                pose.body.scale.x = 0.95 + c * 0.05;
                pose.body.scale.z = 0.95 + c * 0.05;
                pose.feet.pos.y -= c * 0.05;
            }

            pose.body.rot.x -= 0.15;
            pose.indicator.pos.y += 0.2;
            break;
        }

        default:
            break;
    }

    return pose;
}

export function createAnimationController(player) {
    const durations = {
        idle: 2.0,
        walk: 1.0,
        run: 0.6,
        jump: 0.5,
    };

    const rest = {
        body: {
            pos: player.body.position.clone(),
            rot: player.body.rotation.clone(),
            scale: player.body.scale.clone(),
        },
        head: {
            pos: player.head.position.clone(),
            rot: player.head.rotation.clone(),
            scale: player.head.scale.clone(),
        },
        feet: {
            pos: player.feet.position.clone(),
            rot: player.feet.rotation.clone(),
            scale: player.feet.scale.clone(),
        },
        indicator: {
            pos: player.indicator.position.clone(),
            rot: player.indicator.rotation.clone(),
            scale: player.indicator.scale.clone(),
        },
    };

    const state = {
        current: 'idle',
        time: 0,
        isTransitioning: false,
        transitionTime: 0,
        transitionDuration: 0.18,
        fromPose: null,
    };

    function setAnimation(name) {
        if (name === state.current) return;

        state.fromPose = clonePose(getPoseForAnimation(state.current, state.time, durations));
        state.current = name;
        state.time = 0;
        state.isTransitioning = true;
        state.transitionTime = 0;
    }

    function applyPose(pose) {
        player.body.position.copy(rest.body.pos).add(pose.body.pos);
        player.body.rotation.set(
            rest.body.rot.x + pose.body.rot.x,
            rest.body.rot.y + pose.body.rot.y,
            rest.body.rot.z + pose.body.rot.z,
        );
        player.body.scale.copy(rest.body.scale).multiply(pose.body.scale);

        player.head.position.copy(rest.head.pos).add(pose.head.pos);
        player.head.rotation.set(
            rest.head.rot.x + pose.head.rot.x,
            rest.head.rot.y + pose.head.rot.y,
            rest.head.rot.z + pose.head.rot.z,
        );
        player.head.scale.copy(rest.head.scale).multiply(pose.head.scale);

        player.feet.position.copy(rest.feet.pos).add(pose.feet.pos);
        player.feet.rotation.set(
            rest.feet.rot.x + pose.feet.rot.x,
            rest.feet.rot.y + pose.feet.rot.y,
            rest.feet.rot.z + pose.feet.rot.z,
        );
        player.feet.scale.copy(rest.feet.scale).multiply(pose.feet.scale);

        player.indicator.position.copy(rest.indicator.pos).add(pose.indicator.pos);
        player.indicator.rotation.set(
            rest.indicator.rot.x + pose.indicator.rot.x,
            rest.indicator.rot.y + pose.indicator.rot.y,
            rest.indicator.rot.z + pose.indicator.rot.z,
        );
        player.indicator.scale.copy(rest.indicator.scale).multiply(pose.indicator.scale);
    }

    function update(deltaTime, playerState) {
        // Decide which animation should be active
        let target = 'idle';

        if (!playerState.isGrounded) {
            target = 'jump';
        } else if (playerState.isMoving) {
            target = playerState.isRunning ? 'run' : 'walk';
        }

        setAnimation(target);

        // Advance time
        state.time += deltaTime;
        const duration = durations[state.current] ?? 1;
        if (state.current !== 'jump') {
            state.time = state.time % duration;
        } else {
            state.time = Math.min(state.time, duration);
        }

        // Create current pose
        const toPose = getPoseForAnimation(state.current, state.time, durations);

        // Blend if transitioning
        let finalPose = toPose;
        if (state.isTransitioning && state.fromPose) {
            state.transitionTime += deltaTime;
            const t = Math.min(1, state.transitionTime / state.transitionDuration);
            finalPose = lerpPose(state.fromPose, toPose, easeInOut(t));

            if (t >= 1) {
                state.isTransitioning = false;
                state.fromPose = null;
            }
        }

        applyPose(finalPose);
    }

    function getState() {
        return { ...state };
    }

    return {
        update,
        setAnimation,
        getState,
    };
}
