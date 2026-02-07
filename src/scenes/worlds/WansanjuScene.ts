import { BaseScene } from '../BaseScene';
import { SCENES, TILE_SIZE, CAMERA_ZOOM, TILE, DEPTH, COMBAT } from '../../utils/Constants';
import { TileMapManager, IMapData } from '../../systems/TileMapManager';
import { Player } from '../../entities/Player';
import { Logger } from '../../utils/Logger';

/** Default spawn grid coordinates */
const DEFAULT_X = 22;
const DEFAULT_Y = 30;

/** Map dimensions in tiles */
const MAP_WIDTH = 45;
const MAP_HEIGHT = 35;

/** Encounter enemy data for random battles */
interface IEncounterEnemy {
    enemyName: string;
    enemyNameKo: string;
    enemyHp: number;
    enemyAtk: number;
    enemyDef: number;
    enemyExp: number;
    enemyGold: [number, number];
    returnScene: string;
}

/**
 * Wansanju world scene - 완산주 (Hubaekje territory)
 * Mountain fortress under Gyeon Hwon's command. Features steep terrain
 * represented by dense trees and fences, a central fortress compound
 * with fortress walls, guard towers, and stairs.
 *
 * Layout (45 x 35 tiles):
 *  - Tree border with fence-walled fortress interior
 *  - West exit to Hub, south exit to Sangju
 *  - Gyeon Hwon's palace with red roof at fortress center
 *  - Guard towers flanking the interior
 *  - Stairs indicating elevation changes within the fortress
 *  - Tall grass encounter zones in mountain foothills
 */
export class WansanjuScene extends BaseScene {
    private tileMap!: TileMapManager;
    private player!: Player;

    constructor() {
        super(SCENES.WANSANJU);
    }

    /**
     * Build the Wansanju scene.
     * @param data Optional spawn position from scene transition
     */
    create(data?: { playerX?: number; playerY?: number }): void {
        Logger.info('WansanjuScene', 'Creating Wansanju mountain fortress (완산주)');

        const mapData: IMapData = this.getMapData();
        this.tileMap = new TileMapManager(this, mapData);
        this.tileMap.renderMap();

        const startX = data?.playerX ?? DEFAULT_X;
        const startY = data?.playerY ?? DEFAULT_Y;
        this.player = new Player(this, startX, startY);
        this.player.setWalkabilityChecker((gx: number, gy: number) => this.tileMap.isTileWalkable(gx, gy));

        this.cameras.main.setZoom(CAMERA_ZOOM);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, this.tileMap.getWorldWidth(), this.tileMap.getWorldHeight());

        this.events.on('player_stepped', this.onPlayerStepped, this);
        this.events.on('player_interact', this.onPlayerInteract, this);

        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('area_changed', '완산주');

        this.fadeIn();
    }

    /** Per-frame update: delegates to the player */
    update(_time: number, _delta: number): void {
        this.player.update();
    }

    /** Check exits and encounter tiles on each player step */
    private onPlayerStepped(gx: number, gy: number): void {
        const exit = this.tileMap.getExit(gx, gy);
        if (exit) {
            const gameScene = this.scene.get(SCENES.GAME);
            gameScene.events.emit('change_world', exit.targetScene, {
                playerX: exit.targetX,
                playerY: exit.targetY,
            });
            return;
        }

        if (this.tileMap.isEncounterTile(gx, gy)) {
            if (Math.random() < COMBAT.ENCOUNTER_RATE) {
                this.startRandomBattle();
            }
        }
    }

    /** Trigger NPC dialogue on interact */
    private onPlayerInteract(gx: number, gy: number): void {
        const npc = this.tileMap.getNPCAt(gx, gy);
        if (npc && npc.dialogueId) {
            const uiScene = this.scene.get(SCENES.UI);
            uiScene.events.emit('show_dialogue_line', {
                speaker: npc.name,
                text: this.getNPCDialogue(npc.npcId),
                speakerColor: '#ffd700',
            });
        }
    }

    /** Roll a random battle from the local enemy pool */
    private startRandomBattle(): void {
        const enemies = this.getAreaEnemies();
        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('start_battle', enemy);
    }

    /** Rebel soldiers patrol the mountain paths */
    private getAreaEnemies(): IEncounterEnemy[] {
        return [
            {
                enemyName: 'rebel_soldier',
                enemyNameKo: '반란군 병사',
                enemyHp: 45,
                enemyAtk: 9,
                enemyDef: 4,
                enemyExp: 25,
                enemyGold: [10, 25] as [number, number],
                returnScene: SCENES.WANSANJU,
            },
        ];
    }

    /**
     * Return dialogue text for a Wansanju NPC.
     * @param npcId The unique NPC identifier
     */
    private getNPCDialogue(npcId: string): string {
        const dialogues: Record<string, string> = {
            gyeon_hwon: '후백제의 견훤이다. 이 산성은 난공불락이지. 누구든 도전하려면 각오하시오.',
            fortress_guard: '이곳은 완산주 요새입니다. 허가 없이는 통행할 수 없소. 견훤 대왕의 명이오.',
        };
        return dialogues[npcId] ?? '...';
    }

    /**
     * Procedurally build the 45 x 35 tile map for Wansanju.
     *
     * Layout notes:
     *  - Dense tree border simulating mountain terrain
     *  - Fence-walled fortress in the center (cols 10-34, rows 8-27)
     *  - Path gates in fortress walls for entry
     *  - Gyeon Hwon's red-roof palace and flanking guard towers
     *  - Stairs marking elevation within fortress
     *  - Tall grass in mountain foothills outside walls
     */
    private getMapData(): IMapData {
        const T = TILE;
        const W = MAP_WIDTH;
        const H = MAP_HEIGHT;

        const tiles: number[][] = Array.from(
            { length: H },
            () => new Array(W).fill(T.GRASS),
        );

        const set = (x: number, y: number, t: number): void => {
            if (x >= 0 && x < W && y >= 0 && y < H) tiles[y][x] = t;
        };

        const rect = (x1: number, y1: number, x2: number, y2: number, t: number): void => {
            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    set(x, y, t);
                }
            }
        };

        /* === 1. Tree borders === */
        for (let x = 0; x < W; x++) { set(x, 0, T.TREE_TOP); set(x, 1, T.TREE_TRUNK); }
        for (let x = 0; x < W; x++) { set(x, H - 2, T.TREE_TOP); set(x, H - 1, T.TREE_TRUNK); }
        for (let y = 0; y < H; y++) { set(0, y, T.TREE_TRUNK); set(1, y, T.TREE_TRUNK); }
        for (let y = 0; y < H; y++) { set(W - 2, y, T.TREE_TRUNK); set(W - 1, y, T.TREE_TRUNK); }

        /* === 2. Additional mountain trees (north and sides) === */
        rect(2, 2, 8, 2, T.TREE_TOP);
        rect(2, 3, 8, 3, T.TREE_TRUNK);
        rect(36, 2, 42, 2, T.TREE_TOP);
        rect(36, 3, 42, 3, T.TREE_TRUNK);
        const mountainTrees: Array<[number, number]> = [
            [4, 6], [7, 5], [37, 6], [40, 5],
            [3, 10], [5, 14], [39, 10], [41, 14],
            [4, 20], [6, 24], [38, 20], [40, 24],
            [3, 28], [5, 30], [39, 28], [41, 30],
        ];
        for (const [tx, ty] of mountainTrees) {
            set(tx, ty - 1, T.TREE_TOP);
            set(tx, ty, T.TREE_TRUNK);
        }

        /* === 3. Exit gaps === */
        /* West exit (x=0-1, y=16-18) -> Hub */
        rect(0, 16, 1, 18, T.PATH);
        /* South exit (x=20-23, y=33-34) -> Sangju */
        rect(20, H - 2, 23, H - 1, T.PATH);

        /* === 4. Fortress walls (fence) === */
        /* Top wall */
        rect(10, 8, 34, 8, T.FENCE);
        /* Bottom wall */
        rect(10, 27, 34, 27, T.FENCE);
        /* Left wall */
        for (let y = 8; y <= 27; y++) set(10, y, T.FENCE);
        /* Right wall */
        for (let y = 8; y <= 27; y++) set(34, y, T.FENCE);

        /* Gate openings */
        set(22, 8, T.PATH);  set(23, 8, T.PATH);   /* North gate */
        set(22, 27, T.PATH); set(23, 27, T.PATH);   /* South gate */
        set(10, 17, T.PATH);                          /* West gate */

        /* === 5. Main paths === */
        /* West entrance to fortress */
        rect(2, 17, 10, 18, T.PATH);
        /* Vertical path through fortress */
        rect(22, 8, 23, 27, T.PATH);
        /* Horizontal path inside fortress */
        rect(11, 17, 33, 18, T.PATH);
        /* Path to south exit */
        rect(22, 27, 23, H - 2, T.PATH);

        /* === 6. Stairs (elevation markers) === */
        rect(22, 10, 23, 11, T.STAIRS);
        rect(22, 14, 23, 14, T.STAIRS);
        rect(22, 22, 23, 22, T.STAIRS);
        rect(22, 25, 23, 25, T.STAIRS);

        /* === 7. Buildings === */

        /* Gyeon Hwon's palace (red roof, cols 16-28, rows 10-13) */
        rect(16, 10, 20, 10, T.ROOF_RED);
        rect(25, 10, 28, 10, T.ROOF_RED);
        rect(16, 11, 20, 11, T.ROOF_RED);
        rect(25, 11, 28, 11, T.ROOF_RED);
        rect(16, 12, 20, 13, T.BUILDING_WALL);
        rect(25, 12, 28, 13, T.BUILDING_WALL);
        set(18, 13, T.DOOR);
        set(27, 13, T.DOOR);

        /* Left guard tower (cols 12-14, rows 20-23) */
        rect(12, 20, 14, 20, T.BUILDING_ROOF);
        rect(12, 21, 14, 22, T.BUILDING_WALL);
        set(13, 22, T.DOOR);

        /* Right guard tower (cols 30-32, rows 20-23) */
        rect(30, 20, 32, 20, T.BUILDING_ROOF);
        rect(30, 21, 32, 22, T.BUILDING_WALL);
        set(31, 22, T.DOOR);

        /* === 8. Tall grass (encounter zones outside fortress) === */
        rect(3, 5, 8, 10, T.TALL_GRASS);
        rect(36, 5, 41, 10, T.TALL_GRASS);
        rect(3, 22, 8, 27, T.TALL_GRASS);
        rect(36, 22, 41, 27, T.TALL_GRASS);
        rect(12, 28, 18, 31, T.TALL_GRASS);
        rect(26, 28, 32, 31, T.TALL_GRASS);

        /* === 9. Flowers (palace gardens) === */
        const flowers: Array<[number, number]> = [
            [18, 14], [27, 14], [20, 16], [25, 16],
            [15, 17], [29, 17], [15, 19], [29, 19],
        ];
        for (const [fx, fy] of flowers) set(fx, fy, T.FLOWER);

        /* === 10. Signs === */
        set(4, 17, T.SIGN);
        set(22, 9, T.SIGN);

        /* === 11. NPCs === */
        const npcs = [
            {
                npcId: 'gyeon_hwon',
                gridX: 22,
                gridY: 14,
                spriteKey: 'npc_gyeon_hwon',
                name: '견훤',
                dialogueId: 'gyeon_hwon',
            },
            {
                npcId: 'fortress_guard',
                gridX: 13,
                gridY: 23,
                spriteKey: 'npc_guard',
                name: '요새 경비병',
                dialogueId: 'fortress_guard',
            },
        ];

        /* === 12. Exits === */
        const exits = [
            /* West -> Hub (player arrives at Hub's east edge) */
            { gridX: 0, gridY: 16, targetScene: SCENES.HUB, targetX: 37, targetY: 14 },
            { gridX: 0, gridY: 17, targetScene: SCENES.HUB, targetX: 37, targetY: 14 },
            { gridX: 0, gridY: 18, targetScene: SCENES.HUB, targetX: 37, targetY: 15 },
            /* South -> Sangju (player arrives at Sangju's north edge) */
            { gridX: 20, gridY: H - 1, targetScene: SCENES.SANGJU, targetX: 21, targetY: 2 },
            { gridX: 21, gridY: H - 1, targetScene: SCENES.SANGJU, targetX: 22, targetY: 2 },
            { gridX: 22, gridY: H - 1, targetScene: SCENES.SANGJU, targetX: 22, targetY: 2 },
            { gridX: 23, gridY: H - 1, targetScene: SCENES.SANGJU, targetX: 23, targetY: 2 },
        ];

        return { width: W, height: H, tiles, npcs, exits };
    }
}
