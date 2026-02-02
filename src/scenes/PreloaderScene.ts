import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/**
 * Preloader scene - loads all game assets and shows loading progress.
 */
export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super(SCENES.PRELOADER);
    }

    preload(): void {
        Logger.info('PreloaderScene', 'Loading assets...');

        // Create loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 25, 320, 50);

        const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '로딩 중...', {
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        const percentText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '0%', {
            fontSize: '18px',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.load.on('progress', (value: number) => {
            percentText.setText(`${Math.round(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(COLORS.GOLD, 1);
            progressBar.fillRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // Generate placeholder textures programmatically
        this.createPlaceholderTextures();
    }

    create(): void {
        Logger.info('PreloaderScene', 'All assets loaded');
        this.scene.start(SCENES.MAIN_MENU);
    }

    /** Create placeholder textures for development */
    private createPlaceholderTextures(): void {
        // Player 1 placeholder (dark silhouette with blue accent)
        this.createColoredRect('daeyeonmu-idle', 64, 64, 0x1a1a2e, 0x1a237e);
        this.createColoredRect('daeyeonmu-run', 64, 64, 0x1a1a2e, 0x1a237e);
        this.createColoredRect('daeyeonmu-attack', 64, 64, 0x1a1a2e, 0x4444ff);
        this.createColoredRect('daeyeonmu-jump', 64, 64, 0x1a1a2e, 0x1a237e);
        this.createColoredRect('daeyeonmu-hurt', 64, 64, 0xff4444, 0x1a237e);
        this.createColoredRect('daeyeonmu-dodge', 64, 64, 0x1a1a2e, 0x6666ff);
        this.createColoredRect('daeyeonmu-fall', 64, 64, 0x1a1a2e, 0x1a237e);

        // Player 2 placeholder (dark silhouette with teal accent)
        this.createColoredRect('soyul-idle', 56, 56, 0x1a1a2e, 0x00897b);
        this.createColoredRect('soyul-run', 56, 56, 0x1a1a2e, 0x00897b);
        this.createColoredRect('soyul-attack', 56, 56, 0x1a1a2e, 0x44ffcc);
        this.createColoredRect('soyul-jump', 56, 56, 0x1a1a2e, 0x00897b);
        this.createColoredRect('soyul-hurt', 56, 56, 0xff4444, 0x00897b);
        this.createColoredRect('soyul-dodge', 56, 56, 0x1a1a2e, 0x66ffcc);

        // Enemy placeholders
        this.createColoredRect('enemy_bandit', 48, 48, 0x8b4513, 0xff0000);
        this.createColoredRect('enemy_soldier_taebong', 48, 48, 0x4a148c, 0xff0000);
        this.createColoredRect('enemy_soldier_hubaekje', 48, 48, 0xb71c1c, 0xff0000);
        this.createColoredRect('enemy_fanatic', 48, 48, 0x4a148c, 0xffff00);
        this.createColoredRect('enemy_ghost', 48, 48, 0x666666, 0xaaaaff);
        this.createColoredRect('enemy_pirate', 48, 48, 0x333333, 0xff6600);

        // Boss placeholders (larger)
        this.createColoredRect('boss_heukrang', 96, 96, 0x222222, 0x0066ff);
        this.createColoredRect('boss_cheolkwon', 96, 96, 0x8b4513, 0xff4400);
        this.createColoredRect('boss_janwol', 96, 96, 0xcccccc, 0xaaaaff);
        this.createColoredRect('boss_jeok_myeong', 96, 96, 0xff0000, 0xffff00);
        this.createColoredRect('boss_bukpung', 96, 96, 0x444488, 0x88bbff);
        this.createColoredRect('boss_sasin', 96, 96, 0x333333, 0xff0000);
        this.createColoredRect('boss_gungye', 128, 128, 0x4a148c, 0xffd700);

        // NPC placeholders
        this.createColoredRect('npc_default', 48, 64, 0x666666, 0xffffff);
        this.createColoredRect('npc_innkeeper', 48, 64, 0x8b4513, 0xffd700);
        this.createColoredRect('npc_merchant', 48, 64, 0x006600, 0xffd700);
        this.createColoredRect('npc_fortune_teller', 48, 64, 0x4a148c, 0xff00ff);

        // UI placeholders
        this.createColoredRect('ui_dialogue_box', 32, 32, 0x222222);
        this.createColoredRect('ui_name_box', 32, 32, 0x333333);

        // Effect placeholders
        this.createColoredRect('hit_particle', 8, 8, 0xffffff);
        this.createColoredRect('parry_effect', 32, 32, 0xffff00);
        this.createColoredRect('perfect_parry_effect', 48, 48, 0xffffff);

        // Item placeholders
        this.createColoredRect('item_default', 24, 24, 0xffd700);

        // Tileset placeholder
        this.createColoredRect('tiles_placeholder', 32, 32, 0x556655);
    }

    /** Create a simple colored rectangle texture */
    private createColoredRect(key: string, width: number, height: number, fillColor: number, accentColor?: number): void {
        const graphics = this.add.graphics();
        graphics.fillStyle(fillColor, 1);
        graphics.fillRect(0, 0, width, height);

        if (accentColor) {
            graphics.fillStyle(accentColor, 1);
            // Small accent mark (eyes or highlight)
            const eyeSize = Math.max(2, Math.floor(width / 10));
            graphics.fillRect(width * 0.35, height * 0.3, eyeSize, eyeSize);
            graphics.fillRect(width * 0.55, height * 0.3, eyeSize, eyeSize);
        }

        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }
}
