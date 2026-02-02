import { BaseScene } from '../BaseScene';
import { SCENES, DEPTH } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';
import { Player } from '../../entities/Player';

/**
 * Geumseong world scene - 금성/서라벌 (Silla capital)
 * Fallen glory, ruined temples, and ancient tombs.
 */
export class GeumseongScene extends BaseScene {
    private player!: Player;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private readonly worldWidth = 4200;
    private readonly worldHeight = 1800;

    constructor() {
        super(SCENES.GEUMSEONG);
    }

    create(): void {
        Logger.info('GeumseongScene', 'Creating Geumseong world');
        this.cameras.main.setBackgroundColor(0x2a2a1a);

        this.platforms = this.physics.add.staticGroup();
        this.createWorld();

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.player = new Player(this, 100, 1400);
        this.physics.add.collider(this.player, this.platforms);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '금성/서라벌');

        this.fadeIn();
    }

    private createWorld(): void {
        // Ground
        this.addPlatform(0, 1600, this.worldWidth, 200, 0x4a4a2a);

        // City ruins
        this.addPlatform(100, 1400, 400, 20, 0x5a5a3a);
        this.addPlatform(600, 1300, 300, 20, 0x5a5a3a);
        this.addPlatform(1000, 1200, 400, 20, 0x5a5a3a);

        // Hwangnyongsa temple ruins (tall vertical area)
        this.addPlatform(1500, 1100, 300, 20, 0x6a6a4a);
        this.addPlatform(1600, 900, 200, 20, 0x6a6a4a);
        this.addPlatform(1500, 700, 300, 20, 0x6a6a4a);
        this.addPlatform(1600, 500, 200, 20, 0x6a6a4a);
        this.addPlatform(1550, 300, 250, 20, 0x6a6a4a);

        // Cheomseongdae area
        this.addPlatform(2200, 1300, 400, 20, 0x5a5a3a);
        this.addPlatform(2300, 1100, 200, 20, 0x5a5a3a);

        // Ancient tombs (underground)
        this.addPlatform(2800, 1400, 500, 20, 0x3a3a2a);
        this.addPlatform(3000, 1200, 300, 20, 0x3a3a2a);
        this.addPlatform(3200, 1000, 400, 20, 0x3a3a2a);
        this.addPlatform(2800, 1600, 300, 20, 0x2a2a1a);
        this.addPlatform(3100, 1700, 400, 20, 0x2a2a1a);

        // Noble district
        this.addPlatform(3700, 1300, 400, 20, 0x5a5a3a);
        this.addPlatform(3800, 1100, 300, 20, 0x5a5a3a);

        // Labels
        this.add.text(1650, 270, '황룡사지', { fontSize: '16px', color: '#ffcc44' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(2400, 1270, '첨성대', { fontSize: '16px', color: '#ffcc44' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(3100, 970, '고분군', { fontSize: '14px', color: '#aaaaaa' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(3900, 1070, '반월성', { fontSize: '16px', color: '#ffcc44' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
    }

    private addPlatform(x: number, y: number, w: number, h: number, color: number): void {
        const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color).setDepth(DEPTH.TILES);
        this.physics.add.existing(rect, true);
        this.platforms.add(rect);
    }

    update(time: number, delta: number): void {
        if (this.player) {
            this.player.update(time, delta);
        }
    }

    public getPlatforms(): Phaser.Physics.Arcade.StaticGroup { return this.platforms; }
}
