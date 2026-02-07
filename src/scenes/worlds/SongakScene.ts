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
 * Songak world scene - 송악 (Goryeo territory)
 * Harbor city under Wang Geon's rule. Features a bustling port on the
 * east side with docks and warehouses, a merchant district in the center,
 * and forested hills to the north.
 *
 * Layout (45 x 35 tiles):
 *  - Tree border (north/west/south) with water border on east (harbor)
 *  - Central N-S and E-W roads connecting exits to buildings
 *  - Wang Geon's estate (large red-roof building), harbor master office, merchant shop
 *  - Bridge exit on east to Paegang, path exit on south to Hub
 *  - Tall grass patches for pirate encounters
 */
export class SongakScene extends BaseScene {
    private tileMap!: TileMapManager;
    private player!: Player;

    constructor() {
        super(SCENES.SONGAK);
    }

    /**
     * Build the Songak scene.
     * @param data Optional spawn position from scene transition
     */
    create(data?: { playerX?: number; playerY?: number }): void {
        Logger.info('SongakScene', 'Creating Songak harbor city (송악)');

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
        gameScene.events.emit('area_changed', '송악');

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

    /** Pirates roam the harbor tall grass */
    private getAreaEnemies(): IEncounterEnemy[] {
        return [
            {
                enemyName: 'pirate',
                enemyNameKo: '해적',
                enemyHp: 40,
                enemyAtk: 8,
                enemyDef: 3,
                enemyExp: 20,
                enemyGold: [8, 20] as [number, number],
                returnScene: SCENES.SONGAK,
            },
        ];
    }

    /**
     * Return dialogue text for a Songak NPC.
     * @param npcId The unique NPC identifier
     */
    private getNPCDialogue(npcId: string): string {
        const dialogues: Record<string, string> = {
            wang_geon: '고려의 왕건이오. 함께 이 땅의 평화를 되찾읍시다. 송악은 새 시대의 시작이 될 것이오.',
            harbor_master: '이 항구에서 온갖 물자가 오가오. 해적들을 조심하시오. 요즘 해안가가 위험하오.',
            merchant: '항구에서 갓 들여온 물건들이오! 고려의 명품을 구경하시오.',
        };
        return dialogues[npcId] ?? '...';
    }

    /**
     * Procedurally build the 45 x 35 tile map for Songak.
     *
     * Layout notes:
     *  - Tree border on north, west, south; water border on east (harbor)
     *  - Central road system connecting to two exits
     *  - Wang Geon's estate with red roof, harbor office, merchant shop
     *  - Docks (bridges over water) on the east side
     *  - Tall grass encounter zones near the coast and south
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

        /* === 1. Borders === */
        /* Top: tree border */
        for (let x = 0; x < W; x++) { set(x, 0, T.TREE_TOP); set(x, 1, T.TREE_TRUNK); }
        /* Bottom: tree border */
        for (let x = 0; x < W; x++) { set(x, H - 2, T.TREE_TOP); set(x, H - 1, T.TREE_TRUNK); }
        /* Left: tree border */
        for (let y = 0; y < H; y++) { set(0, y, T.TREE_TRUNK); set(1, y, T.TREE_TRUNK); }
        /* Right: water (harbor coastline) */
        for (let y = 0; y < H; y++) { set(W - 1, y, T.WATER); set(W - 2, y, T.WATER); }

        /* === 2. Harbor water body (east side) === */
        rect(36, 2, W - 1, H - 3, T.WATER);
        /* Shore transition (some grass tiles remain at x=35) */
        for (let y = 3; y < H - 3; y++) {
            if (y % 5 !== 0) set(35, y, T.WATER);
        }

        /* === 3. Northern forest === */
        rect(2, 2, 25, 2, T.TREE_TOP);
        rect(2, 3, 25, 3, T.TREE_TRUNK);
        rect(4, 4, 20, 4, T.TREE_TOP);
        rect(4, 5, 20, 5, T.TREE_TRUNK);
        /* Scattered northern trees */
        const northTrees: Array<[number, number]> = [
            [3, 7], [7, 7], [12, 7], [17, 7], [22, 7],
            [5, 9], [10, 9], [15, 9], [27, 4], [30, 4],
        ];
        for (const [tx, ty] of northTrees) {
            set(tx, ty - 1, T.TREE_TOP);
            set(tx, ty, T.TREE_TRUNK);
        }

        /* === 4. Exit gaps === */
        /* South exit (x=20-23, y=33-34) -> Hub */
        rect(20, H - 2, 23, H - 1, T.PATH);
        /* East exit via bridge (x=35-44, y=16-18) -> Paegang */
        rect(35, 16, W - 1, 18, T.BRIDGE);

        /* === 5. Main roads === */
        /* N-S road through center */
        rect(15, 6, 16, 32, T.PATH);
        /* E-W road */
        rect(2, 17, 34, 18, T.PATH);
        /* Branch south toward exit */
        rect(15, 28, 23, 28, T.PATH);
        rect(20, 28, 23, H - 2, T.PATH);

        /* === 6. Docks (bridges over water) === */
        rect(32, 12, 35, 13, T.BRIDGE);
        rect(32, 21, 35, 22, T.BRIDGE);
        rect(34, 12, 34, 22, T.BRIDGE);

        /* === 7. Buildings === */

        /* Wang Geon's estate (red roof, cols 8-14, rows 11-14) */
        rect(8, 11, 14, 11, T.ROOF_RED);
        rect(8, 12, 14, 12, T.ROOF_RED);
        rect(8, 13, 14, 14, T.BUILDING_WALL);
        set(11, 14, T.DOOR);
        /* Path from estate door to road */
        rect(11, 15, 15, 16, T.PATH);

        /* Harbor master office (cols 27-31, rows 14-16) */
        rect(27, 14, 31, 14, T.BUILDING_ROOF);
        rect(27, 15, 31, 16, T.BUILDING_WALL);
        set(29, 16, T.DOOR);

        /* Merchant shop (cols 20-24, rows 22-24) */
        rect(20, 22, 24, 22, T.BUILDING_ROOF);
        rect(20, 23, 24, 24, T.BUILDING_WALL);
        set(22, 24, T.DOOR);

        /* Warehouse near harbor (cols 29-32, rows 8-10) */
        rect(29, 8, 32, 8, T.BUILDING_ROOF);
        rect(29, 9, 32, 10, T.BUILDING_WALL);
        set(30, 10, T.DOOR);

        /* === 8. Tall grass === */
        rect(3, 22, 8, 27, T.TALL_GRASS);
        rect(3, 28, 10, 31, T.TALL_GRASS);
        rect(25, 25, 31, 30, T.TALL_GRASS);
        rect(11, 28, 14, 31, T.TALL_GRASS);

        /* === 9. Flowers near estate === */
        const flowers: Array<[number, number]> = [
            [8, 15], [14, 15], [9, 10], [13, 10],
            [20, 20], [24, 20],
        ];
        for (const [fx, fy] of flowers) set(fx, fy, T.FLOWER);

        /* === 10. Signs === */
        set(4, 17, T.SIGN);
        set(19, 20, T.SIGN);

        /* === 11. NPCs === */
        const npcs = [
            {
                npcId: 'wang_geon',
                gridX: 11,
                gridY: 15,
                spriteKey: 'npc_wang_geon',
                name: '왕건',
                dialogueId: 'wang_geon',
            },
            {
                npcId: 'harbor_master',
                gridX: 29,
                gridY: 17,
                spriteKey: 'npc_harbor_master',
                name: '선장',
                dialogueId: 'harbor_master',
            },
            {
                npcId: 'merchant',
                gridX: 22,
                gridY: 25,
                spriteKey: 'npc_merchant',
                name: '상인',
                dialogueId: 'merchant',
            },
        ];

        /* === 12. Exits === */
        const exits = [
            /* South -> Hub (player arrives at Hub's north edge) */
            { gridX: 20, gridY: H - 1, targetScene: SCENES.HUB, targetX: 19, targetY: 2 },
            { gridX: 21, gridY: H - 1, targetScene: SCENES.HUB, targetX: 19, targetY: 2 },
            { gridX: 22, gridY: H - 1, targetScene: SCENES.HUB, targetX: 20, targetY: 2 },
            { gridX: 23, gridY: H - 1, targetScene: SCENES.HUB, targetX: 20, targetY: 2 },
            /* East bridge -> Paegang (player arrives at Paegang's west edge) */
            { gridX: W - 1, gridY: 16, targetScene: SCENES.PAEGANG, targetX: 2, targetY: 19 },
            { gridX: W - 1, gridY: 17, targetScene: SCENES.PAEGANG, targetX: 2, targetY: 20 },
            { gridX: W - 1, gridY: 18, targetScene: SCENES.PAEGANG, targetX: 2, targetY: 21 },
        ];

        return { width: W, height: H, tiles, npcs, exits };
    }
}
