import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloaderScene } from '../scenes/PreloaderScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { DialogueScene } from '../scenes/DialogueScene';
import { BattleScene } from '../scenes/BattleScene';
import { HubScene } from '../scenes/worlds/HubScene';
import { SongakScene } from '../scenes/worlds/SongakScene';
import { WansanjuScene } from '../scenes/worlds/WansanjuScene';
import { GeumseongScene } from '../scenes/worlds/GeumseongScene';
import { CheolwonScene } from '../scenes/worlds/CheolwonScene';
import { PaegangScene } from '../scenes/worlds/PaegangScene';
import { SangjuScene } from '../scenes/worlds/SangjuScene';

/** Game resolution width */
export const GAME_WIDTH = 1280;

/** Game resolution height */
export const GAME_HEIGHT = 720;

/** Whether the game is in development mode */
export const IS_DEV = import.meta.env.DEV;

/** Main Phaser game configuration for top-down RPG (no gravity) */
export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: IS_DEV,
        },
    },
    input: {
        gamepad: true,
    },
    scene: [
        BootScene,
        PreloaderScene,
        MainMenuScene,
        GameScene,
        UIScene,
        DialogueScene,
        BattleScene,
        HubScene,
        SongakScene,
        WansanjuScene,
        GeumseongScene,
        CheolwonScene,
        PaegangScene,
        SangjuScene,
    ],
};
