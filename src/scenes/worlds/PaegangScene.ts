import { BaseScene } from '../BaseScene';
import { SCENES, DEPTH } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';

/**
 * Paegang world scene - 패강/서경 (Balhae refugee area)
 * Misty, melancholic atmosphere with refugee village and hidden royal tomb.
 */
export class PaegangScene extends BaseScene {
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private readonly worldWidth = 4000;
    private readonly worldHeight = 2000;

    constructor() {
        super(SCENES.PAEGANG);
    }

    create(): void {
        Logger.info('PaegangScene', 'Creating Paegang world');
        this.cameras.main.setBackgroundColor(0x1a2a3a);

        this.platforms = this.physics.add.staticGroup();
        this.createWorld();

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '패강/서경');
        gameScene.events.emit('world_created', {
            platforms: this.platforms,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            spawnPoint: { x: 100, y: 1500 },
        });

        this.fadeIn();
    }

    private createWorld(): void {
        this.addPlatform(0, 1700, this.worldWidth, 300, 0x2a3a4a);

        // Refugee village
        this.addPlatform(200, 1500, 400, 20, 0x3a4a5a);
        this.addPlatform(700, 1400, 300, 20, 0x3a4a5a);
        this.addPlatform(1100, 1300, 400, 20, 0x3a4a5a);

        // Daedong River area
        this.addPlatform(1600, 1500, 200, 20, 0x2a3a5a);
        this.addPlatform(1900, 1400, 200, 20, 0x2a3a5a);

        // Swamp area (poison zone)
        this.addPlatform(2200, 1500, 300, 20, 0x2a4a2a);
        this.addPlatform(2600, 1400, 250, 20, 0x2a4a2a);
        this.addPlatform(2900, 1300, 300, 20, 0x2a4a2a);

        // Mountain area
        this.addPlatform(1000, 1100, 300, 20, 0x3a4a5a);
        this.addPlatform(1300, 900, 250, 20, 0x3a4a5a);
        this.addPlatform(1500, 700, 300, 20, 0x3a4a5a);
        this.addPlatform(1200, 500, 250, 20, 0x3a4a5a);

        // Hidden royal tomb (far upper right)
        this.addPlatform(3000, 1000, 400, 20, 0x4a5a6a);
        this.addPlatform(3200, 800, 300, 20, 0x4a5a6a);
        this.addPlatform(3100, 600, 400, 20, 0x4a5a6a);
        this.addPlatform(3200, 400, 300, 20, 0x4a5a6a);
        this.addPlatform(3150, 200, 350, 20, 0x5a6a7a);

        // Funeral area
        this.addPlatform(500, 1300, 200, 20, 0x2a2a3a);

        // Labels
        this.add.text(900, 1270, '유민촌', { fontSize: '16px', color: '#88aacc' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(2500, 1370, '습지 지대', { fontSize: '14px', color: '#66aa66' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(3300, 170, '발해 왕릉', { fontSize: '16px', color: '#aaccff' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(1800, 1470, '대동강변', { fontSize: '14px', color: '#88aacc' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
    }

    private addPlatform(x: number, y: number, w: number, h: number, color: number): void {
        const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color).setDepth(DEPTH.TILES);
        this.physics.add.existing(rect, true);
        this.platforms.add(rect);
    }

    public getPlatforms(): Phaser.Physics.Arcade.StaticGroup { return this.platforms; }
}
