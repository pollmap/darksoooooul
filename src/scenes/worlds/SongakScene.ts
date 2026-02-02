import { BaseScene } from '../BaseScene';
import { SCENES, DEPTH } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';

/**
 * Songak world scene - 송악 (Goryeo territory)
 * Harbor city with maritime trade, featuring Wang Geon's estate.
 */
export class SongakScene extends BaseScene {
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private readonly worldWidth = 4000;
    private readonly worldHeight = 1600;

    constructor() {
        super(SCENES.SONGAK);
    }

    create(): void {
        Logger.info('SongakScene', 'Creating Songak world');
        this.cameras.main.setBackgroundColor(0x1a3a4a);

        this.platforms = this.physics.add.staticGroup();
        this.createWorld();

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '송악');
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
        this.addPlatform(0, 1400, this.worldWidth, 200, 0x3d5a5a);

        // Harbor area (left)
        this.addPlatform(100, 1200, 400, 20, 0x5a4a3a);
        this.addPlatform(600, 1100, 300, 20, 0x5a4a3a);
        this.addPlatform(200, 1000, 200, 20, 0x5a4a3a);

        // Market district (center)
        this.addPlatform(1000, 1200, 600, 20, 0x5a4a3a);
        this.addPlatform(1100, 1000, 400, 20, 0x5a4a3a);
        this.addPlatform(1300, 800, 300, 20, 0x4a3a2a);

        // Noble district (right)
        this.addPlatform(2000, 1100, 500, 20, 0x6a5a4a);
        this.addPlatform(2200, 900, 400, 20, 0x6a5a4a);
        this.addPlatform(2400, 700, 300, 20, 0x6a5a4a);

        // Wang Geon estate (far right, upper)
        this.addPlatform(2800, 800, 600, 20, 0x7a6a5a);
        this.addPlatform(3000, 600, 400, 20, 0x7a6a5a);
        this.addPlatform(3100, 400, 300, 20, 0x7a6a5a);

        // Underground waterway (below ground)
        this.addPlatform(500, 1500, 200, 20, 0x2a3a4a);
        this.addPlatform(800, 1550, 200, 20, 0x2a3a4a);

        // Labels
        this.add.text(300, 1170, '송악 항구', { fontSize: '16px', color: '#88ccff' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(1300, 1170, '시장 거리', { fontSize: '16px', color: '#88ccff' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(2300, 1070, '귀족 거주구', { fontSize: '16px', color: '#88ccff' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(3100, 570, '왕건 저택', { fontSize: '16px', color: '#ffd700' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
    }

    private addPlatform(x: number, y: number, w: number, h: number, color: number): void {
        const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color).setDepth(DEPTH.TILES);
        this.physics.add.existing(rect, true);
        this.platforms.add(rect);
    }

    public getPlatforms(): Phaser.Physics.Arcade.StaticGroup { return this.platforms; }
}
