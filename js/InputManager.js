/**
 * Input Manager
 * Simple keyboard and mouse input handling
 */

import { INPUT_CONFIG } from './config.js';

export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { deltaX: 0, deltaY: 0, leftDown: false, rightDown: false };
        this.mouseSensitivity = INPUT_CONFIG.MOUSE.SENSITIVITY || 0.002;
        this.invertY = INPUT_CONFIG.MOUSE.INVERT_Y || false;
        
        this._setupKeyboardListeners();
        this._setupMouseListeners();
    }

    _setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Escape') {
                this._emit('pause');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    _setupMouseListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.deltaX = e.movementX;
            this.mouse.deltaY = e.movementY;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.leftDown = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    _emit(event) {
        const handlers = this._eventHandlers[event] || [];
        handlers.forEach(handler => handler());
    }

    _eventHandlers = {};

    on(event, handler) {
        if (!this._eventHandlers[event]) {
            this._eventHandlers[event] = [];
        }
        this._eventHandlers[event].push(handler);
    }

    isDown(keyCodes) {
        if (Array.isArray(keyCodes)) {
            return keyCodes.some(code => this.keys[code]);
        }
        return this.keys[keyCodes] || false;
    }

    getForward() {
        return this.isDown(INPUT_CONFIG.KEYBOARD.MOVE_FORWARD);
    }

    getBackward() {
        return this.isDown(INPUT_CONFIG.KEYBOARD.MOVE_BACKWARD);
    }

    getLeft() {
        return this.isDown(INPUT_CONFIG.KEYBOARD.MOVE_LEFT);
    }

    getRight() {
        return this.isDown(INPUT_CONFIG.KEYBOARD.MOVE_RIGHT);
    }

    getJump() {
        return this.isDown(INPUT_CONFIG.KEYBOARD.JUMP);
    }

    getSprint() {
        return this.isDown(INPUT_CONFIG.KEYBOARD.SPRINT);
    }

    getMouseDelta() {
        const delta = { x: this.mouse.deltaX, y: this.mouse.deltaY };
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        return delta;
    }

    update(deltaTime) {
        // Reset mouse deltas after reading
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
    }
}
