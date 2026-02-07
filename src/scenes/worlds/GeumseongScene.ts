import { BaseScene } from '../BaseScene';
import { SCENES, TILE_SIZE, CAMERA_ZOOM, TILE, DEPTH, COMBAT } from '../../utils/Constants';
import { TileMapManager, IMapData } from '../../systems/TileMapManager';
import { Player } from '../../entities/Player';
import { Logger } from '../../utils/Logger';

/** Default spawn grid coordinates */
const DEFAULT_X = 22;
const DEFAULT_Y = 5;

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
 * Geumseong world scene - 금성 (Silla capital)
 * The ancient and declining Silla kingdom. Features ornate temple ruins,
 * a royal palace with gardens, flower-lined avenues, and water ponds
 * reflecting the faded grandeur of a once-great civilisation.
 *
 * Layout (45 x 35 tiles):
 *  - Tree border on all sides
 *  - North exit to Hub, east exit to Sangju
 *  - Royal palace with red roof at center-north
 *  - Temple on the west side
 *  - Flower gardens in the south with water features
 *  - Tall grass encounter zones at edges
 */
export class GeumseongScene extends BaseScene {
    private tileMap!: TileMapManager;
    private player!: Player;

    constructor() {
        super(SCENES.GEUMSEONG);
    }

    /**
     * Build the Geumseong scene.
     * @param data Optional spawn position from scene transition
     */
    create(data?: { playerX?: number; playerY?: number }): void {
        Logger.info('GeumseongScene', 'Creating Geumseong ancient capital (금성)');

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
        gameScene.events.emit('area_changed', '금성');

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

    /** Palace guards still patrol the old capital */
    private getAreaEnemies(): IEncounterEnemy[] {
        return [
            {
                enemyName: 'palace_guard',
                enemyNameKo: '궁궐 호위병',
                enemyHp: 50,
                enemyAtk: 10,
                enemyDef: 5,
                enemyExp: 30,
                enemyGold: [12, 30] as [number, number],
                returnScene: SCENES.GEUMSEONG,
            },
        ];
    }

    /**
     * Return dialogue text for a Geumseong NPC.
     * @param npcId The unique NPC identifier
     */
    private getNPCDialogue(npcId: string): string {
        const dialogues: Record<string, string> = {
            silla_king: '천년 신라의 마지막 왕이오... 이 나라의 운명이 다했다 해도, 백성을 버릴 수는 없소.',
            temple_monk: '부처의 가르침은 변하지 않소. 세상이 아무리 어지러워도, 마음의 평화를 찾으시오.',
        };
        return dialogues[npcId] ?? '...';
    }

    /**
     * Procedurally build the 45 x 35 tile map for Geumseong.
     *
     * Layout notes:
     *  - Tree border on all sides
     *  - Grand N-S avenue (cols 21-22) and E-W avenue (rows 17-18)
     *  - Royal palace at center-north with red roof, stairs approach
     *  - Temple on west side
     *  - Flower gardens with water ponds in south quadrants
     *  - Tall grass encounter zones at edges and around ruins
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
        /* North exit (x=20-23, y=0-1) -> Hub */
        rect(20, 0, 23, 1, T.PATH);
        /* East exit (x=43-44, y=16-18) -> Sangju */
        rect(W - 2, 16, W - 1, 18, T.PATH);

        /* === 3. Main avenues === */
        /* N-S grand avenue */
        rect(21, 2, 22, 32, T.PATH);
        /* E-W avenue */
        rect(2, 17, W - 3, 18, T.PATH);
        /* Widened north approach */
        rect(20, 2, 23, 4, T.PATH);
        /* East branch to exit */
        rect(35, 17, W - 2, 18, T.PATH);

        /* === 4. Royal Palace (center-north, cols 15-28, rows 6-10) === */
        rect(15, 6, 28, 6, T.ROOF_RED);
        rect(15, 7, 28, 7, T.ROOF_RED);
        rect(15, 8, 28, 9, T.BUILDING_WALL);
        rect(15, 10, 28, 10, T.BUILDING_WALL);
        set(21, 10, T.DOOR);
        set(22, 10, T.DOOR);
        /* Palace courtyard approach */
        rect(21, 11, 22, 16, T.PATH);

        /* Stairs to palace */
        rect(21, 5, 22, 5, T.STAIRS);
        rect(21, 11, 22, 11, T.STAIRS);

        /* === 5. Temple (west side, cols 5-11, rows 12-16) === */
        rect(5, 12, 11, 12, T.ROOF_RED);
        rect(5, 13, 11, 14, T.BUILDING_WALL);
        rect(5, 15, 11, 15, T.BUILDING_WALL);
        set(8, 15, T.DOOR);
        /* Temple path */
        rect(8, 16, 21, 17, T.PATH);

        /* === 6. Nobles' quarters (east, cols 33-39, rows 8-12) === */
        rect(33, 8, 39, 8, T.BUILDING_ROOF);
        rect(33, 9, 39, 10, T.BUILDING_WALL);
        rect(33, 11, 39, 11, T.BUILDING_WALL);
        set(36, 11, T.DOOR);
        /* Path to nobles */
        rect(36, 12, 36, 17, T.PATH);

        /* === 7. Southern garden (cols 14-30, rows 21-28) === */
        rect(14, 21, 30, 28, T.FLOWER);
        /* Paths through garden */
        rect(21, 19, 22, 28, T.PATH);
        rect(14, 24, 30, 25, T.PATH);
        /* Water ponds */
        rect(16, 22, 19, 23, T.WATER);
        rect(24, 22, 27, 23, T.WATER);
        rect(16, 26, 19, 27, T.WATER);
        rect(24, 26, 27, 27, T.WATER);

        /* === 8. Small shrine (south-west, cols 5-9, rows 25-28) === */
        rect(5, 25, 9, 25, T.ROOF_RED);
        rect(5, 26, 9, 27, T.BUILDING_WALL);
        set(7, 27, T.DOOR);

        /* === 9. Tall grass (encounter zones) === */
        rect(3, 3, 8, 8, T.TALL_GRASS);
        rect(36, 3, 41, 7, T.TALL_GRASS);
        rect(3, 28, 10, 31, T.TALL_GRASS);
        rect(34, 28, 41, 31, T.TALL_GRASS);
        rect(10, 19, 13, 22, T.TALL_GRASS);
        rect(31, 19, 34, 22, T.TALL_GRASS);

        /* === 10. Decorative trees === */
        const decorTrees: Array<[number, number]> = [
            [13, 10], [30, 10], [13, 22], [30, 22],
            [4, 20], [40, 20], [12, 30], [32, 30],
        ];
        for (const [tx, ty] of decorTrees) {
            if (ty > 1 && ty < H - 2 && tx >= 2 && tx < W - 2) {
                set(tx, ty - 1, T.TREE_TOP);
                set(tx, ty, T.TREE_TRUNK);
            }
        }

        /* === 11. Signs === */
        set(20, 4, T.SIGN);
        set(10, 17, T.SIGN);

        /* === 12. NPCs === */
        const npcs = [
            {
                npcId: 'silla_king',
                gridX: 21,
                gridY: 12,
                spriteKey: 'npc_silla_king',
                name: '신라왕',
                dialogueId: 'silla_king',
            },
            {
                npcId: 'temple_monk',
                gridX: 8,
                gridY: 16,
                spriteKey: 'npc_monk',
                name: '승려',
                dialogueId: 'temple_monk',
            },
        ];

        /* === 13. Exits === */
        const exits = [
            /* North -> Hub (player arrives at Hub's south edge) */
            { gridX: 20, gridY: 0, targetScene: SCENES.HUB, targetX: 19, targetY: 27 },
            { gridX: 21, gridY: 0, targetScene: SCENES.HUB, targetX: 19, targetY: 27 },
            { gridX: 22, gridY: 0, targetScene: SCENES.HUB, targetX: 20, targetY: 27 },
            { gridX: 23, gridY: 0, targetScene: SCENES.HUB, targetX: 20, targetY: 27 },
            /* East -> Sangju (player arrives at Sangju's west edge) */
            { gridX: W - 1, gridY: 16, targetScene: SCENES.SANGJU, targetX: 2, targetY: 16 },
            { gridX: W - 1, gridY: 17, targetScene: SCENES.SANGJU, targetX: 2, targetY: 17 },
            { gridX: W - 1, gridY: 18, targetScene: SCENES.SANGJU, targetX: 2, targetY: 18 },
        ];

        return { width: W, height: H, tiles, npcs, exits };
    }
}
