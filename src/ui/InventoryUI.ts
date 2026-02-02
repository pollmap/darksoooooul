import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_STRINGS } from '../utils/Constants';
import { GameState } from '../state/GameState';
import { formatGold } from '../utils/Helpers';

/**
 * Inventory UI overlay showing items, equipment, and stats.
 */
export class InventoryUI extends Phaser.GameObjects.Container {
    private panel: Phaser.GameObjects.Graphics;
    private titleText: Phaser.GameObjects.Text;
    private goldText: Phaser.GameObjects.Text;
    private itemTexts: Phaser.GameObjects.Text[] = [];
    private statsText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        // Dark overlay
        const overlay = scene.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.add(overlay);

        // Panel
        this.panel = scene.add.graphics();
        this.panel.fillStyle(0x1a1a2e, 0.95);
        this.panel.fillRoundedRect(GAME_WIDTH / 2 - 300, 80, 600, 560, 12);
        this.panel.lineStyle(2, 0x4444aa);
        this.panel.strokeRoundedRect(GAME_WIDTH / 2 - 300, 80, 600, 560, 12);
        this.add(this.panel);

        // Title
        this.titleText = scene.add.text(GAME_WIDTH / 2, 110, '소지품', {
            fontSize: '28px',
            color: COLOR_STRINGS.WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add(this.titleText);

        // Gold
        this.goldText = scene.add.text(GAME_WIDTH / 2, 150, '', {
            fontSize: '20px',
            color: COLOR_STRINGS.GOLD,
        }).setOrigin(0.5);
        this.add(this.goldText);

        // Stats section
        this.statsText = scene.add.text(GAME_WIDTH / 2 - 270, 190, '', {
            fontSize: '14px',
            color: '#aaaaaa',
            lineSpacing: 4,
        });
        this.add(this.statsText);

        this.setVisible(false);
        this.setScrollFactor(0);
        this.setDepth(300);
    }

    /** Show the inventory */
    public show(): void {
        this.refresh();
        this.setVisible(true);
    }

    /** Hide the inventory */
    public hide(): void {
        this.setVisible(false);
    }

    /** Toggle visibility */
    public toggle(): void {
        if (this.visible) this.hide();
        else this.show();
    }

    /** Refresh inventory data */
    private refresh(): void {
        const gs = GameState.getInstance();

        this.goldText.setText(formatGold(gs.getGold()));

        // Stats
        const statsLines = [
            `레벨: ${gs.getLevel()}`,
            `체력: ${gs.getHealth()} / ${gs.getMaxHealth()}`,
            `공격력: 10 | 방어력: 5`,
            ``,
            `== 능력 ==`,
            `이중 점프: ${gs.hasAbility('doubleJump') ? '해금' : '미해금'}`,
            `벽 등반: ${gs.hasAbility('wallClimb') ? '해금' : '미해금'}`,
            `대시 강화: ${gs.hasAbility('dashEnhanced') ? '해금' : '미해금'}`,
            `해류 타기: ${gs.hasAbility('waterFlow') ? '해금' : '미해금'}`,
            `독 면역: ${gs.hasAbility('poisonImmune') ? '해금' : '미해금'}`,
            `활강: ${gs.hasAbility('glide') ? '해금' : '미해금'}`,
        ];
        this.statsText.setText(statsLines.join('\n'));

        // Clear old item texts
        this.itemTexts.forEach(t => t.destroy());
        this.itemTexts = [];

        // Items
        const items = gs.getInventoryItems();
        const startY = 420;
        if (items.length === 0) {
            const emptyText = this.scene.add.text(GAME_WIDTH / 2, startY, '소지품이 없습니다.', {
                fontSize: '16px',
                color: '#666666',
            }).setOrigin(0.5);
            this.add(emptyText);
            this.itemTexts.push(emptyText);
        } else {
            items.forEach((item, index) => {
                const itemText = this.scene.add.text(
                    GAME_WIDTH / 2 - 250,
                    startY + index * 24,
                    `${item.item} x${item.count}`,
                    { fontSize: '15px', color: COLOR_STRINGS.WHITE }
                );
                this.add(itemText);
                this.itemTexts.push(itemText);
            });
        }
    }
}
