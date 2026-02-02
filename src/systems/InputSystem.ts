import Phaser from 'phaser';
import { TPlayerAction } from '../types/player.types';
import { Logger } from '../utils/Logger';

/** Key binding for a single action */
interface IKeyBinding {
    keyboard: number[];
    gamepadButton?: number;
}

/** Default key mappings for player 1 */
const DEFAULT_P1_BINDINGS: Record<TPlayerAction, IKeyBinding> = {
    left: { keyboard: [Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.A] },
    right: { keyboard: [Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.D] },
    up: { keyboard: [Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.W] },
    down: { keyboard: [Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.S] },
    jump: { keyboard: [Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.W], gamepadButton: 0 },
    attack: { keyboard: [Phaser.Input.Keyboard.KeyCodes.Z, Phaser.Input.Keyboard.KeyCodes.J], gamepadButton: 2 },
    skill: { keyboard: [Phaser.Input.Keyboard.KeyCodes.X, Phaser.Input.Keyboard.KeyCodes.K], gamepadButton: 3 },
    dodge: { keyboard: [Phaser.Input.Keyboard.KeyCodes.C, Phaser.Input.Keyboard.KeyCodes.L], gamepadButton: 1 },
    parry: { keyboard: [Phaser.Input.Keyboard.KeyCodes.SHIFT], gamepadButton: 4 },
    heal: { keyboard: [Phaser.Input.Keyboard.KeyCodes.V, Phaser.Input.Keyboard.KeyCodes.H], gamepadButton: 5 },
    interact: { keyboard: [Phaser.Input.Keyboard.KeyCodes.E, Phaser.Input.Keyboard.KeyCodes.U], gamepadButton: 0 },
    map: { keyboard: [Phaser.Input.Keyboard.KeyCodes.M, Phaser.Input.Keyboard.KeyCodes.TAB], gamepadButton: 8 },
    menu: { keyboard: [Phaser.Input.Keyboard.KeyCodes.ESC, Phaser.Input.Keyboard.KeyCodes.P], gamepadButton: 9 },
    inventory: { keyboard: [Phaser.Input.Keyboard.KeyCodes.I] },
};

/** Default key mappings for player 2 (keyboard) */
const DEFAULT_P2_BINDINGS: Record<TPlayerAction, IKeyBinding> = {
    left: { keyboard: [Phaser.Input.Keyboard.KeyCodes.LEFT] },
    right: { keyboard: [Phaser.Input.Keyboard.KeyCodes.RIGHT] },
    up: { keyboard: [Phaser.Input.Keyboard.KeyCodes.UP] },
    down: { keyboard: [Phaser.Input.Keyboard.KeyCodes.DOWN] },
    jump: { keyboard: [Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO], gamepadButton: 0 },
    attack: { keyboard: [Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE], gamepadButton: 2 },
    skill: { keyboard: [Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO], gamepadButton: 3 },
    dodge: { keyboard: [Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE], gamepadButton: 1 },
    parry: { keyboard: [13], gamepadButton: 4 }, // Numpad Enter
    heal: { keyboard: [107], gamepadButton: 5 }, // Numpad +
    interact: { keyboard: [Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE], gamepadButton: 0 },
    map: { keyboard: [] },
    menu: { keyboard: [Phaser.Input.Keyboard.KeyCodes.ESC], gamepadButton: 9 },
    inventory: { keyboard: [] },
};

const STICK_THRESHOLD = 0.3;

/**
 * Handles all input for both players, supporting keyboard and gamepads.
 */
export class InputSystem {
    private scene: Phaser.Scene;
    private keys: Map<number, Phaser.Input.Keyboard.Key> = new Map();
    private p1Bindings: Record<TPlayerAction, IKeyBinding>;
    private p2Bindings: Record<TPlayerAction, IKeyBinding>;
    private gamepads: (Phaser.Input.Gamepad.Gamepad | null)[] = [null, null];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.p1Bindings = { ...DEFAULT_P1_BINDINGS };
        this.p2Bindings = { ...DEFAULT_P2_BINDINGS };

        this.registerAllKeys();
        this.setupGamepadListeners();
    }

    private registerAllKeys(): void {
        const allBindings = [this.p1Bindings, this.p2Bindings];
        for (const bindings of allBindings) {
            for (const action of Object.values(bindings)) {
                for (const keyCode of action.keyboard) {
                    if (!this.keys.has(keyCode) && this.scene.input.keyboard) {
                        this.keys.set(keyCode, this.scene.input.keyboard.addKey(keyCode, true, false));
                    }
                }
            }
        }
    }

    private setupGamepadListeners(): void {
        if (!this.scene.input.gamepad) return;

        this.scene.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
            Logger.info('InputSystem', `Gamepad connected: ${pad.id} (index: ${pad.index})`);
            if (!this.gamepads[0]) {
                this.gamepads[0] = pad;
            } else if (!this.gamepads[1]) {
                this.gamepads[1] = pad;
            }
        });

        this.scene.input.gamepad.on('disconnected', (pad: Phaser.Input.Gamepad.Gamepad) => {
            Logger.info('InputSystem', `Gamepad disconnected: ${pad.id}`);
            if (this.gamepads[0] === pad) this.gamepads[0] = null;
            if (this.gamepads[1] === pad) this.gamepads[1] = null;
        });
    }

    /** Update should be called each frame (currently no-op, inputs checked on demand) */
    public update(): void {
        // Gamepads are checked in real-time via isActionPressed/JustPressed
    }

    /**
     * Check if an action is currently held down.
     * @param action The action to check
     * @param player 1 or 2
     */
    public isActionPressed(action: TPlayerAction, player: number): boolean {
        const bindings = player === 1 ? this.p1Bindings : this.p2Bindings;
        const binding = bindings[action];

        // Check keyboard
        for (const keyCode of binding.keyboard) {
            const key = this.keys.get(keyCode);
            if (key && key.isDown) return true;
        }

        // Check gamepad
        const padIndex = player - 1;
        const pad = this.gamepads[padIndex];
        if (pad && binding.gamepadButton !== undefined) {
            if (pad.buttons[binding.gamepadButton]?.pressed) return true;
        }

        // Check gamepad stick for directional actions
        if (pad) {
            if (action === 'left' && pad.leftStick.x < -STICK_THRESHOLD) return true;
            if (action === 'right' && pad.leftStick.x > STICK_THRESHOLD) return true;
            if (action === 'up' && pad.leftStick.y < -STICK_THRESHOLD) return true;
            if (action === 'down' && pad.leftStick.y > STICK_THRESHOLD) return true;
        }

        return false;
    }

    /**
     * Check if an action was just pressed this frame.
     * @param action The action to check
     * @param player 1 or 2
     */
    public isActionJustPressed(action: TPlayerAction, player: number): boolean {
        const bindings = player === 1 ? this.p1Bindings : this.p2Bindings;
        const binding = bindings[action];

        // Check keyboard
        for (const keyCode of binding.keyboard) {
            const key = this.keys.get(keyCode);
            if (key && Phaser.Input.Keyboard.JustDown(key)) return true;
        }

        // Check gamepad
        const padIndex = player - 1;
        const pad = this.gamepads[padIndex];
        if (pad && binding.gamepadButton !== undefined) {
            const button = pad.buttons[binding.gamepadButton];
            if (button && button.pressed && button.value === 1) {
                // Approximate "just pressed" for gamepad
                return true;
            }
        }

        return false;
    }

    /** Check if player 2 is requesting to join (Start button or Enter) */
    public isPlayer2JoinRequested(): boolean {
        // Check Enter key
        const enterKey = this.keys.get(Phaser.Input.Keyboard.KeyCodes.ENTER);
        if (enterKey && Phaser.Input.Keyboard.JustDown(enterKey)) return true;

        // Check second gamepad Start button
        const pad = this.gamepads[1];
        if (pad && pad.buttons[9]?.pressed) return true;

        return false;
    }

    /** Get the gamepad for a player (null if not connected) */
    public getGamepad(player: number): Phaser.Input.Gamepad.Gamepad | null {
        return this.gamepads[player - 1];
    }

    /** Trigger vibration on a player's gamepad */
    public vibrate(player: number, duration: number, weakMagnitude: number, strongMagnitude: number): void {
        const pad = this.gamepads[player - 1];
        if (pad && pad.vibration) {
            pad.vibration.playEffect('dual-rumble', {
                startDelay: 0,
                duration,
                weakMagnitude,
                strongMagnitude,
            }).catch(() => {
                // Vibration not supported
            });
        }
    }
}
