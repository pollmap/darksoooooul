import { BaseScene } from '../BaseScene';
import { SCENES, TILE_SIZE, CAMERA_ZOOM, TILE, DEPTH, COMBAT } from '../../utils/Constants';
import { TileMapManager, IMapData } from '../../systems/TileMapManager';
import { Player } from '../../entities/Player';
import { Logger } from '../../utils/Logger';

/** Default spawn grid coordinates */
const DEFAULT_X = 5;
const DEFAULT_Y = 17;

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
 * Sangju world scene - 상주 (Trade Route)
 * A busy trade route connecting the eastern kingdoms. Long paths stretch
 * east to west with inns and market stalls along the way. Bandits lurk
 * in the tall grass alongside the road.
 *
 * Layout (45 x 35 tiles):
 *  - Tree border on all sides
 *  - West exit to Geumseong, north exit to Wansanju
 *  - Long E-W trade road through center
 *  - Inn and market buildings along the road
 *  - Tall grass encounter zones flanking the road
 *  - Two NPCs: trader and innkeeper
 */
export class SangjuScene extends BaseScene {
    private tileMap!: TileMapManager;
    private player!: Player;

    constructor() {
        super(SCENES.SANGJU);
    }

    /**
     * Build the Sangju scene.
     * @param data Optional spawn position from scene transition
     */
    create(data?: { playerX?: number; playerY?: number }): void {
        Logger.info('SangjuScene', 'Creating Sangju trade route (상주)');

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
        gameScene.events.emit('area_changed', '상주');

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

    /** Bandits prey on traders along the route */
    private getAreaEnemies(): IEncounterEnemy[] {
        return [
            {
                enemyName: 'bandit',
                enemyNameKo: '산적',
                enemyHp: 45,
                enemyAtk: 9,
                enemyDef: 3,
                enemyExp: 22,
                enemyGold: [10, 25] as [number, number],
                returnScene: SCENES.SANGJU,
            },
        ];
    }

    /**
     * Return dialogue text for a Sangju NPC.
     * @param npcId The unique NPC identifier
     */
    private getNPCDialogue(npcId: string): string {
        const dialogues: Record<string, string> = {
            trader: '삼한 곳곳의 물건을 가져왔소! 비단, 약초, 무기... 뭐든 있소. 길 조심하시오, 산적이 많소.',
            innkeeper: '먼 길 오시느라 고생하셨소. 여기서 쉬어 가시오. 밥과 잠자리를 마련해 드리겠소.',
        };
        return dialogues[npcId] ?? '...';
    }

    /**
     * Procedurally build the 45 x 35 tile map for Sangju.
     *
     * Layout notes:
     *  - Tree border on all sides
     *  - West exit to Geumseong, north exit to Wansanju
     *  - Long E-W trade road (rows 16-17) spanning the map
     *  - N-S connecting road through center to north exit
     *  - Inn building on the south side, market on the north side
     *  - Rest area with flowers near the inn
     *  - Tall grass encounter zones above and below the road
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

        /* === 2. Exit gaps === */
        /* West exit (x=0-1, y=16-18) -> Geumseong */
        rect(0, 16, 1, 18, T.PATH);
        /* North exit (x=20-23, y=0-1) -> Wansanju */
        rect(20, 0, 23, 1, T.PATH);

        /* === 3. Main trade road (E-W, rows 16-17) === */
        rect(2, 16, W - 3, 17, T.PATH);
        /* N-S road connecting to north exit */
        rect(21, 2, 22, 16, T.PATH);
        /* Widened north approach */
        rect(20, 2, 23, 4, T.PATH);

        /* Secondary paths branching off main road */
        rect(10, 13, 10, 16, T.PATH);   /* Path to market */
        rect(10, 18, 10, 21, T.PATH);   /* Path to inn */
        rect(30, 13, 30, 16, T.PATH);   /* Path to east market */
        rect(30, 18, 30, 21, T.PATH);   /* Path to east rest area */

        /* === 4. Buildings === */

        /* Market stall (north side, cols 7-13, rows 9-12) */
        rect(7, 9, 13, 9, T.BUILDING_ROOF);
        rect(7, 10, 13, 11, T.BUILDING_WALL);
        set(10, 11, T.DOOR);
        /* Path from market to road */
        rect(10, 12, 10, 16, T.PATH);

        /* Inn (south side, cols 7-13, rows 22-25) */
        rect(7, 22, 13, 22, T.ROOF_RED);
        rect(7, 23, 13, 24, T.BUILDING_WALL);
        set(10, 24, T.DOOR);
        /* Path from inn to road */
        rect(10, 18, 10, 22, T.PATH);

        /* Eastern trading post (cols 27-33, rows 9-12) */
        rect(27, 9, 33, 9, T.BUILDING_ROOF);
        rect(27, 10, 33, 11, T.BUILDING_WALL);
        set(30, 11, T.DOOR);
        rect(30, 12, 30, 16, T.PATH);

        /* Eastern rest house (cols 27-33, rows 22-25) */
        rect(27, 22, 33, 22, T.BUILDING_ROOF);
        rect(27, 23, 33, 24, T.BUILDING_WALL);
        set(30, 24, T.DOOR);
        rect(30, 18, 30, 22, T.PATH);

        /* Small waypost near west entrance (cols 4-6, rows 13-15) */
        rect(4, 13, 6, 13, T.BUILDING_ROOF);
        rect(4, 14, 6, 15, T.BUILDING_WALL);
        set(5, 15, T.DOOR);

        /* === 5. Rest area with flowers (near inn) === */
        const flowers: Array<[number, number]> = [
            [8, 25], [12, 25], [9, 26], [11, 26],
            [28, 25], [32, 25], [29, 26], [31, 26],
            [15, 15], [25, 15], [15, 18], [25, 18],
            [18, 8], [24, 8],
        ];
        for (const [fx, fy] of flowers) set(fx, fy, T.FLOWER);

        /* === 6. Tall grass (encounter zones) === */
        /* North side of road */
        rect(3, 3, 8, 8, T.TALL_GRASS);
        rect(13, 3, 19, 8, T.TALL_GRASS);
        rect(24, 3, 40, 8, T.TALL_GRASS);
        rect(35, 10, 41, 15, T.TALL_GRASS);
        rect(3, 10, 6, 12, T.TALL_GRASS);
        /* South side of road */
        rect(3, 20, 6, 25, T.TALL_GRASS);
        rect(14, 20, 20, 25, T.TALL_GRASS);
        rect(34, 20, 41, 25, T.TALL_GRASS);
        rect(3, 27, 12, 31, T.TALL_GRASS);
        rect(15, 27, 27, 31, T.TALL_GRASS);
        rect(34, 27, 41, 31, T.TALL_GRASS);

        /* === 7. Scattered trees === */
        const trees: Array<[number, number]> = [
            [6, 7], [16, 7], [36, 7], [40, 7],
            [6, 28], [16, 28], [36, 28], [40, 28],
            [18, 14], [24, 14], [18, 20], [24, 20],
            [38, 14], [38, 20],
        ];
        for (const [tx, ty] of trees) {
            if (ty > 1 && ty < H - 2 && tx >= 2 && tx < W - 2) {
                set(tx, ty - 1, T.TREE_TOP);
                set(tx, ty, T.TREE_TRUNK);
            }
        }

        /* === 8. Fences along road in certain stretches === */
        for (let x = 14; x <= 20; x++) {
            set(x, 15, T.FENCE);
            set(x, 18, T.FENCE);
        }
        for (let x = 23; x <= 29; x++) {
            set(x, 15, T.FENCE);
            set(x, 18, T.FENCE);
        }

        /* === 9. Signs === */
        set(3, 17, T.SIGN);
        set(20, 5, T.SIGN);
        set(22, 16, T.SIGN);

        /* === 10. NPCs === */
        const npcs = [
            {
                npcId: 'trader',
                gridX: 10,
                gridY: 12,
                spriteKey: 'npc_trader',
                name: '교역상',
                dialogueId: 'trader',
            },
            {
                npcId: 'innkeeper',
                gridX: 10,
                gridY: 25,
                spriteKey: 'npc_innkeeper',
                name: '주인',
                dialogueId: 'innkeeper',
            },
        ];

        /* === 11. Exits === */
        const exits = [
            /* West -> Geumseong (player arrives at Geumseong's east edge) */
            { gridX: 0, gridY: 16, targetScene: SCENES.GEUMSEONG, targetX: 42, targetY: 16 },
            { gridX: 0, gridY: 17, targetScene: SCENES.GEUMSEONG, targetX: 42, targetY: 17 },
            { gridX: 0, gridY: 18, targetScene: SCENES.GEUMSEONG, targetX: 42, targetY: 18 },
            /* North -> Wansanju (player arrives at Wansanju's south edge) */
            { gridX: 20, gridY: 0, targetScene: SCENES.WANSANJU, targetX: 21, targetY: 32 },
            { gridX: 21, gridY: 0, targetScene: SCENES.WANSANJU, targetX: 22, targetY: 32 },
            { gridX: 22, gridY: 0, targetScene: SCENES.WANSANJU, targetX: 22, targetY: 32 },
            { gridX: 23, gridY: 0, targetScene: SCENES.WANSANJU, targetX: 23, targetY: 32 },
        ];

        return { width: W, height: H, tiles, npcs, exits };
    }
}
