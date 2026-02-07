import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_STRINGS, DEPTH, COLORS } from '../utils/Constants';
import { GameState } from '../state/GameState';
import { formatGold } from '../utils/Helpers';
import { Logger } from '../utils/Logger';

/**
 * Simplified top-down RPG HUD.
 * Shows area name, HP, gold in a clean Pokémon-style layout.
 */
export class HUD extends Phaser.GameObjects.Container {
    private gameState: GameState;

    private areaText!: Phaser.GameObjects.Text;
    private hpText!: Phaser.GameObjects.Text;
    private goldText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private notificationText!: Phaser.GameObjects.Text;

    /** Background panel for HUD info */
    private hudBg!: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.gameState = GameState.getInstance();
        this.createHUD();
        this.setupEventListeners();

        this.setScrollFactor(0);
        this.setDepth(DEPTH.UI);
    }

    /** Create the HUD elements */
    private createHUD(): void {
        // Top bar background
        this.hudBg = this.scene.add.rectangle(0, 0, GAME_WIDTH, 28, 0x000000, 0.6)
            .setOrigin(0, 0).setScrollFactor(0);
        this.add(this.hudBg);

        // Area name (left)
        this.areaText = this.scene.add.text(8, 4, '', {
            fontSize: '12px',
            color: COLOR_STRINGS.WHITE,
            fontFamily: 'monospace',
        }).setScrollFactor(0);
        this.add(this.areaText);

        // HP display (center-left)
        const hp = this.gameState.getHealth();
        const maxHp = this.gameState.getMaxHealth();
        this.hpText = this.scene.add.text(180, 4, `HP:${hp}/${maxHp}`, {
            fontSize: '12px',
            color: COLOR_STRINGS.WHITE,
            fontFamily: 'monospace',
        }).setScrollFactor(0);
        this.add(this.hpText);

        // Level (center)
        this.levelText = this.scene.add.text(340, 4, `Lv.${this.gameState.getLevel()}`, {
            fontSize: '12px',
            color: COLOR_STRINGS.WHITE,
            fontFamily: 'monospace',
        }).setScrollFactor(0);
        this.add(this.levelText);

        // Gold (right)
        this.goldText = this.scene.add.text(GAME_WIDTH - 8, 4, `${formatGold(this.gameState.getGold())}`, {
            fontSize: '12px',
            color: COLOR_STRINGS.GOLD,
            fontFamily: 'monospace',
        }).setOrigin(1, 0).setScrollFactor(0);
        this.add(this.goldText);

        // Notification text (center of screen)
        this.notificationText = this.scene.add.text(GAME_WIDTH / 2, 60, '', {
            fontSize: '16px',
            color: COLOR_STRINGS.WHITE,
            stroke: '#000000',
            strokeThickness: 3,
            fontFamily: 'monospace',
        }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
        this.add(this.notificationText);
    }

    /** Set up event listeners for HUD updates */
    private setupEventListeners(): void {
        const scene = this.scene;

        scene.events.on('player_damaged', () => this.refreshHP());
        scene.events.on('player_healed', () => this.refreshHP());
        scene.events.on('energy_changed', () => this.refreshHP());

        scene.events.on('gold_changed', (amount: number) => {
            this.goldText.setText(`${formatGold(amount)}`);
        });

        scene.events.on('area_changed', (areaName: string) => {
            this.areaText.setText(areaName);
            this.showAreaAnnouncement(areaName);
        });

        scene.events.on('show_notification', (message: string) => {
            this.showNotification(message);
        });

        scene.events.on('level_up', () => {
            this.levelText.setText(`Lv.${this.gameState.getLevel()}`);
            this.showNotification('레벨 업!');
        });
    }

    /** Refresh HP display */
    private refreshHP(): void {
        const hp = this.gameState.getHealth();
        const maxHp = this.gameState.getMaxHealth();
        this.hpText.setText(`HP:${hp}/${maxHp}`);

        // Color based on HP ratio
        const ratio = hp / maxHp;
        if (ratio <= 0.25) {
            this.hpText.setColor('#ff4444');
        } else if (ratio <= 0.5) {
            this.hpText.setColor('#ffaa44');
        } else {
            this.hpText.setColor(COLOR_STRINGS.WHITE);
        }
    }

    /** Show area name announcement in center */
    private showAreaAnnouncement(areaName: string): void {
        const bigText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, areaName, {
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            fontFamily: 'monospace',
        }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(DEPTH.UI + 5);

        this.scene.tweens.add({
            targets: bigText,
            alpha: 1,
            duration: 400,
            yoyo: true,
            hold: 1200,
            onComplete: () => bigText.destroy(),
        });
    }

    /** Show a notification message */
    public showNotification(message: string): void {
        this.notificationText.setText(message).setAlpha(1).setY(60);
        this.scene.tweens.add({
            targets: this.notificationText,
            alpha: 0,
            y: 40,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.notificationText.setY(60);
            },
        });
    }
}
