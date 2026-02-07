import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { SaveSystem } from '../systems/SaveSystem';

/** Data passed when starting a battle */
interface IBattleData {
    enemyName: string;
    enemyNameKo: string;
    enemyHp: number;
    enemyAtk: number;
    enemyDef: number;
    enemyExp: number;
    enemyGold: [number, number];
    returnScene: string;
}

/**
 * Main game scene orchestrating gameplay, launching world and UI sub-scenes.
 * Updated for top-down RPG with battle transitions.
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
        this.events.on('start_battle', this.onStartBattle, this);
        this.events.on('battle_ended', this.onBattleEnded, this);

        // Auto-save on area transitions
        this.events.on('area_transition', () => {
            SaveSystem.autoSave();
        });

        this.fadeIn();
    }

    update(_time: number, _delta: number): void {
        if (this.isPaused) return;
        this.gameState.updatePlayTime();
    }

    /** Handle world scene change */
    private onChangeWorld(newWorldScene: string, data?: { playerX?: number; playerY?: number }): void {
        Logger.info('GameScene', `Changing world to ${newWorldScene}`);

        this.scene.stop(this.currentWorldScene);
        this.currentWorldScene = newWorldScene;
        this.scene.launch(newWorldScene, data);

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

    /** Start a battle - pause world, launch battle scene */
    private onStartBattle(battleData: IBattleData): void {
        Logger.info('GameScene', `Battle started against ${battleData.enemyNameKo}`);

        // Pause the current world scene (keep it running in background)
        this.scene.pause(this.currentWorldScene);
        this.isPaused = true;

        // Launch battle scene
        this.scene.launch(SCENES.BATTLE, {
            ...battleData,
            returnScene: this.currentWorldScene,
        });
    }

    /** Battle ended - resume world scene */
    private onBattleEnded(result: { victory: boolean; exp?: number; gold?: number }): void {
        Logger.info('GameScene', `Battle ended. Victory: ${result.victory}`);

        // Stop battle scene
        this.scene.stop(SCENES.BATTLE);

        if (result.victory) {
            // Award rewards
            if (result.exp) {
                this.gameState.addExp(result.exp);
            }
            if (result.gold) {
                this.gameState.addGold(result.gold);
            }

            // Resume world
            this.scene.resume(this.currentWorldScene);
            this.isPaused = false;
        } else {
            // Player died - return to menu
            this.onPlayerDied();
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

        const deathText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '사망', {
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(DEPTH.UI + 10).setScrollFactor(0);

        this.time.delayedCall(2000, () => {
            deathText.destroy();
            this.scene.stop(this.currentWorldScene);
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.MAIN_MENU);
        });
    }

    shutdown(): void {
        this.events.off('change_world');
        this.events.off('pause_game');
        this.events.off('resume_game');
        this.events.off('return_to_menu');
        this.events.off('player_died');
        this.events.off('travel_to_area');
        this.events.off('start_battle');
        this.events.off('battle_ended');
    }
}
