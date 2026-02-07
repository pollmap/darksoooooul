import { BaseScene } from '../BaseScene';
import { SCENES, TILE_SIZE, CAMERA_ZOOM, TILE, DEPTH, COMBAT } from '../../utils/Constants';
import { TileMapManager, IMapData } from '../../systems/TileMapManager';
import { Player } from '../../entities/Player';
import { Logger } from '../../utils/Logger';

/** Default spawn grid coordinates */
const DEFAULT_X = 25;
const DEFAULT_Y = 35;

/** Map dimensions in tiles */
const MAP_WIDTH = 50;
const MAP_HEIGHT = 40;

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
 * Paegang world scene - 패강 (Borderlands)
 * A dangerous frontier territory. A wide river cuts through the map
 * with bridges crossing it. Dense tall grass fields harbour strong
 * enemies. Sparse trees and outposts dot the landscape.
 *
 * Layout (50 x 40 tiles):
 *  - Tree border on all sides
 *  - River (water) running roughly east-west through the center
 *  - Two bridges crossing the river
 *  - South exit to Cheolwon, west exit to Songak
 *  - Large tall grass encounter fields (highest encounter density)
 *  - Single NPC: border scout
 *  - Two enemy types: Balhae warrior and bandit
 */
export class PaegangScene extends BaseScene {
    private tileMap!: TileMapManager;
    private player!: Player;

    constructor() {
        super(SCENES.PAEGANG);
    }

    /**
     * Build the Paegang scene.
     * @param data Optional spawn position from scene transition
     */
    create(data?: { playerX?: number; playerY?: number }): void {
        Logger.info('PaegangScene', 'Creating Paegang borderlands (패강)');

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
        gameScene.events.emit('area_changed', '패강');

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

    /** Balhae warriors and bandits roam the borderlands */
    private getAreaEnemies(): IEncounterEnemy[] {
        return [
            {
                enemyName: 'balhae_warrior',
                enemyNameKo: '발해 전사',
                enemyHp: 65,
                enemyAtk: 13,
                enemyDef: 6,
                enemyExp: 45,
                enemyGold: [20, 45] as [number, number],
                returnScene: SCENES.PAEGANG,
            },
            {
                enemyName: 'bandit',
                enemyNameKo: '산적',
                enemyHp: 50,
                enemyAtk: 10,
                enemyDef: 4,
                enemyExp: 30,
                enemyGold: [15, 35] as [number, number],
                returnScene: SCENES.PAEGANG,
            },
        ];
    }

    /**
     * Return dialogue text for a Paegang NPC.
     * @param npcId The unique NPC identifier
     */
    private getNPCDialogue(npcId: string): string {
        const dialogues: Record<string, string> = {
            border_scout: '여기서부터는 패강 변경이오. 발해 전사와 산적이 들끓으니 각별히 조심하시오. 강을 건너면 더 위험하오.',
        };
        return dialogues[npcId] ?? '...';
    }

    /**
     * Procedurally build the 50 x 40 tile map for Paegang.
     *
     * Layout notes:
     *  - Tree border on all sides
     *  - Wide river running east-west through rows 17-21
     *  - Two bridges: one at cols 15-16 and one at cols 35-36
     *  - Paths connecting exits to bridges
     *  - South exit to Cheolwon, west exit to Songak
     *  - Expansive tall grass fields north and south of river
     *  - Sparse trees and a scout outpost
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

        /* === 2. River (east-west, rows 17-21) === */
        rect(2, 17, W - 3, 21, T.WATER);
        /* Riverbanks curve slightly */
        for (let x = 2; x < W - 2; x++) {
            if (x % 7 === 0) {
                set(x, 16, T.WATER);     /* north bank irregularity */
                set(x + 1, 22, T.WATER); /* south bank irregularity */
            }
        }

        /* === 3. Bridges === */
        /* Western bridge (cols 14-16, rows 16-22) */
        rect(14, 16, 16, 22, T.BRIDGE);
        /* Eastern bridge (cols 34-36, rows 16-22) */
        rect(34, 16, 36, 22, T.BRIDGE);

        /* === 4. Exit gaps === */
        /* South exit (x=23-26, y=38-39) -> Cheolwon */
        rect(23, H - 2, 26, H - 1, T.PATH);
        /* West exit (x=0-1, y=19-21) -> Songak */
        rect(0, 19, 1, 21, T.PATH);

        /* === 5. Main paths === */
        /* N-S path through western bridge */
        rect(15, 2, 16, 16, T.PATH);
        rect(15, 22, 16, 36, T.PATH);
        /* N-S path through eastern bridge */
        rect(35, 2, 36, 16, T.PATH);
        rect(35, 22, 36, 36, T.PATH);
        /* E-W path south of river connecting to exits */
        rect(2, 30, W - 3, 31, T.PATH);
        /* E-W path north of river */
        rect(2, 8, W - 3, 9, T.PATH);
        /* West exit approach */
        rect(2, 19, 14, 20, T.PATH);
        /* South exit approach */
        rect(16, 30, 26, 30, T.PATH);
        rect(24, 30, 25, H - 2, T.PATH);
        /* Cross paths */
        rect(15, 30, 16, 30, T.PATH);
        rect(35, 30, 36, 30, T.PATH);
        rect(15, 8, 16, 8, T.PATH);
        rect(35, 8, 36, 8, T.PATH);

        /* === 6. Scout outpost building (cols 22-26, rows 26-28) === */
        rect(22, 26, 26, 26, T.BUILDING_ROOF);
        rect(22, 27, 26, 28, T.BUILDING_WALL);
        set(24, 28, T.DOOR);
        /* Path to outpost */
        rect(24, 29, 25, 30, T.PATH);

        /* === 7. Tall grass fields (encounter zones) === */
        /* Northern fields */
        rect(3, 3, 12, 7, T.TALL_GRASS);
        rect(18, 3, 33, 7, T.TALL_GRASS);
        rect(38, 3, 47, 7, T.TALL_GRASS);
        rect(3, 10, 12, 15, T.TALL_GRASS);
        rect(18, 10, 33, 15, T.TALL_GRASS);
        rect(38, 10, 47, 15, T.TALL_GRASS);
        /* Southern fields */
        rect(3, 23, 12, 28, T.TALL_GRASS);
        rect(18, 23, 21, 28, T.TALL_GRASS);
        rect(27, 23, 33, 28, T.TALL_GRASS);
        rect(38, 23, 47, 28, T.TALL_GRASS);
        rect(3, 32, 12, 36, T.TALL_GRASS);
        rect(38, 32, 47, 36, T.TALL_GRASS);

        /* === 8. Scattered trees === */
        const trees: Array<[number, number]> = [
            [5, 9], [10, 5], [25, 5], [40, 5], [45, 9],
            [5, 28], [10, 25], [40, 25], [45, 28],
            [20, 14], [30, 14], [20, 24], [30, 24],
            [8, 35], [42, 35],
        ];
        for (const [tx, ty] of trees) {
            if (ty > 1 && ty < H - 2 && tx >= 2 && tx < W - 2) {
                set(tx, ty - 1, T.TREE_TOP);
                set(tx, ty, T.TREE_TRUNK);
            }
        }

        /* === 9. Flowers near outpost === */
        const flowers: Array<[number, number]> = [
            [21, 28], [27, 28], [23, 25], [26, 25],
        ];
        for (const [fx, fy] of flowers) set(fx, fy, T.FLOWER);

        /* === 10. Signs === */
        set(3, 20, T.SIGN);
        set(24, 31, T.SIGN);

        /* === 11. NPCs === */
        const npcs = [
            {
                npcId: 'border_scout',
                gridX: 24,
                gridY: 29,
                spriteKey: 'npc_scout',
                name: '정찰병',
                dialogueId: 'border_scout',
            },
        ];

        /* === 12. Exits === */
        const exits = [
            /* South -> Cheolwon (player arrives at Cheolwon's north edge) */
            { gridX: 23, gridY: H - 1, targetScene: SCENES.CHEOLWON, targetX: 21, targetY: 2 },
            { gridX: 24, gridY: H - 1, targetScene: SCENES.CHEOLWON, targetX: 22, targetY: 2 },
            { gridX: 25, gridY: H - 1, targetScene: SCENES.CHEOLWON, targetX: 22, targetY: 2 },
            { gridX: 26, gridY: H - 1, targetScene: SCENES.CHEOLWON, targetX: 23, targetY: 2 },
            /* West -> Songak (player arrives at Songak's east edge) */
            { gridX: 0, gridY: 19, targetScene: SCENES.SONGAK, targetX: 42, targetY: 17 },
            { gridX: 0, gridY: 20, targetScene: SCENES.SONGAK, targetX: 42, targetY: 17 },
            { gridX: 0, gridY: 21, targetScene: SCENES.SONGAK, targetX: 42, targetY: 18 },
        ];

        return { width: W, height: H, tiles, npcs, exits };
    }
}
