import { BaseScene } from '../BaseScene';
import { SCENES, DEPTH } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';

/**
 * Wansanju world scene - 완산주 (Hubaekje territory)
 * Military fortress city with arena and barracks.
 */
export class WansanjuScene extends BaseScene {
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private readonly worldWidth = 3800;
    private readonly worldHeight = 1600;

    constructor() {
        super(SCENES.WANSANJU);
    }

    create(): void {
        Logger.info('WansanjuScene', 'Creating Wansanju world');
        this.cameras.main.setBackgroundColor(0x3d1a1a);

        this.platforms = this.physics.add.staticGroup();
        this.createWorld();

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '완산주');
        gameScene.events.emit('world_created', {
            platforms: this.platforms,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            spawnPoint: { x: 100, y: 1200 },
        });

        this.fadeIn();
    }

    private createWorld(): void {
        // Ground
        this.addPlatform(0, 1400, this.worldWidth, 200, 0x4a2a1a);

        // Outer city
        this.addPlatform(100, 1200, 500, 20, 0x5a3a2a);
        this.addPlatform(700, 1100, 400, 20, 0x5a3a2a);

        // Inner fortress
        this.addPlatform(1200, 1000, 600, 20, 0x6a4a3a);
        this.addPlatform(1400, 800, 400, 20, 0x6a4a3a);

        // Arena
        this.addPlatform(2000, 1200, 500, 20, 0x5a3a2a);
        this.addPlatform(2100, 1050, 300, 20, 0x5a3a2a);

        // Barracks
        this.addPlatform(2600, 1100, 400, 20, 0x5a3a2a);
        this.addPlatform(2800, 900, 300, 20, 0x5a3a2a);

        // Royal palace (upper)
        this.addPlatform(1500, 600, 500, 20, 0x7a5a4a);
        this.addPlatform(1600, 400, 300, 20, 0x7a5a4a);

        // Underground prison
        this.addPlatform(1000, 1500, 300, 20, 0x2a1a1a);
        this.addPlatform(1400, 1550, 300, 20, 0x2a1a1a);

        // Labels
        this.add.text(350, 1170, '외성', { fontSize: '16px', color: '#ff8888' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(1500, 970, '본성', { fontSize: '16px', color: '#ff8888' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(2250, 1170, '투기장', { fontSize: '16px', color: '#ffaa44' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(1750, 370, '견훤 왕궁', { fontSize: '16px', color: '#ffd700' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
    }

    private addPlatform(x: number, y: number, w: number, h: number, color: number): void {
        const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color).setDepth(DEPTH.TILES);
        this.physics.add.existing(rect, true);
        this.platforms.add(rect);
    }

    public getPlatforms(): Phaser.Physics.Arcade.StaticGroup { return this.platforms; }
}
