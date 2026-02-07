import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, TILE_SIZE } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/** Shorthand for tile dimension */
const T = TILE_SIZE;

/** Spritesheet columns (frames per direction) */
const SHEET_COLS = 3;

/** Spritesheet rows (number of directions: down, up, left, right) */
const SHEET_ROWS = 4;

/** Walk animation frame rate */
const WALK_FPS = 6;

/** Player character colour palette */
const P_HAIR = 0x1a1a22;
const P_HAIR_HI = 0x2a2a3a;
const P_SKIN = 0xf0c8a0;
const P_EYE = 0x111111;
const P_SHIRT = 0x3355aa;
const P_SHIRT_DK = 0x284488;
const P_BELT = 0xddaa33;
const P_BELT_HI = 0xeecc55;
const P_PANTS = 0x283878;
const P_BOOT = 0x554433;

/** NPC colour definitions: [body, accent, hair, hat] */
const NPC_PALETTES: ReadonlyArray<readonly [number, number, number, number]> = [
    [0x8b4513, 0xcc8833, 0x3a2a1a, 0x5a4a3a],   // npc_1 – village elder
    [0x2a8a2a, 0x44cc44, 0x2a2a2a, 0x1a6a1a],   // npc_2 – merchant
    [0x6a2a8a, 0xaa44cc, 0x1a1a1a, 0x5a1a7a],   // npc_3 – scholar
    [0xaa5500, 0xdd8833, 0x2a1a0a, 0x885500],    // npc_4 – guard
] as const;

/** Total generation stages for progress tracking */
const TOTAL_STAGES = 4;

/**
 * PreloaderScene - Procedurally generates every pixel-art texture needed
 * by the top-down 16x16 tile RPG: tile textures, a player spritesheet,
 * NPC textures, and Phaser animations. Shows a progress bar and then
 * transitions to MainMenuScene.
 */
export class PreloaderScene extends Phaser.Scene {
    /** Progress bar background graphic */
    private progressBox!: Phaser.GameObjects.Graphics;

    /** Progress bar fill graphic */
    private progressBar!: Phaser.GameObjects.Graphics;

    /** Status label text */
    private labelText!: Phaser.GameObjects.Text;

    /** Percentage text */
    private pctText!: Phaser.GameObjects.Text;

    constructor() {
        super(SCENES.PRELOADER);
    }

    /**
     * Scene create - builds loading UI, generates all textures in
     * staged batches with visual progress, creates animations, and
     * transitions to MainMenuScene.
     */
    create(): void {
        Logger.info('PreloaderScene', 'Starting procedural texture generation');
        this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
        this.buildLoadingUI();
        this.runGenerationStages();
    }

    // ----------------------------------------------------------------
    //  Loading UI
    // ----------------------------------------------------------------

    /** Create the centred progress bar and labels */
    private buildLoadingUI(): void {
        const BAR_W = 320;
        const BAR_H = 30;
        const PAD = 10;
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        this.progressBox = this.add.graphics();
        this.progressBox.fillStyle(0x222222, 0.8);
        this.progressBox.fillRect(
            cx - BAR_W / 2 - PAD, cy - BAR_H / 2 - PAD,
            BAR_W + PAD * 2, BAR_H + PAD * 2,
        );
        this.progressBox.lineStyle(2, COLORS.GOLD, 0.5);
        this.progressBox.strokeRect(
            cx - BAR_W / 2 - PAD, cy - BAR_H / 2 - PAD,
            BAR_W + PAD * 2, BAR_H + PAD * 2,
        );

        this.progressBar = this.add.graphics();

        this.add.text(cx, cy - 80, '\uc0bc\ud55c\uc9c0\ubabd', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'monospace',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.labelText = this.add.text(cx, cy - 45, '\ub85c\ub529 \uc911...', {
            fontSize: '16px',
            color: '#cccccc',
            fontFamily: 'monospace',
        }).setOrigin(0.5);

        this.pctText = this.add.text(cx, cy, '0%', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'monospace',
        }).setOrigin(0.5);
    }

    /**
     * Update progress bar fill and label.
     * @param done - Number of completed stages
     * @param label - Status description to display
     */
    private setProgress(done: number, label: string): void {
        const BAR_W = 320;
        const BAR_H = 30;
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const ratio = done / TOTAL_STAGES;

        this.progressBar.clear();
        this.progressBar.fillStyle(COLORS.GOLD, 1);
        this.progressBar.fillRect(cx - BAR_W / 2, cy - BAR_H / 2, BAR_W * ratio, BAR_H);
        this.pctText.setText(`${Math.round(ratio * 100)}%`);
        this.labelText.setText(label);
    }

    // ----------------------------------------------------------------
    //  Generation orchestrator
    // ----------------------------------------------------------------

    /** Run each generation stage with a short delay so the bar repaints */
    private runGenerationStages(): void {
        const stages: { label: string; fn: () => void }[] = [
            { label: '\ud0c0\uc77c \ud14d\uc2a4\ucc98 \uc0dd\uc131 \uc911...', fn: () => this.generateTileTextures() },
            { label: '\ud50c\ub808\uc774\uc5b4 \uc2a4\ud504\ub77c\uc774\ud2b8 \uc0dd\uc131 \uc911...', fn: () => this.generatePlayerSpritesheet() },
            { label: 'NPC \uc2a4\ud504\ub77c\uc774\ud2b8 \uc0dd\uc131 \uc911...', fn: () => this.generateNPCTextures() },
            { label: '\uc560\ub2c8\uba54\uc774\uc158 \uc124\uc815 \uc911...', fn: () => this.createAnimations() },
        ];

        const next = (i: number): void => {
            if (i >= stages.length) {
                this.setProgress(TOTAL_STAGES, '\ub85c\ub529 \uc644\ub8cc!');
                this.time.delayedCall(300, () => {
                    Logger.info('PreloaderScene', 'All textures and animations ready');
                    this.scene.start(SCENES.MAIN_MENU);
                });
                return;
            }
            const s = stages[i];
            this.labelText.setText(s.label);
            try {
                s.fn();
            } catch (err) {
                Logger.error('PreloaderScene', `Stage failed: ${s.label}`, err);
            }
            this.setProgress(i + 1, s.label);
            this.time.delayedCall(50, () => next(i + 1));
        };

        next(0);
    }

    // ----------------------------------------------------------------
    //  Canvas drawing helpers
    // ----------------------------------------------------------------

    /** Convert 0xRRGGBB to a CSS hex string '#rrggbb' */
    private hex(c: number): string {
        return '#' + c.toString(16).padStart(6, '0');
    }

    /** Set ctx.fillStyle from a numeric colour and optional alpha */
    private setFill(ctx: CanvasRenderingContext2D, color: number, alpha = 1): void {
        if (alpha < 1) {
            const r = (color >> 16) & 0xff;
            const g = (color >> 8) & 0xff;
            const b = color & 0xff;
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        } else {
            ctx.fillStyle = this.hex(color);
        }
    }

    /** Draw a filled rectangle on a canvas context */
    private dr(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, w: number, h: number,
        color: number, alpha = 1,
    ): void {
        this.setFill(ctx, color, alpha);
        ctx.fillRect(x, y, w, h);
    }

    /** Draw a single pixel */
    private dp(ctx: CanvasRenderingContext2D, x: number, y: number, color: number): void {
        this.setFill(ctx, color);
        ctx.fillRect(x, y, 1, 1);
    }

    /**
     * Create a TxT CanvasTexture, return context and texture handle.
     * Throws if the canvas could not be created.
     * @param key - Texture key to register
     */
    private makeTile(key: string): { ctx: CanvasRenderingContext2D; ct: Phaser.Textures.CanvasTexture } {
        const ct = this.textures.createCanvas(key, T, T);
        if (!ct) {
            throw new Error(`Failed to create canvas texture: ${key}`);
        }
        return { ctx: ct.getContext(), ct };
    }

    // ----------------------------------------------------------------
    //  Tile texture generators  (each 16x16)
    // ----------------------------------------------------------------

    /** Generate all 15 tile textures */
    private generateTileTextures(): void {
        this.genGrass();
        this.genPath();
        this.genWater();
        this.genTallGrass();
        this.genTreeTrunk();
        this.genTreeTop();
        this.genFence();
        this.genBuildingWall();
        this.genBuildingRoof();
        this.genDoor();
        this.genFlower();
        this.genSign();
        this.genBridge();
        this.genStairs();
        this.genRoofRed();
        Logger.debug('PreloaderScene', '15 tile textures generated');
    }

    /** tile_grass - green field with subtle darker/lighter pixel noise */
    private genGrass(): void {
        const { ctx, ct } = this.makeTile('tile_grass');
        this.dr(ctx, 0, 0, T, T, COLORS.GRASS);
        const dk = COLORS.GRASS_DARK;
        const lt = 0x6b9c4e;
        // darker noise
        const darkPx: number[][] = [
            [2,3],[7,1],[12,5],[4,9],[10,11],[1,14],[14,8],[6,13],
            [9,2],[3,7],[0,7],[15,0],[13,12],[8,15],[5,6],
        ];
        for (const [x, y] of darkPx) { this.dp(ctx, x, y, dk); }
        // lighter noise
        const ltPx: number[][] = [[5,2],[11,7],[3,12],[13,14],[8,6],[0,10],[15,4]];
        for (const [x, y] of ltPx) { this.dp(ctx, x, y, lt); }
        ct.refresh();
    }

    /** tile_path - tan/beige dirt with scattered darker spots and pebbles */
    private genPath(): void {
        const { ctx, ct } = this.makeTile('tile_path');
        this.dr(ctx, 0, 0, T, T, COLORS.PATH);
        const dk = COLORS.PATH_DARK;
        const dkPx: number[][] = [
            [1,2],[5,4],[10,1],[14,6],[3,8],[8,10],[12,13],[2,14],
            [7,7],[11,3],[0,5],[15,12],[5,0],[9,15],
        ];
        for (const [x, y] of dkPx) { this.dp(ctx, x, y, dk); }
        // lighter pebble specks
        const lt = 0xd8c488;
        const ltPx: number[][] = [[6,3],[11,10],[2,6],[14,1],[9,8]];
        for (const [x, y] of ltPx) { this.dp(ctx, x, y, lt); }
        // small stone
        this.dp(ctx, 7, 14, 0x999988);
        this.dp(ctx, 13, 5, 0x999988);
        ct.refresh();
    }

    /** tile_water - blue base with horizontal wave highlights */
    private genWater(): void {
        const { ctx, ct } = this.makeTile('tile_water');
        this.dr(ctx, 0, 0, T, T, COLORS.WATER);
        const hi = COLORS.WATER_LIGHT;
        const dk = 0x2a6ebf;
        // wave row 1
        this.dr(ctx, 1, 2, 4, 1, hi);
        this.dr(ctx, 7, 3, 4, 1, hi);
        this.dr(ctx, 13, 2, 3, 1, hi);
        // wave row 2
        this.dr(ctx, 0, 7, 3, 1, hi);
        this.dr(ctx, 5, 8, 5, 1, hi);
        this.dr(ctx, 12, 7, 4, 1, hi);
        // wave row 3
        this.dr(ctx, 2, 12, 4, 1, hi);
        this.dr(ctx, 8, 13, 4, 1, hi);
        this.dr(ctx, 14, 12, 2, 1, hi);
        // darker between waves
        this.dp(ctx, 5, 5, dk);
        this.dp(ctx, 11, 10, dk);
        this.dp(ctx, 3, 15, dk);
        this.dp(ctx, 9, 0, dk);
        this.dp(ctx, 14, 5, dk);
        ct.refresh();
    }

    /** tile_tall_grass - dark green with visible upward grass blade strokes */
    private genTallGrass(): void {
        const { ctx, ct } = this.makeTile('tile_tall_grass');
        // darker base
        this.dr(ctx, 0, 0, T, T, 0x2d5e18);
        const tg = COLORS.TALL_GRASS;
        const lg = COLORS.GRASS;
        // V-shaped blade at x=2
        this.dp(ctx, 2, 2, lg); this.dp(ctx, 1, 3, tg); this.dp(ctx, 3, 3, tg);
        this.dp(ctx, 0, 4, tg); this.dp(ctx, 4, 4, tg);
        // V-shaped blade at x=7
        this.dp(ctx, 7, 1, lg); this.dp(ctx, 6, 2, tg); this.dp(ctx, 8, 2, tg);
        this.dp(ctx, 5, 3, tg); this.dp(ctx, 9, 3, tg);
        // V-shaped blade at x=12
        this.dp(ctx, 12, 0, lg); this.dp(ctx, 11, 1, tg); this.dp(ctx, 13, 1, tg);
        this.dp(ctx, 10, 2, tg); this.dp(ctx, 14, 2, tg);
        // smaller blade at x=4
        this.dp(ctx, 4, 7, lg); this.dp(ctx, 3, 8, tg); this.dp(ctx, 5, 8, tg);
        // smaller blade at x=10
        this.dp(ctx, 10, 6, lg); this.dp(ctx, 9, 7, tg); this.dp(ctx, 11, 7, tg);
        // vertical blade strokes from bottom
        this.dr(ctx, 1, 6, 1, 10, tg);
        this.dr(ctx, 5, 5, 1, 11, tg);
        this.dr(ctx, 9, 4, 1, 12, tg);
        this.dr(ctx, 13, 3, 1, 13, tg);
        this.dr(ctx, 15, 5, 1, 11, tg);
        // bright tips
        this.dp(ctx, 7, 0, 0x7bcc5e);
        this.dp(ctx, 2, 1, 0x7bcc5e);
        ct.refresh();
    }

    /** tile_tree_trunk - grass base with centred brown trunk and bark detail */
    private genTreeTrunk(): void {
        const { ctx, ct } = this.makeTile('tile_tree_trunk');
        // grass bg
        this.dr(ctx, 0, 0, T, T, COLORS.GRASS);
        // shadow at base
        this.dr(ctx, 3, 12, 10, 4, COLORS.GRASS_DARK);
        // trunk (6px wide, full height)
        this.dr(ctx, 5, 0, 6, 16, COLORS.TREE_TRUNK);
        // bark darker lines
        this.dr(ctx, 6, 0, 1, 16, 0x5a3216);
        this.dr(ctx, 9, 0, 1, 16, 0x5a3216);
        // bark highlight
        this.dr(ctx, 7, 0, 1, 16, 0x7b5236);
        // knot detail
        this.dp(ctx, 7, 5, 0x5a3216);
        this.dp(ctx, 8, 5, 0x5a3216);
        this.dp(ctx, 8, 10, 0x5a3216);
        // roots
        this.dp(ctx, 4, 14, COLORS.TREE_TRUNK);
        this.dp(ctx, 4, 15, COLORS.TREE_TRUNK);
        this.dp(ctx, 11, 14, COLORS.TREE_TRUNK);
        this.dp(ctx, 11, 15, COLORS.TREE_TRUNK);
        // grass noise
        this.dp(ctx, 2, 10, COLORS.GRASS_DARK);
        this.dp(ctx, 13, 8, COLORS.GRASS_DARK);
        ct.refresh();
    }

    /** tile_tree_top - dark green circular canopy filling the tile */
    private genTreeTop(): void {
        const { ctx, ct } = this.makeTile('tile_tree_top');
        const lv = COLORS.TREE_LEAVES;
        // rounded canopy shape
        this.dr(ctx, 4, 0, 8, 1, lv);
        this.dr(ctx, 2, 1, 12, 1, lv);
        this.dr(ctx, 1, 2, 14, 2, lv);
        this.dr(ctx, 0, 4, 16, 8, lv);
        this.dr(ctx, 1, 12, 14, 2, lv);
        this.dr(ctx, 2, 14, 12, 1, lv);
        this.dr(ctx, 4, 15, 8, 1, lv);
        // lighter highlight patches
        const hi = 0x3d8e2e;
        this.dr(ctx, 4, 3, 3, 2, hi);
        this.dr(ctx, 9, 5, 4, 2, hi);
        this.dr(ctx, 3, 8, 2, 2, hi);
        this.dr(ctx, 10, 10, 3, 2, hi);
        this.dr(ctx, 6, 12, 2, 1, hi);
        // bright specks
        this.dp(ctx, 5, 4, 0x4dae3e);
        this.dp(ctx, 10, 6, 0x4dae3e);
        this.dp(ctx, 4, 9, 0x4dae3e);
        // darker shadow in centre
        this.dp(ctx, 7, 7, 0x1d5e0e);
        this.dp(ctx, 8, 8, 0x1d5e0e);
        ct.refresh();
    }

    /** tile_fence - grass base with two vertical posts and two horizontal rails */
    private genFence(): void {
        const { ctx, ct } = this.makeTile('tile_fence');
        this.dr(ctx, 0, 0, T, T, COLORS.GRASS);
        const fc = COLORS.FENCE;
        // posts
        this.dr(ctx, 1, 2, 2, 12, fc);
        this.dr(ctx, 13, 2, 2, 12, fc);
        // horizontal rails
        this.dr(ctx, 0, 4, T, 2, fc);
        this.dr(ctx, 0, 10, T, 2, fc);
        // post caps (lighter)
        this.dr(ctx, 1, 1, 2, 1, 0x6a5a4a);
        this.dr(ctx, 13, 1, 2, 1, 0x6a5a4a);
        // nail details (dark)
        this.dp(ctx, 4, 5, 0x3a2a1a);
        this.dp(ctx, 9, 5, 0x3a2a1a);
        this.dp(ctx, 5, 11, 0x3a2a1a);
        this.dp(ctx, 11, 11, 0x3a2a1a);
        // grass peeking
        this.dp(ctx, 7, 14, COLORS.GRASS_DARK);
        ct.refresh();
    }

    /** tile_building_wall - stone wall with brick mortar pattern */
    private genBuildingWall(): void {
        const { ctx, ct } = this.makeTile('tile_building_wall');
        this.dr(ctx, 0, 0, T, T, COLORS.BUILDING_WALL);
        const m = 0x6a5a4a; // mortar
        // horizontal mortar lines
        this.dr(ctx, 0, 4, T, 1, m);
        this.dr(ctx, 0, 8, T, 1, m);
        this.dr(ctx, 0, 12, T, 1, m);
        // vertical mortar - row 0 pattern
        this.dr(ctx, 8, 0, 1, 4, m);
        // row 1 offset
        this.dr(ctx, 0, 5, 1, 3, m);
        this.dr(ctx, 4, 5, 1, 3, m);
        this.dr(ctx, 12, 5, 1, 3, m);
        // row 2 same as row 0
        this.dr(ctx, 8, 9, 1, 3, m);
        // row 3 offset
        this.dr(ctx, 4, 13, 1, 3, m);
        this.dr(ctx, 12, 13, 1, 3, m);
        // brick highlights
        this.dp(ctx, 2, 1, 0x9a8a7a);
        this.dp(ctx, 10, 6, 0x9a8a7a);
        this.dp(ctx, 6, 10, 0x9a8a7a);
        this.dp(ctx, 1, 14, 0x9a8a7a);
        ct.refresh();
    }

    /** tile_building_roof - dark brown with horizontal shingle rows */
    private genBuildingRoof(): void {
        const { ctx, ct } = this.makeTile('tile_building_roof');
        this.dr(ctx, 0, 0, T, T, COLORS.BUILDING_ROOF);
        const ridge = 0x5a4a3e;
        const shadow = 0x3a2a1e;
        // shingle row lines (lighter ridge, darker shadow)
        for (let row = 0; row < 4; row++) {
            const y = row * 4;
            this.dr(ctx, 0, y, T, 1, ridge);
            this.dr(ctx, 0, y + 3, T, 1, shadow);
        }
        // staggered vertical edges
        this.dr(ctx, 4, 0, 1, 4, ridge);
        this.dr(ctx, 12, 0, 1, 4, ridge);
        this.dr(ctx, 0, 4, 1, 4, ridge);
        this.dr(ctx, 8, 4, 1, 4, ridge);
        this.dr(ctx, 4, 8, 1, 4, ridge);
        this.dr(ctx, 12, 8, 1, 4, ridge);
        this.dr(ctx, 0, 12, 1, 4, ridge);
        this.dr(ctx, 8, 12, 1, 4, ridge);
        ct.refresh();
    }

    /** tile_door - brown wooden door with frame and gold handle */
    private genDoor(): void {
        const { ctx, ct } = this.makeTile('tile_door');
        // frame
        this.dr(ctx, 0, 0, T, T, 0x7a5a3a);
        // door panel
        this.dr(ctx, 2, 1, 12, 15, COLORS.DOOR);
        // top frame bar
        this.dr(ctx, 0, 0, T, 1, 0x8a6a4a);
        // side frames
        this.dr(ctx, 0, 0, 2, T, 0x8a6a4a);
        this.dr(ctx, 14, 0, 2, T, 0x8a6a4a);
        // centre divider
        this.dr(ctx, 7, 1, 2, 15, 0x7a5a3a);
        // darker recessed panels
        this.dr(ctx, 3, 2, 4, 13, 0x4a2a0a);
        this.dr(ctx, 9, 2, 4, 13, 0x4a2a0a);
        // panel detail lines
        this.dp(ctx, 4, 5, 0x5a3a1a);
        this.dp(ctx, 10, 5, 0x5a3a1a);
        this.dp(ctx, 4, 10, 0x5a3a1a);
        this.dp(ctx, 10, 10, 0x5a3a1a);
        // gold door handle
        this.dr(ctx, 10, 8, 2, 2, P_BELT);
        this.dp(ctx, 11, 9, P_BELT_HI);
        ct.refresh();
    }

    /** tile_flower - grass base with small colourful cross-shaped flowers */
    private genFlower(): void {
        const { ctx, ct } = this.makeTile('tile_flower');
        this.dr(ctx, 0, 0, T, T, COLORS.GRASS);
        // grass noise
        this.dp(ctx, 3, 5, COLORS.GRASS_DARK);
        this.dp(ctx, 10, 2, COLORS.GRASS_DARK);
        this.dp(ctx, 7, 12, COLORS.GRASS_DARK);
        // red flower cross at (3,4)
        this.dp(ctx, 3, 3, 0xee3333);
        this.dp(ctx, 2, 4, 0xee3333);
        this.dp(ctx, 3, 4, 0xff5555);
        this.dp(ctx, 4, 4, 0xee3333);
        this.dp(ctx, 3, 5, 0xee3333);
        this.dr(ctx, 3, 6, 1, 2, 0x2d6e1e); // stem
        // yellow flower cross at (10,8)
        this.dp(ctx, 10, 7, 0xffdd33);
        this.dp(ctx, 9, 8, 0xffdd33);
        this.dp(ctx, 10, 8, 0xffee55);
        this.dp(ctx, 11, 8, 0xffdd33);
        this.dp(ctx, 10, 9, 0xffdd33);
        this.dr(ctx, 10, 10, 1, 2, 0x2d6e1e);
        // white flower at (7,2)
        this.dp(ctx, 7, 1, 0xffffff);
        this.dp(ctx, 6, 2, 0xffffff);
        this.dp(ctx, 7, 2, 0xffdd33); // centre
        this.dp(ctx, 8, 2, 0xffffff);
        this.dp(ctx, 7, 3, 0xffffff);
        this.dr(ctx, 7, 4, 1, 2, 0x2d6e1e);
        // pink dot flower at (13,12)
        this.dp(ctx, 13, 11, 0xee5599);
        this.dp(ctx, 12, 12, 0xee5599);
        this.dp(ctx, 13, 12, 0xff77bb);
        this.dp(ctx, 14, 12, 0xee5599);
        this.dr(ctx, 13, 13, 1, 2, 0x2d6e1e);
        ct.refresh();
    }

    /** tile_sign - grass base with wooden post and sign board */
    private genSign(): void {
        const { ctx, ct } = this.makeTile('tile_sign');
        this.dr(ctx, 0, 0, T, T, COLORS.GRASS);
        this.dp(ctx, 3, 13, COLORS.GRASS_DARK);
        this.dp(ctx, 12, 11, COLORS.GRASS_DARK);
        // vertical post
        this.dr(ctx, 7, 6, 2, 10, 0x6b4226);
        // sign board
        this.dr(ctx, 2, 1, 12, 6, 0x8b6914);
        // board border
        this.dr(ctx, 2, 1, 12, 1, 0x6b4226);
        this.dr(ctx, 2, 6, 12, 1, 0x6b4226);
        this.dr(ctx, 2, 1, 1, 6, 0x6b4226);
        this.dr(ctx, 13, 1, 1, 6, 0x6b4226);
        // text lines
        this.dr(ctx, 4, 3, 5, 1, 0x333333);
        this.dr(ctx, 4, 5, 3, 1, 0x333333);
        ct.refresh();
    }

    /** tile_bridge - horizontal wooden planks over water with side rails */
    private genBridge(): void {
        const { ctx, ct } = this.makeTile('tile_bridge');
        // water peeking through gaps
        this.dr(ctx, 0, 0, T, T, COLORS.WATER);
        const plank = 0x8b6914;
        const grain = 0x7b5904;
        const gap = 0x5b3904;
        // 4 planks
        this.dr(ctx, 0, 0, T, 3, plank);
        this.dr(ctx, 0, 4, T, 3, plank);
        this.dr(ctx, 0, 8, T, 3, plank);
        this.dr(ctx, 0, 12, T, 3, plank);
        // grain detail per plank
        this.dr(ctx, 3, 1, 4, 1, grain);
        this.dr(ctx, 10, 5, 3, 1, grain);
        this.dr(ctx, 1, 9, 5, 1, grain);
        this.dr(ctx, 8, 13, 4, 1, grain);
        // dark gap lines between planks
        this.dr(ctx, 0, 3, T, 1, gap);
        this.dr(ctx, 0, 7, T, 1, gap);
        this.dr(ctx, 0, 11, T, 1, gap);
        this.dr(ctx, 0, 15, T, 1, gap);
        // side rails
        this.dr(ctx, 0, 0, 1, T, 0x6b4226);
        this.dr(ctx, 15, 0, 1, T, 0x6b4226);
        ct.refresh();
    }

    /** tile_stairs - alternating light/dark stone steps */
    private genStairs(): void {
        const { ctx, ct } = this.makeTile('tile_stairs');
        this.dr(ctx, 0, 0, T, T, 0x888888);
        const STEP_H = 4;
        for (let row = 0; row < 4; row++) {
            const y = row * STEP_H;
            // step top highlight
            this.dr(ctx, 0, y, T, 1, 0x999999);
            // step face alternating shade
            this.dr(ctx, 0, y + 1, T, STEP_H - 2, row % 2 === 0 ? 0x7a7a7a : 0x6a6a6a);
            // shadow at bottom of step
            this.dr(ctx, 0, y + STEP_H - 1, T, 1, 0x555555);
        }
        // crack details
        this.dp(ctx, 5, 1, 0x666666);
        this.dp(ctx, 11, 6, 0x666666);
        this.dp(ctx, 3, 10, 0x666666);
        this.dp(ctx, 13, 14, 0x666666);
        ct.refresh();
    }

    /** tile_roof_red - Korean-style red roof tiles with ridge pattern */
    private genRoofRed(): void {
        const { ctx, ct } = this.makeTile('tile_roof_red');
        this.dr(ctx, 0, 0, T, T, COLORS.BUILDING_ROOF_RED);
        const dk = 0x7b2a2a;
        const hi = 0x9b4a4a;
        // horizontal ridge lines
        this.dr(ctx, 0, 3, T, 1, dk);
        this.dr(ctx, 0, 7, T, 1, dk);
        this.dr(ctx, 0, 11, T, 1, dk);
        this.dr(ctx, 0, 15, T, 1, dk);
        // tile curve highlights
        this.dr(ctx, 2, 1, 4, 1, hi);
        this.dr(ctx, 10, 1, 4, 1, hi);
        this.dr(ctx, 6, 5, 4, 1, hi);
        this.dr(ctx, 14, 5, 2, 1, hi);
        this.dr(ctx, 0, 5, 2, 1, hi);
        this.dr(ctx, 2, 9, 4, 1, hi);
        this.dr(ctx, 10, 9, 4, 1, hi);
        this.dr(ctx, 6, 13, 4, 1, hi);
        // staggered vertical dividers
        this.dr(ctx, 4, 0, 1, 3, dk);
        this.dr(ctx, 12, 0, 1, 3, dk);
        this.dr(ctx, 0, 4, 1, 3, dk);
        this.dr(ctx, 8, 4, 1, 3, dk);
        this.dr(ctx, 4, 8, 1, 3, dk);
        this.dr(ctx, 12, 8, 1, 3, dk);
        this.dr(ctx, 0, 12, 1, 3, dk);
        this.dr(ctx, 8, 12, 1, 3, dk);
        ct.refresh();
    }

    // ----------------------------------------------------------------
    //  Player spritesheet  (48 x 64, 3 cols x 4 rows of 16x16 frames)
    // ----------------------------------------------------------------

    /**
     * Generate the player spritesheet as a single canvas texture
     * with 12 frames arranged in a 3x4 grid:
     *   Row 0 = down,  Row 1 = up,  Row 2 = left,  Row 3 = right
     *   Col 0 = stand, Col 1 = walk-A, Col 2 = walk-B
     */
    private generatePlayerSpritesheet(): void {
        const sw = SHEET_COLS * T; // 48
        const sh = SHEET_ROWS * T; // 64
        const ct = this.textures.createCanvas('player_sheet', sw, sh);
        if (!ct) {
            throw new Error('Failed to create player_sheet canvas texture');
        }
        const ctx = ct.getContext();

        // Draw all 12 frames
        for (let row = 0; row < SHEET_ROWS; row++) {
            for (let col = 0; col < SHEET_COLS; col++) {
                const ox = col * T;
                const oy = row * T;
                this.drawPlayerFrame(ctx, ox, oy, row, col);
            }
        }

        ct.refresh();

        // Register individual numbered frames for animation system
        const tex = this.textures.get('player_sheet');
        let idx = 0;
        for (let row = 0; row < SHEET_ROWS; row++) {
            for (let col = 0; col < SHEET_COLS; col++) {
                tex.add(idx, 0, col * T, row * T, T, T);
                idx++;
            }
        }

        Logger.debug('PreloaderScene', 'Player spritesheet generated (12 frames)');
    }

    /**
     * Draw a single 16x16 player frame onto the spritesheet canvas.
     * @param ctx - 2D canvas rendering context
     * @param ox - X pixel offset for this frame
     * @param oy - Y pixel offset for this frame
     * @param dir - Direction row (0=down, 1=up, 2=left, 3=right)
     * @param frame - Animation column (0=stand, 1=walk-A, 2=walk-B)
     */
    private drawPlayerFrame(
        ctx: CanvasRenderingContext2D,
        ox: number, oy: number,
        dir: number, frame: number,
    ): void {
        switch (dir) {
            case 0: this.drawPlayerDown(ctx, ox, oy, frame); break;
            case 1: this.drawPlayerUp(ctx, ox, oy, frame); break;
            case 2: this.drawPlayerLeft(ctx, ox, oy, frame); break;
            case 3: this.drawPlayerRight(ctx, ox, oy, frame); break;
        }
    }

    /**
     * Draw the player facing down (front view).
     * Large head with hair and eyes, blue outfit, legs animate per frame.
     */
    private drawPlayerDown(
        ctx: CanvasRenderingContext2D,
        ox: number, oy: number, frame: number,
    ): void {
        // Hair
        this.dr(ctx, ox + 3, oy + 1, 10, 3, P_HAIR);
        this.dp(ctx, ox + 7, oy + 1, P_HAIR_HI);
        // Face
        this.dr(ctx, ox + 3, oy + 4, 10, 3, P_SKIN);
        // Eyes
        this.dp(ctx, ox + 5, oy + 5, P_EYE);
        this.dp(ctx, ox + 10, oy + 5, P_EYE);
        // Body
        this.dr(ctx, ox + 4, oy + 7, 8, 3, P_SHIRT);
        this.dp(ctx, ox + 7, oy + 8, P_SHIRT_DK); // fold
        // Belt
        this.dr(ctx, ox + 4, oy + 10, 8, 1, P_BELT);
        this.dp(ctx, ox + 8, oy + 10, P_BELT_HI);
        // Legs & feet vary by walk frame
        const legL = frame === 1 ? -1 : 0;
        const legR = frame === 2 ? 1 : 0;
        // left leg
        this.dr(ctx, ox + 4 + legL, oy + 11, 3, 3, P_PANTS);
        this.dr(ctx, ox + 4 + legL, oy + 13, 3, 1, P_BOOT);
        // right leg
        this.dr(ctx, ox + 9 + legR, oy + 11, 3, 3, P_PANTS);
        this.dr(ctx, ox + 9 + legR, oy + 13, 3, 1, P_BOOT);
    }

    /**
     * Draw the player facing up (back view).
     * More hair visible, no facial features.
     */
    private drawPlayerUp(
        ctx: CanvasRenderingContext2D,
        ox: number, oy: number, frame: number,
    ): void {
        // Hair (covers entire back of head - taller)
        this.dr(ctx, ox + 3, oy + 1, 10, 4, P_HAIR);
        this.dp(ctx, ox + 6, oy + 2, P_HAIR_HI);
        // Tiny neck
        this.dr(ctx, ox + 5, oy + 5, 6, 1, P_SKIN);
        // Back of collar
        this.dr(ctx, ox + 5, oy + 6, 6, 1, 0xeeddcc);
        // Body
        this.dr(ctx, ox + 4, oy + 7, 8, 3, P_SHIRT);
        this.dp(ctx, ox + 8, oy + 8, P_SHIRT_DK);
        // Belt
        this.dr(ctx, ox + 4, oy + 10, 8, 1, P_BELT);
        // Legs & feet
        const legL = frame === 1 ? -1 : 0;
        const legR = frame === 2 ? 1 : 0;
        this.dr(ctx, ox + 4 + legL, oy + 11, 3, 3, P_PANTS);
        this.dr(ctx, ox + 4 + legL, oy + 13, 3, 1, P_BOOT);
        this.dr(ctx, ox + 9 + legR, oy + 11, 3, 3, P_PANTS);
        this.dr(ctx, ox + 9 + legR, oy + 13, 3, 1, P_BOOT);
    }

    /**
     * Draw the player facing left (profile).
     * Narrower body, one eye visible, arm on left side.
     */
    private drawPlayerLeft(
        ctx: CanvasRenderingContext2D,
        ox: number, oy: number, frame: number,
    ): void {
        // Hair (profile, shifted left)
        this.dr(ctx, ox + 3, oy + 1, 9, 3, P_HAIR);
        this.dp(ctx, ox + 5, oy + 1, P_HAIR_HI);
        // Face (profile, extends left)
        this.dr(ctx, ox + 2, oy + 4, 9, 3, P_SKIN);
        // One eye
        this.dp(ctx, ox + 4, oy + 5, P_EYE);
        // Body (narrower)
        this.dr(ctx, ox + 4, oy + 7, 7, 3, P_SHIRT);
        // Arm
        this.dr(ctx, ox + 3, oy + 7, 1, 4, P_SHIRT_DK);
        // Belt
        this.dr(ctx, ox + 4, oy + 10, 7, 1, P_BELT);
        // Legs - for left walking, legs spread front-back
        if (frame === 0) {
            // stand: legs together
            this.dr(ctx, ox + 5, oy + 11, 4, 3, P_PANTS);
            this.dr(ctx, ox + 5, oy + 13, 4, 1, P_BOOT);
        } else if (frame === 1) {
            // walk A: legs apart
            this.dr(ctx, ox + 3, oy + 11, 3, 3, P_PANTS);
            this.dr(ctx, ox + 3, oy + 13, 3, 1, P_BOOT);
            this.dr(ctx, ox + 8, oy + 11, 3, 3, P_PANTS);
            this.dr(ctx, ox + 8, oy + 13, 3, 1, P_BOOT);
        } else {
            // walk B: legs apart (opposite emphasis)
            this.dr(ctx, ox + 3, oy + 11, 3, 2, P_PANTS);
            this.dr(ctx, ox + 3, oy + 12, 3, 1, P_BOOT);
            this.dr(ctx, ox + 8, oy + 11, 3, 3, P_PANTS);
            this.dr(ctx, ox + 8, oy + 13, 3, 1, P_BOOT);
        }
    }

    /**
     * Draw the player facing right (mirrored profile).
     * Narrower body, one eye visible, arm on right side.
     */
    private drawPlayerRight(
        ctx: CanvasRenderingContext2D,
        ox: number, oy: number, frame: number,
    ): void {
        // Hair (profile, shifted right)
        this.dr(ctx, ox + 4, oy + 1, 9, 3, P_HAIR);
        this.dp(ctx, ox + 10, oy + 1, P_HAIR_HI);
        // Face (profile, extends right)
        this.dr(ctx, ox + 5, oy + 4, 9, 3, P_SKIN);
        // One eye
        this.dp(ctx, ox + 11, oy + 5, P_EYE);
        // Body (narrower)
        this.dr(ctx, ox + 5, oy + 7, 7, 3, P_SHIRT);
        // Arm
        this.dr(ctx, ox + 12, oy + 7, 1, 4, P_SHIRT_DK);
        // Belt
        this.dr(ctx, ox + 5, oy + 10, 7, 1, P_BELT);
        // Legs - mirror of left
        if (frame === 0) {
            this.dr(ctx, ox + 7, oy + 11, 4, 3, P_PANTS);
            this.dr(ctx, ox + 7, oy + 13, 4, 1, P_BOOT);
        } else if (frame === 1) {
            this.dr(ctx, ox + 5, oy + 11, 3, 3, P_PANTS);
            this.dr(ctx, ox + 5, oy + 13, 3, 1, P_BOOT);
            this.dr(ctx, ox + 10, oy + 11, 3, 3, P_PANTS);
            this.dr(ctx, ox + 10, oy + 13, 3, 1, P_BOOT);
        } else {
            this.dr(ctx, ox + 5, oy + 11, 3, 3, P_PANTS);
            this.dr(ctx, ox + 5, oy + 13, 3, 1, P_BOOT);
            this.dr(ctx, ox + 10, oy + 11, 3, 2, P_PANTS);
            this.dr(ctx, ox + 10, oy + 12, 3, 1, P_BOOT);
        }
    }

    // ----------------------------------------------------------------
    //  NPC textures  (16x16 single frames)
    // ----------------------------------------------------------------

    /** Generate the four NPC textures (npc_1 .. npc_4) */
    private generateNPCTextures(): void {
        for (let i = 0; i < NPC_PALETTES.length; i++) {
            const [body, accent, hair, hat] = NPC_PALETTES[i];
            this.drawNPC(`npc_${i + 1}`, body, accent, hair, hat);
        }
        Logger.debug('PreloaderScene', '4 NPC textures generated');
    }

    /**
     * Draw a single NPC texture (16x16, facing down).
     * @param key - Texture key to register
     * @param body - Main outfit colour
     * @param accent - Belt/sash accent colour
     * @param hair - Hair colour
     * @param hat - Hat/headwear colour
     */
    private drawNPC(
        key: string,
        body: number, accent: number,
        hair: number, hat: number,
    ): void {
        const ct = this.textures.createCanvas(key, T, T);
        if (!ct) {
            throw new Error(`Failed to create NPC canvas texture: ${key}`);
        }
        const ctx = ct.getContext();

        // Hat
        this.dr(ctx, 3, 0, 10, 2, hat);
        // Hair under hat
        this.dr(ctx, 4, 2, 8, 1, hair);
        // Face
        this.dr(ctx, 3, 3, 10, 3, P_SKIN);
        // Eyes
        this.dp(ctx, 5, 4, P_EYE);
        this.dp(ctx, 10, 4, P_EYE);
        // Body
        this.dr(ctx, 4, 6, 8, 4, body);
        // Accent sash
        this.dr(ctx, 4, 9, 8, 1, accent);
        // Legs
        this.dr(ctx, 4, 10, 3, 4, this.darken(body, 0.75));
        this.dr(ctx, 9, 10, 3, 4, this.darken(body, 0.75));
        // Feet
        this.dr(ctx, 4, 13, 3, 1, P_BOOT);
        this.dr(ctx, 9, 13, 3, 1, P_BOOT);

        ct.refresh();
    }

    // ----------------------------------------------------------------
    //  Animations
    // ----------------------------------------------------------------

    /**
     * Create all 8 player animations (4 walk + 4 idle) using
     * numbered frames from the player_sheet spritesheet.
     */
    private createAnimations(): void {
        const dirs: { name: string; base: number }[] = [
            { name: 'down', base: 0 },
            { name: 'up', base: 3 },
            { name: 'left', base: 6 },
            { name: 'right', base: 9 },
        ];

        for (const { name, base } of dirs) {
            // Walk: cycle walk-A, stand, walk-B, stand
            this.anims.create({
                key: `player_walk_${name}`,
                frames: this.anims.generateFrameNumbers('player_sheet', {
                    frames: [base + 1, base, base + 2, base],
                }),
                frameRate: WALK_FPS,
                repeat: -1,
            });

            // Idle: single standing frame
            this.anims.create({
                key: `player_idle_${name}`,
                frames: [{ key: 'player_sheet', frame: base }],
                frameRate: 1,
                repeat: 0,
            });
        }

        Logger.debug('PreloaderScene', '8 player animations created (4 walk + 4 idle)');
    }

    // ----------------------------------------------------------------
    //  Utility
    // ----------------------------------------------------------------

    /**
     * Darken a hex colour by a multiplicative factor.
     * @param color - Source colour (0xRRGGBB)
     * @param factor - 0.0 = black, 1.0 = unchanged
     * @returns Darkened colour value
     */
    private darken(color: number, factor: number): number {
        const r = Math.floor(((color >> 16) & 0xff) * factor);
        const g = Math.floor(((color >> 8) & 0xff) * factor);
        const b = Math.floor((color & 0xff) * factor);
        return (r << 16) | (g << 8) | b;
    }
}
