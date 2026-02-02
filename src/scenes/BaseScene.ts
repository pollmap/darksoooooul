import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';
import { InputSystem } from '../systems/InputSystem';
import { GameState } from '../state/GameState';

/**
 * Base scene class providing common functionality for all game scenes.
 */
export abstract class BaseScene extends Phaser.Scene {
    protected audioSystem!: AudioSystem;
    protected inputSystem!: InputSystem;
    protected gameState!: GameState;

    constructor(key: string) {
        super(key);
    }

    init(_data?: object): void {
        this.audioSystem = AudioSystem.getInstance();
        this.audioSystem.init(this);
        this.inputSystem = new InputSystem(this);
        this.gameState = GameState.getInstance();
    }

    /** Fade in the camera */
    protected fadeIn(duration: number = 500): void {
        this.cameras.main.fadeIn(duration);
    }

    /** Fade out the camera and return a promise */
    protected fadeOut(duration: number = 500): Promise<void> {
        return new Promise(resolve => {
            this.cameras.main.fadeOut(duration);
            this.cameras.main.once('camerafadeoutcomplete', resolve);
        });
    }

    /** Transition to another scene with fade */
    protected async transitionTo(sceneKey: string, data?: object): Promise<void> {
        await this.fadeOut();
        this.scene.start(sceneKey, data);
    }

    /** Show a notification message on screen */
    protected showNotification(message: string, duration: number = 2000): void {
        const text = this.add.text(
            Number(this.game.config.width) / 2,
            100,
            message,
            {
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                backgroundColor: '#333333aa',
                padding: { x: 16, y: 8 },
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

        this.tweens.add({
            targets: text,
            alpha: 0,
            y: 80,
            duration: duration,
            ease: 'Power2',
            onComplete: () => text.destroy(),
        });
    }
}
