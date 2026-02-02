import Phaser from 'phaser';
import { BaseScene } from '../BaseScene';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, DEPTH, PHYSICS, COLORS } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';

/**
 * Hub world scene - 저잣거리 (Marketplace)
 * Central hub connecting all regions. Contains shops, NPCs, and quest board.
 */
export class HubScene extends BaseScene {
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private worldWidth: number = 3200;
    private worldHeight: number = 1200;

    constructor() {
        super(SCENES.HUB);
    }

    create(): void {
        Logger.info('HubScene', 'Creating hub world');

        // Background
        this.cameras.main.setBackgroundColor(0x2d1b3d);

        // Create the world
        this.createPlatforms();
        this.createDecorations();
        this.createNPCZones();
        this.createExitZones();

        // Set world bounds
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Emit area info
        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '저잣거리');
        gameScene.events.emit('world_created', {
            platforms: this.platforms,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            spawnPoint: { x: 640, y: 900 },
        });

        this.fadeIn();
    }

    private createPlatforms(): void {
        this.platforms = this.physics.add.staticGroup();

        // Ground floor
        this.createPlatformRect(0, 1050, this.worldWidth, 150, 0x554433);

        // Market stalls / platforms at various heights
        // Left section
        this.createPlatformRect(100, 900, 250, 20, 0x665544);
        this.createPlatformRect(450, 800, 200, 20, 0x665544);

        // Central plaza
        this.createPlatformRect(750, 850, 500, 20, 0x665544);

        // Right section
        this.createPlatformRect(1400, 900, 250, 20, 0x665544);
        this.createPlatformRect(1750, 800, 200, 20, 0x665544);

        // Upper walkways
        this.createPlatformRect(200, 650, 300, 20, 0x554433);
        this.createPlatformRect(600, 600, 200, 20, 0x554433);
        this.createPlatformRect(900, 550, 300, 20, 0x554433);
        this.createPlatformRect(1300, 600, 200, 20, 0x554433);
        this.createPlatformRect(1600, 650, 300, 20, 0x554433);

        // Roof access
        this.createPlatformRect(400, 400, 200, 20, 0x443322);
        this.createPlatformRect(1000, 350, 200, 20, 0x443322);
        this.createPlatformRect(1500, 400, 200, 20, 0x443322);

        // Extended area (beyond screen)
        this.createPlatformRect(2000, 950, 300, 20, 0x665544);
        this.createPlatformRect(2400, 850, 250, 20, 0x665544);
        this.createPlatformRect(2700, 750, 300, 20, 0x665544);
        this.createPlatformRect(2500, 600, 200, 20, 0x554433);
    }

    private createPlatformRect(x: number, y: number, width: number, height: number, color: number): void {
        const platform = this.add.rectangle(x + width / 2, y + height / 2, width, height, color);
        this.physics.add.existing(platform, true);
        this.platforms.add(platform);
        platform.setDepth(DEPTH.TILES);
    }

    private createDecorations(): void {
        // Market banners
        this.add.text(1000, 520, '저잣거리', {
            fontSize: '24px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);

        // Directional signs
        this.add.text(100, 1020, '← 송악', {
            fontSize: '14px', color: '#aaaaaa',
        }).setDepth(DEPTH.BACKGROUND + 1);

        this.add.text(this.worldWidth - 200, 1020, '완산주 →', {
            fontSize: '14px', color: '#aaaaaa',
        }).setDepth(DEPTH.BACKGROUND + 1);

        this.add.text(1000, 320, '↑ 철원', {
            fontSize: '14px', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);

        // Shop labels
        this.add.text(200, 870, '주막', {
            fontSize: '14px', color: '#ffaa44',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);

        this.add.text(1000, 820, '광장', {
            fontSize: '14px', color: '#ffaa44',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);

        this.add.text(1600, 870, '대장장이', {
            fontSize: '14px', color: '#ffaa44',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);

        // Quest board
        this.add.text(900, 820, '의뢰 게시판', {
            fontSize: '12px', color: '#88ff88',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
    }

    private createNPCZones(): void {
        // NPC interaction zones would spawn NPC entities
        // For now, mark locations
        const npcLocations = [
            { id: 'innkeeper', x: 200, y: 880, name: '주막 주인' },
            { id: 'weaponsmith', x: 1600, y: 880, name: '대장장이' },
            { id: 'fortune_teller', x: 500, y: 780, name: '점술가' },
            { id: 'quest_board', x: 900, y: 830, name: '게시판' },
            { id: 'merchant', x: 1200, y: 830, name: '잡화상' },
        ];

        npcLocations.forEach(npc => {
            // Visual marker
            const marker = this.add.rectangle(npc.x, npc.y - 30, 32, 48, 0x666666);
            marker.setDepth(DEPTH.ENEMIES);

            const nameLabel = this.add.text(npc.x, npc.y - 60, npc.name, {
                fontSize: '11px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 1,
            }).setOrigin(0.5).setDepth(DEPTH.UI);
        });
    }

    private createExitZones(): void {
        // Left exit -> Songak
        const leftExit = this.add.zone(0, 900, 40, 200);
        this.physics.add.existing(leftExit, true);
        // Right exit -> Wansanju
        const rightExit = this.add.zone(this.worldWidth, 900, 40, 200);
        this.physics.add.existing(rightExit, true);
        // Top exit -> Cheolwon
        const topExit = this.add.zone(1000, 0, 200, 40);
        this.physics.add.existing(topExit, true);
    }

    /** Get the platforms group for collision setup */
    public getPlatforms(): Phaser.Physics.Arcade.StaticGroup {
        return this.platforms;
    }
}
