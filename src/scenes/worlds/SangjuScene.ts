import { BaseScene } from '../BaseScene';
import { SCENES, DEPTH } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';
import { Player } from '../../entities/Player';

/**
 * Sangju world scene - 상주/명주 (Battlefield + Eastern mountains)
 * War-torn battlefields and serene mountain paths.
 */
export class SangjuScene extends BaseScene {
    private player!: Player;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private readonly worldWidth = 4500;
    private readonly worldHeight = 2000;

    constructor() {
        super(SCENES.SANGJU);
    }

    create(): void {
        Logger.info('SangjuScene', 'Creating Sangju world');
        this.cameras.main.setBackgroundColor(0x2a2a2a);

        this.platforms = this.physics.add.staticGroup();
        this.createWorld();

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.player = new Player(this, 100, 1500);
        this.physics.add.collider(this.player, this.platforms);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '상주/명주');

        this.fadeIn();
    }

    private createWorld(): void {
        this.addPlatform(0, 1800, this.worldWidth, 200, 0x3a3a2a);

        // Sangju battlefield (left half)
        this.addPlatform(100, 1600, 500, 20, 0x4a3a2a);
        this.addPlatform(700, 1500, 400, 20, 0x4a3a2a);
        this.addPlatform(1200, 1400, 500, 20, 0x4a3a2a);
        this.addPlatform(400, 1300, 300, 20, 0x4a3a2a);
        this.addPlatform(900, 1200, 400, 20, 0x4a3a2a);

        // Fortress ruins
        this.addPlatform(1500, 1100, 300, 20, 0x5a4a3a);
        this.addPlatform(1400, 900, 200, 20, 0x5a4a3a);
        this.addPlatform(1550, 700, 250, 20, 0x5a4a3a);

        // Mountain pass (transition to Myeongju)
        this.addPlatform(2000, 1400, 300, 20, 0x3a4a3a);
        this.addPlatform(2300, 1200, 250, 20, 0x3a4a3a);
        this.addPlatform(2500, 1000, 300, 20, 0x3a4a3a);

        // Myeongju/Gangneung area (right half)
        this.addPlatform(2800, 1300, 400, 20, 0x3a5a3a);
        this.addPlatform(3200, 1100, 300, 20, 0x3a5a3a);
        this.addPlatform(3500, 900, 350, 20, 0x3a5a3a);

        // Hermit cave
        this.addPlatform(3000, 800, 200, 20, 0x4a4a4a);

        // Mountain shrine (top)
        this.addPlatform(3700, 700, 300, 20, 0x4a6a4a);
        this.addPlatform(3800, 500, 250, 20, 0x4a6a4a);
        this.addPlatform(3850, 300, 200, 20, 0x5a7a5a);

        // Fishing village
        this.addPlatform(4000, 1500, 400, 20, 0x3a5a6a);

        // Gyeonhwon birthplace
        this.addPlatform(200, 1400, 200, 20, 0x5a4a3a);

        // Labels
        this.add.text(800, 1170, '전장터', { fontSize: '16px', color: '#aa8866' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(1550, 670, '산성 유적', { fontSize: '14px', color: '#aa8866' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(3400, 870, '고산 지대', { fontSize: '14px', color: '#66aa66' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(3950, 270, '산신령', { fontSize: '16px', color: '#88ff88' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(4200, 1470, '어촌 마을', { fontSize: '14px', color: '#88aacc' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(300, 1370, '견훤 생가', { fontSize: '12px', color: '#aa6644' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
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
