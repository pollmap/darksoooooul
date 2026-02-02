import Phaser from 'phaser';
import { gameConfig } from './config/game.config';

/** Main game instance */
const game = new Phaser.Game(gameConfig);

window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    console.log(`[Input] Gamepad connected: ${e.gamepad.id}`);
});

window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
    console.log(`[Input] Gamepad disconnected: ${e.gamepad.id}`);
});

export default game;
