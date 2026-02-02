import Phaser from 'phaser';
import { HealthBar } from './HealthBar';
import { EnergyBar } from './EnergyBar';
import { MiniMap } from './MiniMap';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_STRINGS } from '../utils/Constants';
import { formatGold } from '../utils/Helpers';

/**
 * Heads-up display showing health, energy, gold, area name, and quest tracker.
 */
export class HUD extends Phaser.GameObjects.Container {
    private healthBar1: HealthBar;
    private energyBar1: EnergyBar;
    private healthBar2: HealthBar | null = null;
    private energyBar2: EnergyBar | null = null;
    private miniMap: MiniMap;

    private goldText: Phaser.GameObjects.Text;
    private areaText: Phaser.GameObjects.Text;
    private questText: Phaser.GameObjects.Text;
    private notificationText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        // P1 Health bar (top-left)
        this.healthBar1 = new HealthBar(scene, 20, 20, 200, 20, '대연무');
        this.add(this.healthBar1);

        // P1 Energy bar
        this.energyBar1 = new EnergyBar(scene, 20, 48, 150, 12);
        this.add(this.energyBar1);

        // Gold display (top-right)
        this.goldText = scene.add.text(GAME_WIDTH - 20, 20, '0 전', {
            fontSize: '18px',
            color: COLOR_STRINGS.GOLD,
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(1, 0).setScrollFactor(0);
        this.add(this.goldText);

        // Area name (top-center)
        this.areaText = scene.add.text(GAME_WIDTH / 2, 20, '', {
            fontSize: '16px',
            color: COLOR_STRINGS.WHITE,
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0).setScrollFactor(0);
        this.add(this.areaText);

        // Quest tracker (bottom-left)
        this.questText = scene.add.text(20, GAME_HEIGHT - 20, '', {
            fontSize: '14px',
            color: COLOR_STRINGS.WHITE,
            stroke: '#000000',
            strokeThickness: 1,
            wordWrap: { width: 300 },
        }).setOrigin(0, 1).setScrollFactor(0);
        this.add(this.questText);

        // Notification text (top-center, below area name)
        this.notificationText = scene.add.text(GAME_WIDTH / 2, 100, '', {
            fontSize: '20px',
            color: COLOR_STRINGS.GOLD,
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
        this.add(this.notificationText);

        // Mini-map (top-right corner, below gold)
        this.miniMap = new MiniMap(scene, GAME_WIDTH - 170, 45);
        this.add(this.miniMap);

        this.setScrollFactor(0);
        this.setDepth(100);

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        const scene = this.scene;

        scene.events.on('player_damaged', (data: { current: number; max: number }) => {
            this.healthBar1.updateValue(data.current, data.max);
        });

        scene.events.on('energy_changed', (data: { current: number; max: number }) => {
            this.energyBar1.update(data.current, data.max);
        });

        scene.events.on('player_healed', (data: { current: number; max: number }) => {
            this.healthBar1.updateValue(data.current, data.max);
        });

        scene.events.on('player2_damaged', (data: { current: number; max: number }) => {
            if (this.healthBar2) this.healthBar2.updateValue(data.current, data.max);
        });

        scene.events.on('player2_joined', () => this.addPlayer2HUD());
        scene.events.on('player2_left', () => this.removePlayer2HUD());

        scene.events.on('gold_changed', (amount: number) => {
            this.goldText.setText(formatGold(amount));
        });

        scene.events.on('area_changed', (areaName: string) => {
            this.areaText.setText(areaName);
            this.showAreaAnnouncement(areaName);
        });

        scene.events.on('quest_updated', (info: string) => {
            this.questText.setText(info);
        });

        scene.events.on('show_notification', (message: string) => {
            this.showNotification(message);
        });
    }

    /** Add player 2 HUD elements */
    private addPlayer2HUD(): void {
        if (this.healthBar2) return;
        this.healthBar2 = new HealthBar(this.scene, GAME_WIDTH - 220, 20, 200, 20, '소율');
        this.add(this.healthBar2);
        this.energyBar2 = new EnergyBar(this.scene, GAME_WIDTH - 170, 48, 150, 12);
        this.add(this.energyBar2);
    }

    /** Remove player 2 HUD elements */
    private removePlayer2HUD(): void {
        if (this.healthBar2) { this.healthBar2.destroy(); this.healthBar2 = null; }
        if (this.energyBar2) { this.energyBar2.destroy(); this.energyBar2 = null; }
    }

    /** Update mini-map with player position */
    public updateMiniMap(playerX: number, playerY: number): void {
        this.miniMap.updatePlayerPosition(playerX, playerY);
    }

    /** Show a large area name announcement */
    private showAreaAnnouncement(areaName: string): void {
        const bigText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, areaName, {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(200);

        this.scene.tweens.add({
            targets: bigText,
            alpha: 1,
            duration: 500,
            yoyo: true,
            hold: 1000,
            onComplete: () => bigText.destroy(),
        });
    }

    /** Show a notification message */
    public showNotification(message: string): void {
        this.notificationText.setText(message).setAlpha(1);
        this.scene.tweens.add({
            targets: this.notificationText,
            alpha: 0,
            y: 80,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.notificationText.setY(100);
            },
        });
    }
}
