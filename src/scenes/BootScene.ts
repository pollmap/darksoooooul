import Phaser from 'phaser';
import { SCENES } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/**
 * Boot scene - first scene loaded. Sets up minimal config and transitions to preloader.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super(SCENES.BOOT);
    }

    preload(): void {
        Logger.info('BootScene', 'Booting...');
    }

    create(): void {
        // Set default font
        this.add.text(0, 0, '', { fontFamily: 'monospace' }).destroy();

        Logger.info('BootScene', 'Boot complete, starting preloader');
        this.scene.start(SCENES.PRELOADER);
    }
}
