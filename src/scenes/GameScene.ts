import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, DEPTH, COOP } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { SaveSystem } from '../systems/SaveSystem';

/**
 * Main game scene orchestrating gameplay, launching world and UI sub-scenes.
 */
export class GameScene extends BaseScene {
    private currentWorldScene: string = SCENES.HUB;
    private isPaused: boolean = false;

    constructor() {
        super(SCENES.GAME);
    }

    init(data: { worldScene?: string }): void {
        super.init();
        this.currentWorldScene = data?.worldScene || SCENES.HUB;
    }

    create(): void {
        Logger.info('GameScene', `Starting game in ${this.currentWorldScene}`);

        // Launch the world scene and UI scene in parallel
        this.scene.launch(this.currentWorldScene);
        this.scene.launch(SCENES.UI);

        // Event listeners for scene management
        this.events.on('change_world', this.onChangeWorld, this);
        this.events.on('pause_game', this.onPauseGame, this);
        this.events.on('resume_game', this.onResumeGame, this);
        this.events.on('return_to_menu', this.onReturnToMenu, this);
        this.events.on('player_died', this.onPlayerDied, this);
        this.events.on('travel_to_area', this.onTravelToArea, this);

        // Auto-save on area transitions
        this.events.on('area_transition', () => {
            SaveSystem.autoSave();
        });

        this.fadeIn();
    }

    update(time: number, delta: number): void {
        if (this.isPaused) return;

        // Update play time
        this.gameState.updatePlayTime();

        // Check for P2 join
        if (this.inputSystem.isPlayer2JoinRequested() && !this.gameState.getIsCoopActive()) {
            this.events.emit('player2_join_requested');
        }
    }

    /** Handle world scene change */
    private onChangeWorld(newWorldScene: string): void {
        Logger.info('GameScene', `Changing world to ${newWorldScene}`);

        // Stop current world scene
        this.scene.stop(this.currentWorldScene);

        // Launch new world scene
        this.currentWorldScene = newWorldScene;
        this.scene.launch(newWorldScene);

        // Auto-save
        SaveSystem.autoSave();
    }

    /** Handle travel to area from world map */
    private onTravelToArea(areaId: string): void {
        const areaToScene: Record<string, string> = {
            hub: SCENES.HUB,
            songak: SCENES.SONGAK,
            wansanju: SCENES.WANSANJU,
            geumseong: SCENES.GEUMSEONG,
            cheolwon: SCENES.CHEOLWON,
            paegang: SCENES.PAEGANG,
            sangju: SCENES.SANGJU,
        };

        const sceneKey = areaToScene[areaId];
        if (sceneKey && sceneKey !== this.currentWorldScene) {
            this.gameState.setCurrentArea(areaId);
            this.onChangeWorld(sceneKey);
        }
    }

    /** Pause the game */
    private onPauseGame(): void {
        this.isPaused = true;
        this.scene.pause(this.currentWorldScene);
    }

    /** Resume the game */
    private onResumeGame(): void {
        this.isPaused = false;
        this.scene.resume(this.currentWorldScene);
    }

    /** Return to main menu */
    private async onReturnToMenu(): Promise<void> {
        this.scene.stop(this.currentWorldScene);
        this.scene.stop(SCENES.UI);
        await this.transitionTo(SCENES.MAIN_MENU);
    }

    /** Handle player death */
    private onPlayerDied(): void {
        Logger.info('GameScene', 'Player died');

        // Show death screen briefly, then respawn
        const deathText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '사망', {
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(DEPTH.UI + 10);

        this.time.delayedCall(2000, () => {
            deathText.destroy();
            // Respawn at last save point
            this.events.emit('respawn_player');
        });
    }

    shutdown(): void {
        this.events.off('change_world');
        this.events.off('pause_game');
        this.events.off('resume_game');
        this.events.off('return_to_menu');
        this.events.off('player_died');
        this.events.off('travel_to_area');
    }
}
