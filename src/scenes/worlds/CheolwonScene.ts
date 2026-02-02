import { BaseScene } from '../BaseScene';
import { SCENES, DEPTH } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';
import { Player } from '../../entities/Player';

/**
 * Cheolwon world scene - 철원경 (Taebong capital)
 * Oppressive atmosphere with Mireuk temple and surveillance towers.
 */
export class CheolwonScene extends BaseScene {
    private player!: Player;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private readonly worldWidth = 4000;
    private readonly worldHeight = 1800;

    constructor() {
        super(SCENES.CHEOLWON);
    }

    create(): void {
        Logger.info('CheolwonScene', 'Creating Cheolwon world');
        this.cameras.main.setBackgroundColor(0x1a0a2a);

        this.platforms = this.physics.add.staticGroup();
        this.createWorld();

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.player = new Player(this, 100, 1400);
        this.physics.add.collider(this.player, this.platforms);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '철원경');

        this.fadeIn();
    }

    private createWorld(): void {
        this.addPlatform(0, 1600, this.worldWidth, 200, 0x2a1a3a);

        // Outer city
        this.addPlatform(100, 1400, 500, 20, 0x3a2a4a);
        this.addPlatform(700, 1300, 400, 20, 0x3a2a4a);

        // Surveillance towers (vertical)
        this.addPlatform(1200, 1200, 100, 20, 0x4a3a5a);
        this.addPlatform(1200, 1000, 100, 20, 0x4a3a5a);
        this.addPlatform(1200, 800, 100, 20, 0x4a3a5a);

        // Mireuk temple (large interior)
        this.addPlatform(1500, 1100, 600, 20, 0x5a4a6a);
        this.addPlatform(1600, 900, 400, 20, 0x5a4a6a);
        this.addPlatform(1700, 700, 300, 20, 0x5a4a6a);
        this.addPlatform(1650, 500, 400, 20, 0x5a4a6a);

        // Inner fortress
        this.addPlatform(2300, 1200, 500, 20, 0x4a3a5a);
        this.addPlatform(2400, 1000, 400, 20, 0x4a3a5a);

        // Gwansimbeop training hall
        this.addPlatform(2900, 1100, 400, 20, 0x4a3a5a);
        this.addPlatform(3000, 900, 300, 20, 0x4a3a5a);
        this.addPlatform(3100, 700, 200, 20, 0x4a3a5a);

        // Gungye's palace (top)
        this.addPlatform(2500, 600, 500, 20, 0x6a5a7a);
        this.addPlatform(2600, 400, 300, 20, 0x6a5a7a);
        this.addPlatform(2650, 200, 200, 20, 0x6a5a7a);

        // Underground prison
        this.addPlatform(1800, 1500, 300, 20, 0x1a0a2a);
        this.addPlatform(2100, 1600, 400, 20, 0x1a0a2a);
        this.addPlatform(1600, 1700, 300, 20, 0x1a0a2a);

        // Labels
        this.add.text(1800, 470, '미륵 사원', { fontSize: '16px', color: '#cc88ff' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(2750, 170, '궁예 궁궐', { fontSize: '16px', color: '#ffd700' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(3100, 670, '관심법 수련원', { fontSize: '14px', color: '#cc88ff' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(1250, 770, '감시 탑', { fontSize: '12px', color: '#888888' }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 1);
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
