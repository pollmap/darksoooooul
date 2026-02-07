import { BaseScene } from '../BaseScene';
import { SCENES, TILE_SIZE, CAMERA_ZOOM, TILE, DEPTH, COMBAT } from '../../utils/Constants';
import { TileMapManager, IMapData } from '../../systems/TileMapManager';
import { Player } from '../../entities/Player';
import { Logger } from '../../utils/Logger';

/** Default spawn grid coordinates */
const DEFAULT_X = 20;
const DEFAULT_Y = 25;

/** Map dimensions in tiles */
const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;

/**
 * Hub world scene - 저잣거리 (Marketplace)
 * Central hub connecting all four regions. Contains shops, quest board,
 * and NPCs. This is a safe zone with no random encounters in the main
 * area, but optional tall grass at edges for light grinding.
 *
 * Layout (40 x 30 tiles):
 *  - Fence perimeter with four compass exits
 *  - N-S main road (cols 19-20) and E-W main road (rows 14-15)
 *  - Four buildings: quest board, merchant, blacksmith, elder
 *  - Trees, flowers, signpost, and tall-grass patches at edges
 */
export class HubScene extends BaseScene {
    private tileMap!: TileMapManager;
    private player!: Player;

    constructor() {
        super(SCENES.HUB);
    }

    /**
     * Build the hub scene: generate map, spawn player, configure camera,
     * wire up event listeners.
     * @param data Optional spawn position from scene transition
     */
    create(data?: { playerX?: number; playerY?: number }): void {
        Logger.info('HubScene', 'Creating marketplace hub (저잣거리)');

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
        gameScene.events.emit('area_changed', '저잣거리');

        this.fadeIn();
    }

    /** Per-frame update: delegates to the player */
    update(_time: number, _delta: number): void {
        this.player.update();
    }

    /**
     * Handle player stepping onto a tile.
     * Checks for exit transitions and encounter rolls.
     */
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

    /**
     * Handle player interact action at the faced tile.
     * Triggers NPC dialogue when applicable.
     */
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

    /**
     * Start a random encounter battle.
     * Hub is a safe zone so the enemy list is empty by default.
     */
    private startRandomBattle(): void {
        const enemies = this.getAreaEnemies();
        if (enemies.length === 0) return;
        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        const gameScene = this.scene.get(SCENES.GAME);
        gameScene.events.emit('start_battle', enemy);
    }

    /** Hub is a safe zone -- no random encounter enemies */
    private getAreaEnemies(): Array<{
        enemyName: string;
        enemyNameKo: string;
        enemyHp: number;
        enemyAtk: number;
        enemyDef: number;
        enemyExp: number;
        enemyGold: [number, number];
        returnScene: string;
    }> {
        return [];
    }

    /**
     * Return dialogue text for a hub NPC.
     * @param npcId The unique NPC identifier
     */
    private getNPCDialogue(npcId: string): string {
        const dialogues: Record<string, string> = {
            quest_board: '현재 의뢰가 게시되어 있습니다. 확인해 보시오.',
            merchant: '좋은 물건 많소! 천천히 구경하시오. 무엇이든 필요하시면 말씀하시오.',
            blacksmith: '검이든 갑옷이든, 내 손을 거치면 명품이 되지. 뭘 만들어 줄까?',
            elder: '이 저잣거리는 삼한의 중심이오. 동서남북으로 어디든 갈 수 있소. 조심히 다니시오.',
        };
        return dialogues[npcId] ?? '...';
    }

    /**
     * Procedurally build the 40 x 30 tile map for the marketplace hub.
     *
     * Layout notes:
     *  - Fence perimeter with four path openings (exits)
     *  - N-S road (cols 19-20) intersects E-W road (rows 14-15)
     *  - Buildings in each quadrant with paths connecting to the roads
     *  - Trees, flowers, a signpost, and four tall-grass patches
     */
    private getMapData(): IMapData {
        const T = TILE;
        const W = MAP_WIDTH;
        const H = MAP_HEIGHT;

        const tiles: number[][] = Array.from(
            { length: H },
            () => new Array(W).fill(T.GRASS),
        );

        /** Set a single tile (bounds-checked) */
        const set = (x: number, y: number, t: number): void => {
            if (x >= 0 && x < W && y >= 0 && y < H) tiles[y][x] = t;
        };

        /** Fill a rectangle from (x1,y1) to (x2,y2) inclusive */
        const rect = (x1: number, y1: number, x2: number, y2: number, t: number): void => {
            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    set(x, y, t);
                }
            }
        };

        /* === 1. Fence perimeter === */
        for (let x = 0; x < W; x++) { set(x, 0, T.FENCE); set(x, H - 1, T.FENCE); }
        for (let y = 0; y < H; y++) { set(0, y, T.FENCE); set(W - 1, y, T.FENCE); }

        /* === 2. Main roads === */
        rect(19, 1, 20, H - 2, T.PATH);         /* N-S road */
        rect(1, 14, W - 2, 15, T.PATH);          /* E-W road */
        rect(18, 13, 21, 16, T.PATH);            /* widened intersection */

        /* === 3. Exit openings (overwrite fence with path) === */
        rect(18, 0, 21, 2, T.PATH);              /* North -> Songak */
        rect(18, H - 3, 21, H - 1, T.PATH);      /* South -> Geumseong */
        rect(0, 13, 2, 16, T.PATH);               /* West  -> Cheolwon */
        rect(W - 3, 13, W - 1, 16, T.PATH);       /* East  -> Wansanju */

        /* === 4. Side paths to buildings === */
        rect(8, 7, 19, 8, T.PATH);               /* upper-left branch */
        rect(20, 7, 31, 8, T.PATH);              /* upper-right branch */
        rect(7, 15, 8, 19, T.PATH);              /* left branch down */
        rect(7, 23, 19, 23, T.PATH);             /* bottom-left branch */
        rect(31, 15, 32, 19, T.PATH);            /* right branch down */
        rect(20, 23, 32, 23, T.PATH);            /* bottom-right branch */

        /* === 5. Buildings === */

        /* Quest Board pavilion (top-left, cols 6-10, rows 4-6) */
        rect(6, 4, 10, 4, T.ROOF_RED);
        rect(6, 5, 10, 6, T.BUILDING_WALL);
        set(8, 6, T.DOOR);

        /* Merchant shop (top-right, cols 29-33, rows 4-6) */
        rect(29, 4, 33, 4, T.BUILDING_ROOF);
        rect(29, 5, 33, 6, T.BUILDING_WALL);
        set(31, 6, T.DOOR);

        /* Elder's house (bottom-left, cols 6-10, rows 20-22) */
        rect(6, 20, 10, 20, T.BUILDING_ROOF);
        rect(6, 21, 10, 22, T.BUILDING_WALL);
        set(8, 22, T.DOOR);

        /* Blacksmith forge (bottom-right, cols 29-33, rows 20-22) */
        rect(29, 20, 33, 20, T.ROOF_RED);
        rect(29, 21, 33, 22, T.BUILDING_WALL);
        set(31, 22, T.DOOR);

        /* === 6. Signpost at intersection === */
        set(18, 13, T.SIGN);

        /* === 7. Trees (top = TREE_TOP, bottom = TREE_TRUNK) === */
        const treeBases: Array<[number, number]> = [
            [3, 3], [15, 3], [24, 3], [36, 3],
            [3, 11], [36, 11],
            [13, 10], [26, 10],
            [3, 18], [36, 18],
            [15, 18], [24, 18],
            [3, 26], [15, 26], [24, 26], [36, 26],
        ];
        for (const [tx, ty] of treeBases) {
            set(tx, ty - 1, T.TREE_TOP);
            set(tx, ty, T.TREE_TRUNK);
        }

        /* === 8. Flowers === */
        const flowers: Array<[number, number]> = [
            [5, 8], [11, 8], [28, 8], [34, 8],
            [5, 24], [11, 24], [28, 24], [34, 24],
            [17, 12], [22, 12], [17, 17], [22, 17],
            [17, 14], [22, 14], [17, 16], [22, 16],
        ];
        for (const [fx, fy] of flowers) set(fx, fy, T.FLOWER);

        /* === 9. Tall grass patches (encounter zones) === */
        rect(12, 10, 14, 12, T.TALL_GRASS);      /* top-left */
        rect(25, 10, 27, 12, T.TALL_GRASS);       /* top-right */
        rect(12, 17, 14, 19, T.TALL_GRASS);       /* bottom-left */
        rect(25, 17, 27, 19, T.TALL_GRASS);       /* bottom-right */

        /* === 10. NPCs === */
        const npcs = [
            {
                npcId: 'quest_board',
                gridX: 8,
                gridY: 7,
                spriteKey: 'npc_quest_board',
                name: '퀘스트 판',
                dialogueId: 'quest_board',
            },
            {
                npcId: 'merchant',
                gridX: 31,
                gridY: 7,
                spriteKey: 'npc_merchant',
                name: '상인',
                dialogueId: 'merchant',
            },
            {
                npcId: 'elder',
                gridX: 8,
                gridY: 23,
                spriteKey: 'npc_elder',
                name: '장로',
                dialogueId: 'elder',
            },
            {
                npcId: 'blacksmith',
                gridX: 31,
                gridY: 23,
                spriteKey: 'npc_blacksmith',
                name: '대장장이',
                dialogueId: 'blacksmith',
            },
        ];

        /* === 11. Exits === */
        const exits = [
            /* North -> Songak (player arrives at Songak's south edge) */
            { gridX: 18, gridY: 0, targetScene: SCENES.SONGAK, targetX: 21, targetY: 33 },
            { gridX: 19, gridY: 0, targetScene: SCENES.SONGAK, targetX: 22, targetY: 33 },
            { gridX: 20, gridY: 0, targetScene: SCENES.SONGAK, targetX: 22, targetY: 33 },
            { gridX: 21, gridY: 0, targetScene: SCENES.SONGAK, targetX: 23, targetY: 33 },
            /* South -> Geumseong (player arrives at Geumseong's north edge) */
            { gridX: 18, gridY: H - 1, targetScene: SCENES.GEUMSEONG, targetX: 21, targetY: 2 },
            { gridX: 19, gridY: H - 1, targetScene: SCENES.GEUMSEONG, targetX: 22, targetY: 2 },
            { gridX: 20, gridY: H - 1, targetScene: SCENES.GEUMSEONG, targetX: 22, targetY: 2 },
            { gridX: 21, gridY: H - 1, targetScene: SCENES.GEUMSEONG, targetX: 23, targetY: 2 },
            /* West -> Cheolwon (player arrives at Cheolwon's east edge) */
            { gridX: 0, gridY: 13, targetScene: SCENES.CHEOLWON, targetX: 42, targetY: 16 },
            { gridX: 0, gridY: 14, targetScene: SCENES.CHEOLWON, targetX: 42, targetY: 17 },
            { gridX: 0, gridY: 15, targetScene: SCENES.CHEOLWON, targetX: 42, targetY: 17 },
            { gridX: 0, gridY: 16, targetScene: SCENES.CHEOLWON, targetX: 42, targetY: 18 },
            /* East -> Wansanju (player arrives at Wansanju's west edge) */
            { gridX: W - 1, gridY: 13, targetScene: SCENES.WANSANJU, targetX: 2, targetY: 16 },
            { gridX: W - 1, gridY: 14, targetScene: SCENES.WANSANJU, targetX: 2, targetY: 17 },
            { gridX: W - 1, gridY: 15, targetScene: SCENES.WANSANJU, targetX: 2, targetY: 17 },
            { gridX: W - 1, gridY: 16, targetScene: SCENES.WANSANJU, targetX: 2, targetY: 18 },
        ];

        return { width: W, height: H, tiles, npcs, exits };
    }
}
