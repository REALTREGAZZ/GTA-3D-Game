/**
 * Player Controller V2
 * Currently delegates to the existing player system, but keeps an explicit module
 * boundary so future refactors don't bloat main.js.
 */

import { createPlayer } from './player.js';

export function createPlayerControllerV2(options = {}) {
    return createPlayer(options);
}
