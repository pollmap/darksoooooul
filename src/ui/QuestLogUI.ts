import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_STRINGS } from '../utils/Constants';
import { GameState } from '../state/GameState';

/**
 * Quest log UI showing active and completed quests.
 */
export class QuestLogUI extends Phaser.GameObjects.Container {
    private questTexts: Phaser.GameObjects.Text[] = [];

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        // Overlay
        const overlay = scene.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.add(overlay);

        // Panel
        const panel = scene.add.graphics();
        panel.fillStyle(0x1a1a2e, 0.95);
        panel.fillRoundedRect(GAME_WIDTH / 2 - 350, 60, 700, 600, 12);
        panel.lineStyle(2, 0x4444aa);
        panel.strokeRoundedRect(GAME_WIDTH / 2 - 350, 60, 700, 600, 12);
        this.add(panel);

        const title = scene.add.text(GAME_WIDTH / 2, 90, '의뢰 목록', {
            fontSize: '28px',
            color: COLOR_STRINGS.WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add(title);

        this.setVisible(false);
        this.setScrollFactor(0);
        this.setDepth(300);
    }

    public show(): void {
        this.refresh();
        this.setVisible(true);
    }

    public hide(): void {
        this.setVisible(false);
    }

    public toggle(): void {
        if (this.visible) this.hide();
        else this.show();
    }

    private refresh(): void {
        this.questTexts.forEach(t => t.destroy());
        this.questTexts = [];

        const placeholder = this.scene.add.text(GAME_WIDTH / 2, 350, '진행 중인 의뢰가 없습니다.', {
            fontSize: '18px',
            color: '#666666',
        }).setOrigin(0.5);
        this.add(placeholder);
        this.questTexts.push(placeholder);
    }
}
