import Phaser from 'phaser';
import { gameConfig } from './config/game.config';
import { Logger } from './utils/Logger';

/** Main game instance */
const game = new Phaser.Game(gameConfig);

window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    Logger.info('Input', `Gamepad connected: ${e.gamepad.id}`);
});

window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
    Logger.info('Input', `Gamepad disconnected: ${e.gamepad.id}`);
});

export default game;
