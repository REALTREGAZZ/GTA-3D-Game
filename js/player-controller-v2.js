/**
 * Player Controller V2 (Async)
 * Uses Dark Souls inspired player controller with physics-based movement and collision.
 */

import { createDarkSoulsPlayer } from './dark-souls-player-controller.js';

export async function createPlayerControllerV2(options = {}) {
    return await createDarkSoulsPlayer(options);
}
