import { BaseScene } from './BaseScene';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, COLOR_STRINGS } from '../utils/Constants';
import { SaveSystem } from '../systems/SaveSystem';
import { Logger } from '../utils/Logger';

/**
 * Main menu scene with title, new game, continue, and settings options.
 */
export class MainMenuScene extends BaseScene {
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedIndex: number = 0;
    private titleText!: Phaser.GameObjects.Text;
    private subtitleText!: Phaser.GameObjects.Text;

    constructor() {
        super(SCENES.MAIN_MENU);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);

        // Title
        this.titleText = this.add.text(GAME_WIDTH / 2, 200, '삼한지몽', {
            fontSize: '64px',
            color: COLOR_STRINGS.WHITE,
            stroke: '#1a237e',
            strokeThickness: 6,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Subtitle
        this.subtitleText = this.add.text(GAME_WIDTH / 2, 270, '三韓之夢', {
            fontSize: '28px',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        // Menu items
        const menuOptions = ['새 게임', '이어하기', '설정'];
        const startY = 400;
        const spacing = 50;

        menuOptions.forEach((option, index) => {
            const text = this.add.text(GAME_WIDTH / 2, startY + index * spacing, option, {
                fontSize: '28px',
                color: index === 0 ? COLOR_STRINGS.GOLD : COLOR_STRINGS.WHITE,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            text.on('pointerover', () => this.selectItem(index));
            text.on('pointerdown', () => this.confirmSelection());

            this.menuItems.push(text);
        });

        // Version text
        this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 20, 'v1.0.0', {
            fontSize: '14px',
            color: '#666666',
        }).setOrigin(1);

        // Keyboard controls
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-UP', () => this.moveSelection(-1));
            this.input.keyboard.on('keydown-DOWN', () => this.moveSelection(1));
            this.input.keyboard.on('keydown-W', () => this.moveSelection(-1));
            this.input.keyboard.on('keydown-S', () => this.moveSelection(1));
            this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
            this.input.keyboard.on('keydown-SPACE', () => this.confirmSelection());
            this.input.keyboard.on('keydown-Z', () => this.confirmSelection());
        }

        this.fadeIn();
        Logger.info('MainMenuScene', 'Main menu displayed');
    }

    private moveSelection(direction: number): void {
        this.selectedIndex = (this.selectedIndex + direction + this.menuItems.length) % this.menuItems.length;
        this.updateMenuVisuals();
    }

    private selectItem(index: number): void {
        this.selectedIndex = index;
        this.updateMenuVisuals();
    }

    private updateMenuVisuals(): void {
        this.menuItems.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.setColor(COLOR_STRINGS.GOLD);
                item.setScale(1.1);
            } else {
                item.setColor(COLOR_STRINGS.WHITE);
                item.setScale(1.0);
            }
        });
    }

    private confirmSelection(): void {
        switch (this.selectedIndex) {
            case 0:
                this.startNewGame();
                break;
            case 1:
                this.continueGame();
                break;
            case 2:
                this.openSettings();
                break;
        }
    }

    private async startNewGame(): Promise<void> {
        Logger.info('MainMenuScene', 'Starting new game');
        this.gameState.reset();
        await this.transitionTo(SCENES.GAME, { worldScene: SCENES.HUB });
    }

    private async continueGame(): Promise<void> {
        // Try auto-save first, then slot 1
        if (SaveSystem.load(0)) {
            Logger.info('MainMenuScene', 'Loaded auto-save');
            const area = this.gameState.getCurrentArea();
            const sceneKey = this.getSceneKeyForArea(area);
            await this.transitionTo(SCENES.GAME, { worldScene: sceneKey });
        } else if (SaveSystem.load(1)) {
            Logger.info('MainMenuScene', 'Loaded save slot 1');
            const area = this.gameState.getCurrentArea();
            const sceneKey = this.getSceneKeyForArea(area);
            await this.transitionTo(SCENES.GAME, { worldScene: sceneKey });
        } else {
            this.showNotification('저장 데이터가 없습니다.');
        }
    }

    private openSettings(): void {
        this.showNotification('설정 (준비 중)');
    }

    private getSceneKeyForArea(area: string): string {
        const areaToScene: Record<string, string> = {
            hub: SCENES.HUB,
            songak: SCENES.SONGAK,
            wansanju: SCENES.WANSANJU,
            geumseong: SCENES.GEUMSEONG,
            cheolwon: SCENES.CHEOLWON,
            paegang: SCENES.PAEGANG,
            sangju: SCENES.SANGJU,
        };
        return areaToScene[area] || SCENES.HUB;
    }
}
