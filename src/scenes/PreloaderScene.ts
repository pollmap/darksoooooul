import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/**
 * Preloader scene - loads all game assets and shows loading progress.
 * Generates pixel-art style placeholder textures programmatically.
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

        this.createPlaceholderTextures();
    }

    create(): void {
        Logger.info('PreloaderScene', 'All assets loaded');
        this.scene.start(SCENES.MAIN_MENU);
    }

    /** Create all placeholder textures for development */
    private createPlaceholderTextures(): void {
        this.createPlayerTexture();
        this.createPlayer2Texture();
        this.createNPCTextures();
        this.createEnemyTextures();
        this.createBossTextures();
        this.createEnvironmentTextures();
        this.createEffectTextures();
        this.createItemTextures();
    }

    /** Create player 1 (대연무) pixel art character */
    private createPlayerTexture(): void {
        const g = this.add.graphics();
        const w = 32;
        const h = 48;

        // Body - dark blue hanbok
        g.fillStyle(0x2233aa, 1);
        g.fillRect(8, 16, 16, 20);

        // Head
        g.fillStyle(0xddbb88, 1);
        g.fillRect(10, 4, 12, 12);

        // Hair (black topknot - 상투)
        g.fillStyle(0x222222, 1);
        g.fillRect(10, 2, 12, 6);
        g.fillRect(13, 0, 6, 4);

        // Eyes
        g.fillStyle(0x111111, 1);
        g.fillRect(13, 8, 2, 2);
        g.fillRect(18, 8, 2, 2);

        // Belt (gold sash)
        g.fillStyle(0xddaa33, 1);
        g.fillRect(8, 28, 16, 3);

        // Pants
        g.fillStyle(0x1a1a44, 1);
        g.fillRect(8, 31, 7, 12);
        g.fillRect(17, 31, 7, 12);

        // Boots
        g.fillStyle(0x443322, 1);
        g.fillRect(8, 41, 7, 5);
        g.fillRect(17, 41, 7, 5);

        // Arms
        g.fillStyle(0x2233aa, 1);
        g.fillRect(4, 18, 4, 12);
        g.fillRect(24, 18, 4, 12);

        // Hands
        g.fillStyle(0xddbb88, 1);
        g.fillRect(4, 28, 4, 4);
        g.fillRect(24, 28, 4, 4);

        // Sword on back (thin line)
        g.fillStyle(0x888899, 1);
        g.fillRect(25, 6, 2, 22);
        g.fillStyle(0xddaa33, 1);
        g.fillRect(25, 26, 2, 4);

        g.generateTexture('player1', w, h);
        g.destroy();
    }

    /** Create player 2 (소율) pixel art character */
    private createPlayer2Texture(): void {
        const g = this.add.graphics();
        const w = 28;
        const h = 44;

        // Body - teal hanbok
        g.fillStyle(0x008877, 1);
        g.fillRect(6, 14, 16, 18);

        // Head
        g.fillStyle(0xddbb88, 1);
        g.fillRect(8, 3, 12, 11);

        // Hair (long, flowing)
        g.fillStyle(0x332211, 1);
        g.fillRect(7, 1, 14, 7);
        g.fillRect(6, 6, 4, 12);
        g.fillRect(18, 6, 4, 12);

        // Eyes
        g.fillStyle(0x111111, 1);
        g.fillRect(11, 7, 2, 2);
        g.fillRect(16, 7, 2, 2);

        // Belt
        g.fillStyle(0xcc6688, 1);
        g.fillRect(6, 26, 16, 3);

        // Pants
        g.fillStyle(0x005544, 1);
        g.fillRect(6, 29, 7, 10);
        g.fillRect(15, 29, 7, 10);

        // Boots
        g.fillStyle(0x443322, 1);
        g.fillRect(6, 37, 7, 5);
        g.fillRect(15, 37, 7, 5);

        // Arms
        g.fillStyle(0x008877, 1);
        g.fillRect(2, 16, 4, 10);
        g.fillRect(22, 16, 4, 10);

        // Daggers at waist
        g.fillStyle(0x999999, 1);
        g.fillRect(3, 24, 2, 6);
        g.fillRect(23, 24, 2, 6);

        g.generateTexture('player2', w, h);
        g.destroy();
    }

    /** Create NPC pixel art textures */
    private createNPCTextures(): void {
        // Innkeeper - warm brown, rounder
        this.createNPCSprite('npc_innkeeper', 0x885533, 0xffaa44, 0xddbb88, true);
        // Merchant - green with gold accents
        this.createNPCSprite('npc_merchant', 0x336633, 0xddaa33, 0xddbb88, false);
        // Fortune teller - purple mystical
        this.createNPCSprite('npc_fortune_teller', 0x553388, 0xdd44ff, 0xccbb99, false);
        // Weaponsmith - dark, muscular
        this.createNPCSprite('npc_weaponsmith', 0x444444, 0xff6633, 0xcc9977, true);
        // Quest board
        this.createQuestBoardTexture();
        // Default NPC
        this.createNPCSprite('npc_default', 0x666655, 0xaaaaaa, 0xddbb88, false);
    }

    /** Create a single NPC sprite */
    private createNPCSprite(key: string, bodyColor: number, accentColor: number, skinColor: number, isWide: boolean): void {
        const g = this.add.graphics();
        const w = isWide ? 36 : 32;
        const h = 48;
        const cx = w / 2;

        // Body
        g.fillStyle(bodyColor, 1);
        g.fillRect(cx - 8, 16, 16, 20);

        // Head
        g.fillStyle(skinColor, 1);
        g.fillRect(cx - 6, 4, 12, 12);

        // Hair/hat
        g.fillStyle(0x333333, 1);
        g.fillRect(cx - 7, 2, 14, 6);

        // Eyes
        g.fillStyle(0x111111, 1);
        g.fillRect(cx - 3, 8, 2, 2);
        g.fillRect(cx + 2, 8, 2, 2);

        // Accent (belt/scarf)
        g.fillStyle(accentColor, 1);
        g.fillRect(cx - 8, 28, 16, 3);

        // Legs
        g.fillStyle(bodyColor, 0.8);
        g.fillRect(cx - 7, 31, 6, 12);
        g.fillRect(cx + 1, 31, 6, 12);

        // Feet
        g.fillStyle(0x443322, 1);
        g.fillRect(cx - 7, 41, 6, 5);
        g.fillRect(cx + 1, 41, 6, 5);

        g.generateTexture(key, w, h);
        g.destroy();
    }

    /** Create quest board texture */
    private createQuestBoardTexture(): void {
        const g = this.add.graphics();
        // Wooden board
        g.fillStyle(0x664422, 1);
        g.fillRect(4, 4, 24, 36);
        // Posts
        g.fillStyle(0x553311, 1);
        g.fillRect(2, 0, 4, 44);
        g.fillRect(26, 0, 4, 44);
        // Papers
        g.fillStyle(0xeeddcc, 1);
        g.fillRect(8, 8, 8, 10);
        g.fillRect(18, 8, 8, 10);
        g.fillRect(10, 22, 10, 10);
        // Text lines on papers
        g.fillStyle(0x333333, 1);
        g.fillRect(9, 10, 6, 1);
        g.fillRect(9, 13, 5, 1);
        g.fillRect(19, 10, 6, 1);
        g.fillRect(19, 13, 5, 1);
        g.generateTexture('npc_quest_board', 32, 44);
        g.destroy();
    }

    /** Create enemy textures */
    private createEnemyTextures(): void {
        // Bandit
        this.createEnemySprite('enemy_bandit', 0x774422, 0xaa6633, 40, 44);
        // Taebong soldier
        this.createEnemySprite('enemy_soldier_taebong', 0x442288, 0x6633aa, 40, 48);
        // Hubaekje soldier
        this.createEnemySprite('enemy_soldier_hubaekje', 0x882222, 0xaa3333, 40, 48);
        // Fanatic
        this.createEnemySprite('enemy_fanatic', 0x442266, 0xffdd00, 40, 48);
        // Ghost
        this.createGhostTexture();
        // Pirate
        this.createEnemySprite('enemy_pirate', 0x333333, 0xff6600, 40, 44);
    }

    /** Create a single enemy sprite */
    private createEnemySprite(key: string, bodyColor: number, accentColor: number, w: number, h: number): void {
        const g = this.add.graphics();
        const cx = w / 2;

        // Body
        g.fillStyle(bodyColor, 1);
        g.fillRect(cx - 9, 14, 18, 20);

        // Head
        g.fillStyle(0xcc9966, 1);
        g.fillRect(cx - 6, 2, 12, 12);

        // Helmet/hat
        g.fillStyle(accentColor, 1);
        g.fillRect(cx - 7, 0, 14, 6);

        // Red eyes
        g.fillStyle(0xff2222, 1);
        g.fillRect(cx - 3, 7, 2, 2);
        g.fillRect(cx + 2, 7, 2, 2);

        // Weapon (sword/spear)
        g.fillStyle(0x999999, 1);
        g.fillRect(cx + 10, 8, 2, 20);
        g.fillStyle(accentColor, 1);
        g.fillRect(cx + 9, 6, 4, 4);

        // Legs
        g.fillStyle(bodyColor, 0.8);
        g.fillRect(cx - 8, 34, 7, 10);
        g.fillRect(cx + 1, 34, 7, 10);

        g.generateTexture(key, w, h);
        g.destroy();
    }

    /** Create ghost enemy texture */
    private createGhostTexture(): void {
        const g = this.add.graphics();

        // Translucent body
        g.fillStyle(0x8888cc, 0.7);
        g.fillRect(8, 4, 24, 32);

        // Wavy bottom
        g.fillStyle(0x8888cc, 0.5);
        g.fillRect(8, 32, 6, 8);
        g.fillRect(16, 36, 6, 6);
        g.fillRect(26, 32, 6, 8);

        // Glowing eyes
        g.fillStyle(0xffffff, 1);
        g.fillRect(14, 12, 4, 4);
        g.fillRect(22, 12, 4, 4);
        g.fillStyle(0x4444ff, 1);
        g.fillRect(15, 13, 2, 2);
        g.fillRect(23, 13, 2, 2);

        // Mouth
        g.fillStyle(0x222244, 1);
        g.fillRect(16, 22, 8, 4);

        g.generateTexture('enemy_ghost', 40, 44);
        g.destroy();
    }

    /** Create boss textures */
    private createBossTextures(): void {
        // Heukrang (흑랑) - dark wolf warrior
        this.createBossSprite('boss_heukrang', 0x222244, 0x4488ff, 64, 72);
        // Cheolkwon (철권) - iron fist
        this.createBossSprite('boss_cheolkwon', 0x664422, 0xff6622, 72, 80);
        // Janwol (잔월) - pale moon
        this.createBossSprite('boss_janwol', 0x888899, 0xccccff, 64, 72);
        // Jeok Myeong (적명)
        this.createBossSprite('boss_jeok_myeong', 0x882222, 0xffdd00, 72, 80);
        // Bukpung (북풍) - north wind
        this.createBossSprite('boss_bukpung', 0x334466, 0x88ccff, 64, 72);
        // Sasin (사신) - death god
        this.createBossSprite('boss_sasin', 0x111111, 0xff0000, 72, 80);
        // Gungye (궁예) - final boss
        this.createGungyeTexture();
    }

    /** Create a boss sprite */
    private createBossSprite(key: string, bodyColor: number, accentColor: number, w: number, h: number): void {
        const g = this.add.graphics();
        const cx = w / 2;

        // Large body
        g.fillStyle(bodyColor, 1);
        g.fillRect(cx - 16, 20, 32, 32);

        // Head
        g.fillStyle(0xcc9966, 1);
        g.fillRect(cx - 10, 4, 20, 16);

        // Crown/helmet
        g.fillStyle(accentColor, 1);
        g.fillRect(cx - 12, 0, 24, 8);
        g.fillRect(cx - 4, -4, 8, 6);

        // Eyes (menacing)
        g.fillStyle(accentColor, 1);
        g.fillRect(cx - 6, 10, 4, 3);
        g.fillRect(cx + 3, 10, 4, 3);

        // Armor accent
        g.fillStyle(accentColor, 0.8);
        g.fillRect(cx - 18, 22, 4, 28);
        g.fillRect(cx + 14, 22, 4, 28);

        // Legs
        g.fillStyle(bodyColor, 0.8);
        g.fillRect(cx - 14, 52, 12, 16);
        g.fillRect(cx + 2, 52, 12, 16);

        // Cape
        g.fillStyle(accentColor, 0.4);
        g.fillRect(cx - 20, 16, 6, 40);
        g.fillRect(cx + 14, 16, 6, 40);

        g.generateTexture(key, w, h);
        g.destroy();
    }

    /** Create Gungye (궁예) final boss texture */
    private createGungyeTexture(): void {
        const g = this.add.graphics();
        const w = 80;
        const h = 96;
        const cx = w / 2;

        // Flowing royal robe - purple
        g.fillStyle(0x4a148c, 1);
        g.fillRect(cx - 20, 28, 40, 44);

        // Head
        g.fillStyle(0xccaa88, 1);
        g.fillRect(cx - 12, 8, 24, 20);

        // Crown (elaborate)
        g.fillStyle(0xffd700, 1);
        g.fillRect(cx - 14, 2, 28, 10);
        g.fillRect(cx - 6, -4, 4, 8);
        g.fillRect(cx + 2, -4, 4, 8);
        g.fillRect(cx - 2, -6, 4, 8);

        // Third eye (관심법)
        g.fillStyle(0xff0000, 1);
        g.fillRect(cx - 2, 11, 4, 4);

        // Normal eyes
        g.fillStyle(0xffd700, 1);
        g.fillRect(cx - 8, 16, 4, 3);
        g.fillRect(cx + 4, 16, 4, 3);

        // Gold trim
        g.fillStyle(0xffd700, 1);
        g.fillRect(cx - 22, 30, 44, 3);
        g.fillRect(cx - 22, 50, 44, 3);

        // Arms (wide sleeves)
        g.fillStyle(0x4a148c, 1);
        g.fillRect(cx - 30, 32, 12, 24);
        g.fillRect(cx + 18, 32, 12, 24);

        // Legs
        g.fillStyle(0x330066, 1);
        g.fillRect(cx - 16, 72, 14, 20);
        g.fillRect(cx + 2, 72, 14, 20);

        // Aura effect
        g.fillStyle(0xffd700, 0.2);
        g.fillRect(cx - 36, 0, 72, 92);

        g.generateTexture('boss_gungye', w, h);
        g.destroy();
    }

    /** Create environment/platform textures */
    private createEnvironmentTextures(): void {
        // Ground tile with grass
        this.createGroundTile('tile_ground', 0x554433, 0x446633);
        // Stone platform
        this.createStonePlatform('tile_stone', 0x666666, 0x555555);
        // Wood platform
        this.createWoodPlatform('tile_wood', 0x775533, 0x664422);
        // Background layers
        this.createSkyTexture();
        this.createMountainTexture();
        this.createBuildingTextures();
        // Lantern
        this.createLanternTexture();
        // Tree
        this.createTreeTexture();
    }

    /** Create ground tile with grass on top */
    private createGroundTile(key: string, dirtColor: number, grassColor: number): void {
        const g = this.add.graphics();
        // Dirt
        g.fillStyle(dirtColor, 1);
        g.fillRect(0, 4, 32, 28);
        // Grass top
        g.fillStyle(grassColor, 1);
        g.fillRect(0, 0, 32, 6);
        // Grass tufts
        g.fillStyle(0x558844, 1);
        g.fillRect(2, -2, 2, 4);
        g.fillRect(10, -2, 2, 3);
        g.fillRect(20, -3, 2, 5);
        g.fillRect(28, -2, 2, 4);
        // Dirt variation
        g.fillStyle(0x665544, 1);
        g.fillRect(5, 12, 4, 4);
        g.fillRect(18, 18, 6, 4);
        g.fillRect(8, 24, 4, 4);
        g.generateTexture(key, 32, 32);
        g.destroy();
    }

    /** Create stone platform tile */
    private createStonePlatform(key: string, mainColor: number, darkColor: number): void {
        const g = this.add.graphics();
        g.fillStyle(mainColor, 1);
        g.fillRect(0, 0, 32, 20);
        // Stone cracks/lines
        g.fillStyle(darkColor, 1);
        g.fillRect(0, 0, 32, 2);
        g.fillRect(8, 4, 1, 8);
        g.fillRect(20, 6, 1, 10);
        g.fillRect(0, 18, 32, 2);
        // Highlight on top
        g.fillStyle(0x888888, 1);
        g.fillRect(0, 2, 32, 1);
        g.generateTexture(key, 32, 20);
        g.destroy();
    }

    /** Create wood platform tile */
    private createWoodPlatform(key: string, mainColor: number, darkColor: number): void {
        const g = this.add.graphics();
        g.fillStyle(mainColor, 1);
        g.fillRect(0, 0, 32, 20);
        // Wood grain lines
        g.fillStyle(darkColor, 1);
        g.fillRect(0, 4, 32, 1);
        g.fillRect(0, 10, 32, 1);
        g.fillRect(0, 16, 32, 1);
        // Plank edges
        g.fillRect(7, 0, 1, 20);
        g.fillRect(15, 0, 1, 20);
        g.fillRect(24, 0, 1, 20);
        // Top highlight
        g.fillStyle(0x886644, 1);
        g.fillRect(0, 0, 32, 2);
        g.generateTexture(key, 32, 20);
        g.destroy();
    }

    /** Create sky gradient texture */
    private createSkyTexture(): void {
        const g = this.add.graphics();
        const w = 1;
        const h = 400;
        // Gradient from dark blue (top) to purple
        for (let y = 0; y < h; y++) {
            const t = y / h;
            const r = Math.floor(20 + t * 25);
            const gv = Math.floor(15 + t * 20);
            const b = Math.floor(60 + t * 20);
            const color = (r << 16) | (gv << 8) | b;
            g.fillStyle(color, 1);
            g.fillRect(0, y, w, 1);
        }
        g.generateTexture('bg_sky', w, h);
        g.destroy();
    }

    /** Create mountain silhouette */
    private createMountainTexture(): void {
        const g = this.add.graphics();
        const w = 320;
        const h = 200;

        // Far mountains (darker)
        g.fillStyle(0x1a1a30, 1);
        // Mountain 1
        const peaks = [
            { x: 0, peakY: 60 },
            { x: 80, peakY: 20 },
            { x: 160, peakY: 40 },
            { x: 240, peakY: 10 },
            { x: 320, peakY: 50 },
        ];
        for (let x = 0; x < w; x++) {
            // Interpolate between peaks
            let pIdx = 0;
            for (let i = 0; i < peaks.length - 1; i++) {
                if (x >= peaks[i].x && x < peaks[i + 1].x) {
                    pIdx = i;
                    break;
                }
            }
            const p0 = peaks[pIdx];
            const p1 = peaks[Math.min(pIdx + 1, peaks.length - 1)];
            const t = p1.x > p0.x ? (x - p0.x) / (p1.x - p0.x) : 0;
            const peakY = p0.peakY + (p1.peakY - p0.peakY) * t;
            const colH = h - peakY;
            g.fillRect(x, peakY, 1, colH);
        }

        // Near mountains (slightly lighter)
        g.fillStyle(0x252540, 1);
        const nearPeaks = [
            { x: 0, peakY: 100 },
            { x: 60, peakY: 70 },
            { x: 120, peakY: 90 },
            { x: 200, peakY: 60 },
            { x: 280, peakY: 80 },
            { x: 320, peakY: 100 },
        ];
        for (let x = 0; x < w; x++) {
            let pIdx = 0;
            for (let i = 0; i < nearPeaks.length - 1; i++) {
                if (x >= nearPeaks[i].x && x < nearPeaks[i + 1].x) {
                    pIdx = i;
                    break;
                }
            }
            const p0 = nearPeaks[pIdx];
            const p1 = nearPeaks[Math.min(pIdx + 1, nearPeaks.length - 1)];
            const t = p1.x > p0.x ? (x - p0.x) / (p1.x - p0.x) : 0;
            const peakY = p0.peakY + (p1.peakY - p0.peakY) * t;
            const colH = h - peakY;
            g.fillRect(x, peakY, 1, colH);
        }

        g.generateTexture('bg_mountains', w, h);
        g.destroy();
    }

    /** Create building background textures */
    private createBuildingTextures(): void {
        // Korean traditional building silhouette
        const g = this.add.graphics();
        const w = 120;
        const h = 100;

        // Roof (curved Korean-style)
        g.fillStyle(0x333344, 1);
        g.fillRect(5, 20, 110, 10);
        g.fillRect(0, 15, 120, 8);
        // Curved ends
        g.fillRect(0, 10, 20, 8);
        g.fillRect(100, 10, 20, 8);
        g.fillRect(2, 8, 10, 6);
        g.fillRect(108, 8, 10, 6);

        // Walls
        g.fillStyle(0x2a2a3a, 1);
        g.fillRect(15, 30, 90, 60);

        // Door
        g.fillStyle(0x3a3a4a, 1);
        g.fillRect(45, 50, 30, 40);

        // Windows
        g.fillStyle(0xffaa44, 0.4);
        g.fillRect(22, 40, 16, 16);
        g.fillRect(82, 40, 16, 16);

        // Window frames
        g.fillStyle(0x333344, 1);
        g.fillRect(22, 47, 16, 1);
        g.fillRect(29, 40, 1, 16);
        g.fillRect(82, 47, 16, 1);
        g.fillRect(89, 40, 1, 16);

        g.generateTexture('bg_building', w, h);
        g.destroy();
    }

    /** Create hanging lantern */
    private createLanternTexture(): void {
        const g = this.add.graphics();
        // String
        g.fillStyle(0x444444, 1);
        g.fillRect(7, 0, 2, 6);
        // Lantern body
        g.fillStyle(0xff6633, 0.9);
        g.fillRect(2, 6, 12, 16);
        // Frame
        g.fillStyle(0x664422, 1);
        g.fillRect(1, 5, 14, 2);
        g.fillRect(1, 20, 14, 2);
        g.fillRect(1, 5, 2, 17);
        g.fillRect(13, 5, 2, 17);
        // Glow effect
        g.fillStyle(0xffaa44, 0.3);
        g.fillRect(0, 4, 16, 20);
        // Tassel
        g.fillStyle(0xff4422, 1);
        g.fillRect(6, 22, 4, 6);
        g.generateTexture('lantern', 16, 28);
        g.destroy();
    }

    /** Create a simple tree */
    private createTreeTexture(): void {
        const g = this.add.graphics();
        // Trunk
        g.fillStyle(0x554422, 1);
        g.fillRect(20, 40, 12, 40);
        // Canopy layers
        g.fillStyle(0x2a5533, 1);
        g.fillRect(6, 10, 40, 20);
        g.fillStyle(0x336644, 1);
        g.fillRect(10, 0, 32, 18);
        g.fillStyle(0x2a5533, 1);
        g.fillRect(2, 20, 48, 16);
        g.fillStyle(0x224422, 1);
        g.fillRect(8, 30, 36, 12);
        g.generateTexture('tree', 52, 80);
        g.destroy();
    }

    /** Create effect textures */
    private createEffectTextures(): void {
        // Hit particle
        const g1 = this.add.graphics();
        g1.fillStyle(0xffffff, 1);
        g1.fillRect(1, 1, 6, 6);
        g1.fillStyle(0xffff88, 1);
        g1.fillRect(2, 2, 4, 4);
        g1.generateTexture('hit_particle', 8, 8);
        g1.destroy();

        // Parry spark
        const g2 = this.add.graphics();
        g2.fillStyle(0xffff44, 1);
        g2.fillRect(12, 0, 8, 32);
        g2.fillRect(0, 12, 32, 8);
        g2.fillStyle(0xffffff, 1);
        g2.fillRect(14, 2, 4, 28);
        g2.fillRect(2, 14, 28, 4);
        g2.generateTexture('parry_effect', 32, 32);
        g2.destroy();

        // Perfect parry (bigger)
        const g3 = this.add.graphics();
        g3.fillStyle(0xffffff, 0.8);
        g3.fillRect(20, 0, 8, 48);
        g3.fillRect(0, 20, 48, 8);
        g3.fillRect(8, 8, 32, 32);
        g3.fillStyle(0xffff88, 0.6);
        g3.fillRect(12, 12, 24, 24);
        g3.generateTexture('perfect_parry_effect', 48, 48);
        g3.destroy();
    }

    /** Create item textures */
    private createItemTextures(): void {
        // Potion
        const g1 = this.add.graphics();
        g1.fillStyle(0x333333, 1);
        g1.fillRect(8, 2, 8, 6);
        g1.fillStyle(0xff3333, 1);
        g1.fillRect(4, 8, 16, 14);
        g1.fillStyle(0xff6666, 1);
        g1.fillRect(6, 10, 6, 6);
        g1.generateTexture('item_potion', 24, 24);
        g1.destroy();

        // Gold coin
        const g2 = this.add.graphics();
        g2.fillStyle(0xddaa22, 1);
        g2.fillRect(4, 4, 16, 16);
        g2.fillStyle(0xffcc33, 1);
        g2.fillRect(6, 6, 12, 12);
        g2.fillStyle(0xddaa22, 1);
        g2.fillRect(9, 8, 6, 8);
        g2.generateTexture('item_gold', 24, 24);
        g2.destroy();

        // Default item
        const g3 = this.add.graphics();
        g3.fillStyle(0xffd700, 1);
        g3.fillRect(4, 4, 16, 16);
        g3.fillStyle(0xffee66, 1);
        g3.fillRect(6, 6, 12, 12);
        g3.generateTexture('item_default', 24, 24);
        g3.destroy();

        // UI placeholders
        const g4 = this.add.graphics();
        g4.fillStyle(0x222222, 0.9);
        g4.fillRect(0, 0, 32, 32);
        g4.generateTexture('ui_dialogue_box', 32, 32);
        g4.destroy();

        const g5 = this.add.graphics();
        g5.fillStyle(0x333333, 0.9);
        g5.fillRect(0, 0, 32, 32);
        g5.generateTexture('ui_name_box', 32, 32);
        g5.destroy();

        // Tileset placeholder
        const g6 = this.add.graphics();
        g6.fillStyle(0x556655, 1);
        g6.fillRect(0, 0, 32, 32);
        g6.generateTexture('tiles_placeholder', 32, 32);
        g6.destroy();
    }
}
