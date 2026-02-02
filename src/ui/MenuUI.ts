import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_STRINGS } from '../utils/Constants';
import { SaveSystem } from '../systems/SaveSystem';
import { Logger } from '../utils/Logger';

/**
 * Pause/settings menu UI.
 */
export class MenuUI extends Phaser.GameObjects.Container {
    private overlay: Phaser.GameObjects.Graphics;
    private panel: Phaser.GameObjects.Graphics;
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedIndex: number = 0;
    private titleText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.overlay = scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.7);
        this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.add(this.overlay);

        this.panel = scene.add.graphics();
        this.panel.fillStyle(0x1a1a2e, 0.95);
        this.panel.fillRoundedRect(GAME_WIDTH / 2 - 200, 150, 400, 420, 12);
        this.panel.lineStyle(2, 0x4444aa);
        this.panel.strokeRoundedRect(GAME_WIDTH / 2 - 200, 150, 400, 420, 12);
        this.add(this.panel);

        this.titleText = scene.add.text(GAME_WIDTH / 2, 185, '일시 정지', {
            fontSize: '32px',
            color: COLOR_STRINGS.WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add(this.titleText);

        const options = ['게임 계속', '저장하기', '불러오기', '설정', '메인 메뉴로'];
        const startY = 260;
        options.forEach((opt, i) => {
            const text = scene.add.text(GAME_WIDTH / 2, startY + i * 50, opt, {
                fontSize: '22px',
                color: i === 0 ? COLOR_STRINGS.GOLD : COLOR_STRINGS.WHITE,
            }).setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => this.selectItem(i))
                .on('pointerdown', () => this.confirmSelection());
            this.add(text);
            this.menuItems.push(text);
        });

        this.setVisible(false);
        this.setScrollFactor(0);
        this.setDepth(400);
    }

    public show(): void {
        this.selectedIndex = 0;
        this.updateVisuals();
        this.setVisible(true);
    }

    public hide(): void {
        this.setVisible(false);
    }

    public toggle(): void {
        if (this.visible) this.hide();
        else this.show();
    }

    public moveSelection(dir: number): void {
        this.selectedIndex = (this.selectedIndex + dir + this.menuItems.length) % this.menuItems.length;
        this.updateVisuals();
    }

    public confirmSelection(): void {
        switch (this.selectedIndex) {
            case 0: // Continue
                this.hide();
                this.scene.events.emit('resume_game');
                break;
            case 1: // Save
                if (SaveSystem.save(1)) {
                    this.scene.events.emit('show_notification', '저장 완료!');
                }
                break;
            case 2: // Load
                if (SaveSystem.load(1)) {
                    this.scene.events.emit('show_notification', '불러오기 완료!');
                    this.hide();
                }
                break;
            case 3: // Settings
                this.scene.events.emit('show_notification', '설정 (준비 중)');
                break;
            case 4: // Main menu
                this.hide();
                this.scene.events.emit('return_to_menu');
                break;
        }
    }

    private selectItem(index: number): void {
        this.selectedIndex = index;
        this.updateVisuals();
    }

    private updateVisuals(): void {
        this.menuItems.forEach((item, i) => {
            item.setColor(i === this.selectedIndex ? COLOR_STRINGS.GOLD : COLOR_STRINGS.WHITE);
            item.setScale(i === this.selectedIndex ? 1.1 : 1.0);
        });
    }
}
