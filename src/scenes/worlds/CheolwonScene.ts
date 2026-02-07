import { BaseScene } from '../BaseScene';
import { SCENES, TILE_SIZE, CAMERA_ZOOM, TILE, DEPTH, COMBAT } from '../../utils/Constants';
import { TileMapManager, IMapData } from '../../systems/TileMapManager';
import { Player } from '../../entities/Player';
import { Logger } from '../../utils/Logger';

/** Default spawn grid coordinates */
const DEFAULT_X = 40;
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
 * Cheolwon world scene - 철원 (Taebong capital)
 * Gungye's militaristic capital. An oppressive fortress city with
 * barracks, training grounds enclosed by fences, watchtowers, and
 * Gungye's palace looming over everything.
 *
 * Layout (45 x 35 tiles):
 *  - Tree border with fence-reinforced walls
 *  - East exit to Hub, north exit to Paegang
 *  - Military buildings: barracks, training hall, Gungye's palace
 *  - Fenced training grounds and parade areas
 *  - Tall grass encounter zones around perimeter
 */
export class CheolwonScene extends BaseScene {
    private tileMap!: TileMapManager;
    private player!: Player;

    constructor() {
        super(SCENES.CHEOLWON);
    }

    /**
     * Build the Cheolwon scene.
     * @param data Optional spawn position from scene transition
     */
    create(data?: { playerX?: number; playerY?: number }): void {
        Logger.info('CheolwonScene', 'Creating Cheolwon fortress (철원)');

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
        gameScene.events.emit('area_changed', '철원');

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

    /** Taebong soldiers guard the fortress perimeter */
    private getAreaEnemies(): IEncounterEnemy[] {
        return [
            {
                enemyName: 'taebong_soldier',
                enemyNameKo: '태봉 병사',
                enemyHp: 55,
                enemyAtk: 11,
                enemyDef: 5,
                enemyExp: 35,
                enemyGold: [15, 35] as [number, number],
                returnScene: SCENES.CHEOLWON,
            },
        ];
    }

    /**
     * Return dialogue text for a Cheolwon NPC.
     * @param npcId The unique NPC identifier
     */
    private getNPCDialogue(npcId: string): string {
        const dialogues: Record<string, string> = {
            gungye: '태봉의 궁예다. 미래를 꿰뚫어 볼 수 있다. 네 운명도 이미 보이느니라.',
            general: '궁예 폐하의 뜻이 곧 법이오. 명에 따르지 않는 자는 역적으로 다스리겠소.',
        };
        return dialogues[npcId] ?? '...';
    }

    /**
     * Procedurally build the 45 x 35 tile map for Cheolwon.
     *
     * Layout notes:
     *  - Tree border with additional fence perimeter
     *  - East exit to Hub, north exit to Paegang
     *  - Central N-S and E-W military roads
     *  - Gungye's palace at top-center with red roof
     *  - Barracks on left, training hall on right
     *  - Fenced training grounds (parade square)
     *  - Tall grass encounter zones on outskirts
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

        /* === 2. Inner fence perimeter (cols 3-41, rows 3-31) === */
        for (let x = 3; x <= 41; x++) { set(x, 3, T.FENCE); set(x, 31, T.FENCE); }
        for (let y = 3; y <= 31; y++) { set(3, y, T.FENCE); set(41, y, T.FENCE); }

        /* Fence gate openings */
        set(22, 3, T.PATH);  set(23, 3, T.PATH);   /* North gate */
        set(41, 17, T.PATH); set(41, 18, T.PATH);   /* East gate */
        set(22, 31, T.PATH); set(23, 31, T.PATH);   /* South (internal) */

        /* === 3. Exit gaps === */
        /* East exit (x=43-44, y=16-18) -> Hub */
        rect(W - 2, 16, W - 1, 18, T.PATH);
        /* North exit (x=20-23, y=0-1) -> Paegang */
        rect(20, 0, 23, 1, T.PATH);

        /* === 4. Main roads === */
        /* E-W military road */
        rect(4, 17, 41, 18, T.PATH);
        /* N-S military road */
        rect(22, 4, 23, 31, T.PATH);
        /* Approach to east exit */
        rect(41, 17, W - 2, 18, T.PATH);
        /* Approach to north exit */
        rect(22, 2, 23, 3, T.PATH);
        rect(20, 2, 23, 3, T.PATH);

        /* === 5. Buildings === */

        /* Gungye's palace (red roof, cols 15-29, rows 5-9) */
        rect(15, 5, 29, 5, T.ROOF_RED);
        rect(15, 6, 29, 6, T.ROOF_RED);
        rect(15, 7, 29, 8, T.BUILDING_WALL);
        rect(15, 9, 29, 9, T.BUILDING_WALL);
        set(22, 9, T.DOOR);
        set(23, 9, T.DOOR);
        /* Palace approach stairs */
        rect(22, 10, 23, 10, T.STAIRS);

        /* Left barracks (cols 5-11, rows 11-14) */
        rect(5, 11, 11, 11, T.BUILDING_ROOF);
        rect(5, 12, 11, 13, T.BUILDING_WALL);
        set(8, 13, T.DOOR);
        /* Second barracks (cols 5-11, rows 21-24) */
        rect(5, 21, 11, 21, T.BUILDING_ROOF);
        rect(5, 22, 11, 23, T.BUILDING_WALL);
        set(8, 23, T.DOOR);

        /* Right training hall (cols 33-39, rows 11-14) */
        rect(33, 11, 39, 11, T.BUILDING_ROOF);
        rect(33, 12, 39, 13, T.BUILDING_WALL);
        set(36, 13, T.DOOR);
        /* Watchtower (cols 35-37, rows 21-24) */
        rect(35, 21, 37, 21, T.ROOF_RED);
        rect(35, 22, 37, 23, T.BUILDING_WALL);
        set(36, 23, T.DOOR);

        /* === 6. Training grounds (fenced square, cols 14-20, rows 21-28) === */
        for (let x = 14; x <= 20; x++) { set(x, 21, T.FENCE); set(x, 28, T.FENCE); }
        for (let y = 21; y <= 28; y++) { set(14, y, T.FENCE); set(20, y, T.FENCE); }
        /* Gate into training grounds */
        set(17, 21, T.PATH);
        /* Interior is grass (training field) */
        /* Connecting path to main road */
        rect(17, 18, 17, 21, T.PATH);

        /* Second training area (cols 25-31, rows 21-28) */
        for (let x = 25; x <= 31; x++) { set(x, 21, T.FENCE); set(x, 28, T.FENCE); }
        for (let y = 21; y <= 28; y++) { set(25, y, T.FENCE); set(31, y, T.FENCE); }
        set(28, 21, T.PATH);
        rect(28, 18, 28, 21, T.PATH);

        /* === 7. Side paths === */
        rect(8, 14, 22, 16, T.PATH);    /* Left barracks to road */
        rect(23, 14, 36, 16, T.PATH);   /* Right hall to road */
        rect(8, 24, 14, 24, T.PATH);    /* Bottom left barracks */
        rect(31, 24, 36, 24, T.PATH);   /* Bottom right tower */

        /* === 8. Tall grass (encounter zones outside fences) === */
        rect(4, 4, 12, 8, T.TALL_GRASS);
        rect(32, 4, 40, 8, T.TALL_GRASS);
        rect(4, 28, 12, 30, T.TALL_GRASS);
        rect(32, 28, 40, 30, T.TALL_GRASS);

        /* === 9. Scattered trees === */
        const trees: Array<[number, number]> = [
            [6, 9], [10, 9], [34, 9], [38, 9],
            [6, 27], [10, 27], [34, 27], [38, 27],
        ];
        for (const [tx, ty] of trees) {
            set(tx, ty - 1, T.TREE_TOP);
            set(tx, ty, T.TREE_TRUNK);
        }

        /* === 10. Signs === */
        set(21, 10, T.SIGN);
        set(40, 17, T.SIGN);

        /* === 11. NPCs === */
        const npcs = [
            {
                npcId: 'gungye',
                gridX: 22,
                gridY: 11,
                spriteKey: 'npc_gungye',
                name: '궁예',
                dialogueId: 'gungye',
            },
            {
                npcId: 'general',
                gridX: 36,
                gridY: 14,
                spriteKey: 'npc_general',
                name: '장군',
                dialogueId: 'general',
            },
        ];

        /* === 12. Exits === */
        const exits = [
            /* East -> Hub (player arrives at Hub's west edge) */
            { gridX: W - 1, gridY: 16, targetScene: SCENES.HUB, targetX: 2, targetY: 14 },
            { gridX: W - 1, gridY: 17, targetScene: SCENES.HUB, targetX: 2, targetY: 14 },
            { gridX: W - 1, gridY: 18, targetScene: SCENES.HUB, targetX: 2, targetY: 15 },
            /* North -> Paegang (player arrives at Paegang's south edge) */
            { gridX: 20, gridY: 0, targetScene: SCENES.PAEGANG, targetX: 24, targetY: 37 },
            { gridX: 21, gridY: 0, targetScene: SCENES.PAEGANG, targetX: 25, targetY: 37 },
            { gridX: 22, gridY: 0, targetScene: SCENES.PAEGANG, targetX: 25, targetY: 37 },
            { gridX: 23, gridY: 0, targetScene: SCENES.PAEGANG, targetX: 26, targetY: 37 },
        ];

        return { width: W, height: H, tiles, npcs, exits };
    }
}
