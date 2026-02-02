import Phaser from 'phaser';
import { BaseScene } from '../BaseScene';
import { SCENES, DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../../utils/Constants';
import { Logger } from '../../utils/Logger';
import { Player } from '../../entities/Player';

/** Whether tutorial has been shown this session */
let tutorialShown = false;

/**
 * Hub world scene - 저잣거리 (Marketplace)
 * Central hub connecting all regions. Contains shops, NPCs, and quest board.
 */
export class HubScene extends BaseScene {
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private player!: Player;
    private worldWidth: number = 3200;
    private worldHeight: number = 1200;
    private tutorialContainer: Phaser.GameObjects.Container | null = null;

    constructor() {
        super(SCENES.HUB);
    }

    create(): void {
        Logger.info('HubScene', 'Creating hub world');

        // Create background layers (parallax)
        this.createBackground();

        // Create the world
        this.createPlatforms();
        this.createDecorations();
        this.createNPCZones();
        this.createExitZones();

        // Set world bounds
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Create player
        this.player = new Player(this, 640, 900);
        this.physics.add.collider(this.player, this.platforms);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Emit area info
        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '저잣거리');

        this.fadeIn();

        // Show tutorial on first visit
        if (!tutorialShown) {
            this.time.delayedCall(800, () => this.showTutorial());
            tutorialShown = true;
        }
    }

    update(time: number, delta: number): void {
        if (this.player) {
            this.player.update(time, delta);
        }
    }

    /** Create parallax background layers */
    private createBackground(): void {
        // Sky gradient (stretched across world)
        const sky = this.add.tileSprite(0, 0, this.worldWidth, 600, 'bg_sky');
        sky.setOrigin(0, 0).setDepth(DEPTH.BACKGROUND - 2).setScrollFactor(0, 0);
        sky.setDisplaySize(GAME_WIDTH, 600);

        // Stars / moon
        const moonG = this.add.graphics();
        moonG.fillStyle(0xeeeedd, 0.9);
        moonG.fillCircle(0, 0, 30);
        moonG.fillStyle(0x2d1b3d, 1);
        moonG.fillCircle(-8, -5, 26);
        moonG.setPosition(1000, 80).setDepth(DEPTH.BACKGROUND - 1).setScrollFactor(0.05);

        // Distant mountains (far parallax)
        for (let x = 0; x < this.worldWidth; x += 320) {
            const mt = this.add.image(x, 350, 'bg_mountains');
            mt.setOrigin(0, 0).setDepth(DEPTH.BACKGROUND - 1).setScrollFactor(0.2, 0.5);
        }

        // Mid-ground buildings
        const buildingPositions = [200, 600, 1100, 1700, 2200, 2700];
        buildingPositions.forEach((bx, i) => {
            const bld = this.add.image(bx, 560, 'bg_building');
            bld.setOrigin(0, 0).setDepth(DEPTH.BACKGROUND).setScrollFactor(0.5, 0.7);
            bld.setAlpha(0.6 + (i % 3) * 0.1);
        });
    }

    private createPlatforms(): void {
        this.platforms = this.physics.add.staticGroup();

        // Ground floor - use tiling for texture
        this.createTexturedPlatform(0, 1050, this.worldWidth, 150, 'ground');

        // Market stalls / platforms - wood textured
        this.createTexturedPlatform(100, 900, 250, 20, 'wood');
        this.createTexturedPlatform(450, 800, 200, 20, 'wood');

        // Central plaza - stone
        this.createTexturedPlatform(750, 850, 500, 20, 'stone');

        // Right section
        this.createTexturedPlatform(1400, 900, 250, 20, 'wood');
        this.createTexturedPlatform(1750, 800, 200, 20, 'wood');

        // Upper walkways - wood
        this.createTexturedPlatform(200, 650, 300, 20, 'wood');
        this.createTexturedPlatform(600, 600, 200, 20, 'wood');
        this.createTexturedPlatform(900, 550, 300, 20, 'stone');
        this.createTexturedPlatform(1300, 600, 200, 20, 'wood');
        this.createTexturedPlatform(1600, 650, 300, 20, 'wood');

        // Roof access
        this.createTexturedPlatform(400, 400, 200, 20, 'stone');
        this.createTexturedPlatform(1000, 350, 200, 20, 'stone');
        this.createTexturedPlatform(1500, 400, 200, 20, 'stone');

        // Extended area
        this.createTexturedPlatform(2000, 950, 300, 20, 'wood');
        this.createTexturedPlatform(2400, 850, 250, 20, 'wood');
        this.createTexturedPlatform(2700, 750, 300, 20, 'wood');
        this.createTexturedPlatform(2500, 600, 200, 20, 'stone');
    }

    /** Create a textured platform with visual tiling */
    private createTexturedPlatform(x: number, y: number, width: number, height: number, type: 'ground' | 'wood' | 'stone'): void {
        // Physics collider (invisible)
        const platform = this.add.rectangle(x + width / 2, y + height / 2, width, height);
        platform.setVisible(false);
        this.physics.add.existing(platform, true);
        this.platforms.add(platform);

        // Visual tiling
        if (type === 'ground') {
            // Ground: dirt with grass on top
            const dirt = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x554433);
            dirt.setDepth(DEPTH.TILES);
            // Grass strip on top
            const grass = this.add.rectangle(x + width / 2, y + 3, width, 8, 0x446633);
            grass.setDepth(DEPTH.TILES + 1);
            // Grass highlight
            const grassHighlight = this.add.rectangle(x + width / 2, y + 1, width, 3, 0x558844);
            grassHighlight.setDepth(DEPTH.TILES + 2);
        } else if (type === 'wood') {
            const plank = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x775533);
            plank.setDepth(DEPTH.TILES);
            // Wood grain lines
            const line1 = this.add.rectangle(x + width / 2, y + 5, width, 1, 0x664422);
            line1.setDepth(DEPTH.TILES + 1);
            const line2 = this.add.rectangle(x + width / 2, y + 12, width, 1, 0x664422);
            line2.setDepth(DEPTH.TILES + 1);
            // Top highlight
            const highlight = this.add.rectangle(x + width / 2, y + 1, width, 2, 0x886644);
            highlight.setDepth(DEPTH.TILES + 2);
            // Bottom shadow
            const shadow = this.add.rectangle(x + width / 2, y + height - 1, width, 2, 0x553311);
            shadow.setDepth(DEPTH.TILES + 1);
        } else {
            // Stone
            const stone = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x666677);
            stone.setDepth(DEPTH.TILES);
            // Top highlight
            const highlight = this.add.rectangle(x + width / 2, y + 1, width, 2, 0x888899);
            highlight.setDepth(DEPTH.TILES + 2);
            // Bottom shadow
            const shadow = this.add.rectangle(x + width / 2, y + height - 1, width, 2, 0x444455);
            shadow.setDepth(DEPTH.TILES + 1);
        }
    }

    private createDecorations(): void {
        // Area title banner
        const bannerBg = this.add.rectangle(1000, 515, 200, 36, 0x000000, 0.4);
        bannerBg.setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(1000, 515, '저잣거리', {
            fontSize: '24px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 2);

        // Directional signs with arrow sprites
        this.createDirectionSign(100, 1010, '← 송악', '#88aaff');
        this.createDirectionSign(this.worldWidth - 200, 1010, '완산주 →', '#ff8888');
        this.createDirectionSign(1000, 320, '↑ 철원', '#aa88ff');

        // Shop signs
        this.createShopSign(200, 865, '주막', '#ffaa44');
        this.createShopSign(1000, 815, '광장', '#ffaa44');
        this.createShopSign(1600, 865, '대장장이', '#ff6633');
        this.createShopSign(900, 815, '의뢰 게시판', '#88ff88');

        // Lanterns (hanging from platforms)
        const lanternPositions = [300, 550, 850, 1100, 1500, 1800, 2200, 2600];
        lanternPositions.forEach((lx, i) => {
            const ly = 500 + (i % 3) * 100;
            const lantern = this.add.image(lx, ly, 'lantern');
            lantern.setDepth(DEPTH.BACKGROUND + 3);
            // Subtle glow
            const glow = this.add.circle(lx, ly + 10, 20, 0xffaa44, 0.1);
            glow.setDepth(DEPTH.BACKGROUND + 2);
            // Animate glow
            this.tweens.add({
                targets: glow,
                alpha: { from: 0.05, to: 0.15 },
                duration: 1500 + i * 200,
                yoyo: true,
                repeat: -1,
            });
        });

        // Trees in background
        const treePositions = [50, 350, 800, 1300, 1900, 2500, 3000];
        treePositions.forEach((tx, i) => {
            const tree = this.add.image(tx, 980, 'tree');
            tree.setOrigin(0.5, 1).setDepth(DEPTH.BACKGROUND + 1);
            tree.setScale(0.8 + (i % 3) * 0.2);
            tree.setAlpha(0.7);
        });
    }

    /** Create a direction sign with background */
    private createDirectionSign(x: number, y: number, text: string, color: string): void {
        const bg = this.add.rectangle(x, y, text.length * 10 + 20, 24, 0x000000, 0.3);
        bg.setDepth(DEPTH.BACKGROUND + 1);
        this.add.text(x, y, text, {
            fontSize: '14px', color,
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 2);
    }

    /** Create a shop sign */
    private createShopSign(x: number, y: number, text: string, color: string): void {
        // Hanging sign board
        const signW = text.length * 10 + 16;
        const bg = this.add.rectangle(x, y, signW, 22, 0x442211, 0.8);
        bg.setDepth(DEPTH.BACKGROUND + 3);
        const border = this.add.rectangle(x, y, signW + 2, 24, 0x664422, 0.5);
        border.setDepth(DEPTH.BACKGROUND + 2);
        this.add.text(x, y, text, {
            fontSize: '12px', color,
            stroke: '#000000', strokeThickness: 1,
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 4);
    }

    private createNPCZones(): void {
        const npcLocations = [
            { id: 'innkeeper', x: 200, y: 880, name: '주막 주인', texture: 'npc_innkeeper' },
            { id: 'weaponsmith', x: 1600, y: 880, name: '대장장이', texture: 'npc_weaponsmith' },
            { id: 'fortune_teller', x: 500, y: 780, name: '점술가', texture: 'npc_fortune_teller' },
            { id: 'quest_board', x: 900, y: 830, name: '게시판', texture: 'npc_quest_board' },
            { id: 'merchant', x: 1200, y: 830, name: '잡화상', texture: 'npc_merchant' },
        ];

        npcLocations.forEach(npc => {
            // Use the NPC sprite textures
            const sprite = this.add.image(npc.x, npc.y - 24, npc.texture);
            sprite.setDepth(DEPTH.ENEMIES);

            // Name label with background
            const labelBg = this.add.rectangle(npc.x, npc.y - 56, npc.name.length * 9 + 10, 18, 0x000000, 0.5);
            labelBg.setDepth(DEPTH.UI - 1);
            const nameLabel = this.add.text(npc.x, npc.y - 56, npc.name, {
                fontSize: '11px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(DEPTH.UI);

            // Interaction indicator (floating arrow)
            const arrow = this.add.text(npc.x, npc.y - 70, '▼', {
                fontSize: '10px', color: '#ffdd44',
            }).setOrigin(0.5).setDepth(DEPTH.UI);
            this.tweens.add({
                targets: arrow,
                y: npc.y - 76,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
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

    /** Show tutorial overlay */
    private showTutorial(): void {
        const cam = this.cameras.main;
        const cx = cam.scrollX + GAME_WIDTH / 2;
        const cy = cam.scrollY + GAME_HEIGHT / 2;

        this.tutorialContainer = this.add.container(cx, cy);
        this.tutorialContainer.setDepth(DEPTH.UI + 100);
        this.tutorialContainer.setScrollFactor(0);
        this.tutorialContainer.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Dark overlay
        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);
        this.tutorialContainer.add(overlay);

        // Title
        const title = this.add.text(0, -220, '삼한지몽 - 조작법', {
            fontSize: '32px', color: '#ffd700',
            stroke: '#000000', strokeThickness: 4,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.tutorialContainer.add(title);

        // Controls layout
        const controls = [
            { label: '이동', key: 'A / D  또는  ← / →', y: -150 },
            { label: '점프', key: 'Space  또는  W', y: -110 },
            { label: '공격 (콤보)', key: 'Z  또는  J', y: -70 },
            { label: '회피 (무적)', key: 'C  또는  L', y: -30 },
            { label: '패링', key: 'Shift', y: 10 },
            { label: '회복', key: 'V  또는  H', y: 50 },
            { label: '인벤토리', key: 'I', y: 110 },
            { label: '지도', key: 'M', y: 150 },
            { label: '메뉴', key: 'ESC', y: 190 },
        ];

        controls.forEach(ctrl => {
            // Action label
            const actionText = this.add.text(-180, ctrl.y, ctrl.label, {
                fontSize: '18px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0, 0.5);
            this.tutorialContainer!.add(actionText);

            // Key box
            const keyBg = this.add.rectangle(80, ctrl.y, 260, 28, 0x333355, 0.8);
            this.tutorialContainer!.add(keyBg);
            const keyText = this.add.text(80, ctrl.y, ctrl.key, {
                fontSize: '16px', color: '#88bbff',
                stroke: '#000000', strokeThickness: 1,
            }).setOrigin(0.5);
            this.tutorialContainer!.add(keyText);
        });

        // Separator line
        const line = this.add.rectangle(0, 85, 400, 2, 0x555577, 0.5);
        this.tutorialContainer.add(line);

        // Hint
        const hintText = this.add.text(0, 240, '아무 키를 눌러 시작', {
            fontSize: '20px', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);
        this.tutorialContainer.add(hintText);

        // Blink the hint
        this.tweens.add({
            targets: hintText,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
        });

        // Close on any key press
        const closeHandler = () => {
            if (this.tutorialContainer) {
                this.tweens.add({
                    targets: this.tutorialContainer,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        this.tutorialContainer?.destroy();
                        this.tutorialContainer = null;
                    },
                });
            }
        };

        if (this.input.keyboard) {
            this.input.keyboard.once('keydown', closeHandler);
        }
        this.input.once('pointerdown', closeHandler);
    }

    /** Get the platforms group for collision setup */
    public getPlatforms(): Phaser.Physics.Arcade.StaticGroup {
        return this.platforms;
    }
}
