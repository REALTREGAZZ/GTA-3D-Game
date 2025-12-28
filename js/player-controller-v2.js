/**
 * Player Controller V2
 * Uses Dark Souls inspired player controller with physics-based movement and collision.
 */

import { createDarkSoulsPlayer } from './dark-souls-player-controller.js';

export function createPlayerControllerV2(options = {}) {
    return createDarkSoulsPlayer(options);
}
