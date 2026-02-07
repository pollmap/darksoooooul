import Phaser from 'phaser';
import { TILE_SIZE, DEPTH, TILE, SOLID_TILES, ENCOUNTER_TILES } from '../utils/Constants';
import { Logger } from '../utils/Logger';

// =========================================================================
// Interfaces
// =========================================================================

/** Placement data for an NPC on the tile map */
export interface INPCPlacement {
    /** Unique NPC identifier */
    npcId: string;
    /** Grid column */
    gridX: number;
    /** Grid row */
    gridY: number;
    /** Sprite texture key */
    spriteKey: string;
    /** Display name */
    name: string;
    /** Optional dialogue ID to trigger on interaction */
    dialogueId?: string;
}

/** Definition of a map exit (scene transition trigger) */
export interface IMapExit {
    /** Grid column of the exit tile */
    gridX: number;
    /** Grid row of the exit tile */
    gridY: number;
    /** Scene key to transition to */
    targetScene: string;
    /** Grid column to place the player in the target scene */
    targetX: number;
    /** Grid row to place the player in the target scene */
    targetY: number;
    /** Optional facing direction when arriving */
    direction?: number;
}

/** Complete map data for a tile-based scene */
export interface IMapData {
    /** Map width in tiles */
    width: number;
    /** Map height in tiles */
    height: number;
    /** 2D array of tile IDs indexed as tiles[row][col] */
    tiles: number[][];
    /** Optional NPC placements */
    npcs?: INPCPlacement[];
    /** Optional exit definitions */
    exits?: IMapExit[];
}

// =========================================================================
// Tile texture lookup
// =========================================================================

/**
 * Maps tile ID constants to their corresponding texture keys.
 * A null value means the tile should not be rendered (empty space).
 */
const TILE_TEXTURE_MAP: Record<number, string | null> = {
    [TILE.GRASS]:          'tile_grass',
    [TILE.PATH]:           'tile_path',
    [TILE.WATER]:          'tile_water',
    [TILE.TALL_GRASS]:     'tile_tall_grass',
    [TILE.TREE_TRUNK]:     'tile_tree_trunk',
    [TILE.TREE_TOP]:       'tile_tree_top',
    [TILE.FENCE]:          'tile_fence',
    [TILE.BUILDING_WALL]:  'tile_building_wall',
    [TILE.BUILDING_ROOF]:  'tile_building_roof',
    [TILE.DOOR]:           'tile_door',
    [TILE.FLOWER]:         'tile_flower',
    [TILE.SIGN]:           'tile_sign',
    [TILE.BRIDGE]:         'tile_bridge',
    [TILE.STAIRS]:         'tile_stairs',
    [TILE.ROOF_RED]:       'tile_roof_red',
    [TILE.EMPTY]:          null,
};

/** Tile IDs that need a grass tile drawn underneath them */
const OVERLAY_TILES: Set<number> = new Set([
    TILE.TREE_TOP,
    TILE.TREE_TRUNK,
    TILE.FLOWER,
    TILE.TALL_GRASS,
    TILE.SIGN,
]);

/**
 * Manages tile-based map rendering and spatial queries.
 *
 * Responsibilities:
 *  - Render a 2D tile map as Phaser Image objects with correct depth ordering
 *  - Answer walkability queries based on SOLID_TILES and map bounds
 *  - Detect encounter tiles (tall grass)
 *  - Provide exit and NPC placement lookups by grid coordinate
 */
export class TileMapManager {
    /** Reference to the owning Phaser scene */
    private scene: Phaser.Scene;

    /** The full map data (tiles, NPCs, exits) */
    private mapData: IMapData;

    /** Fast lookup for exits keyed by "gx,gy" */
    private exitMap: Map<string, IMapExit> = new Map();

    /** Fast lookup for NPC placements keyed by "gx,gy" */
    private npcMap: Map<string, INPCPlacement> = new Map();

    /**
     * Create a new TileMapManager.
     * @param scene The Phaser scene that owns this map
     * @param mapData The map definition to render and query
     */
    constructor(scene: Phaser.Scene, mapData: IMapData) {
        this.scene = scene;
        this.mapData = mapData;

        // Build spatial lookup for exits
        if (mapData.exits) {
            for (const exit of mapData.exits) {
                this.exitMap.set(`${exit.gridX},${exit.gridY}`, exit);
            }
        }

        // Build spatial lookup for NPCs
        if (mapData.npcs) {
            for (const npc of mapData.npcs) {
                this.npcMap.set(`${npc.gridX},${npc.gridY}`, npc);
            }
        }

        Logger.info(
            'TileMapManager',
            `Map loaded: ${mapData.width}x${mapData.height} tiles, ` +
            `${this.exitMap.size} exits, ${this.npcMap.size} NPCs`,
        );
    }

    // =====================================================================
    // RENDERING
    // =====================================================================

    /**
     * Render the full tile map by creating a Phaser Image for each tile.
     *
     * - Tiles mapped to null (EMPTY) are skipped entirely.
     * - Overlay tiles (trees, flowers, tall grass, signs) get a grass
     *   base tile drawn beneath them for visual continuity.
     * - Tree-top tiles render at DEPTH.TREE_TOP so they appear above the player.
     * - All other tiles render at DEPTH.TILES.
     */
    public renderMap(): void {
        const { width, height, tiles } = this.mapData;

        for (let gy = 0; gy < height; gy++) {
            for (let gx = 0; gx < width; gx++) {
                const tileId = tiles[gy][gx];
                const textureKey = TILE_TEXTURE_MAP[tileId] ?? null;

                if (textureKey === null) {
                    continue;
                }

                const pixelX = gx * TILE_SIZE;
                const pixelY = gy * TILE_SIZE;

                // Draw grass beneath overlay tiles so the ground is always visible
                if (OVERLAY_TILES.has(tileId)) {
                    const grassBase = this.scene.add.image(pixelX, pixelY, 'tile_grass');
                    grassBase.setOrigin(0, 0);
                    grassBase.setDisplaySize(TILE_SIZE, TILE_SIZE);
                    grassBase.setDepth(DEPTH.TILES);
                }

                const image = this.scene.add.image(pixelX, pixelY, textureKey);
                image.setOrigin(0, 0);
                image.setDisplaySize(TILE_SIZE, TILE_SIZE);

                // Tree tops render above the player for proper visual layering
                if (tileId === TILE.TREE_TOP) {
                    image.setDepth(DEPTH.TREE_TOP);
                } else {
                    image.setDepth(DEPTH.TILES);
                }
            }
        }

        Logger.debug('TileMapManager', 'Map rendered');
    }

    // =====================================================================
    // SPATIAL QUERIES
    // =====================================================================

    /**
     * Check whether a tile at the given grid position is walkable.
     * A tile is NOT walkable if:
     *  - The coordinates are out of map bounds
     *  - The tile ID is in the SOLID_TILES set
     *
     * Note: NPC collision is NOT checked here. The scene should combine
     * this check with its own NPC position tracking.
     *
     * @param gx Grid column
     * @param gy Grid row
     * @returns true if the tile can be walked on
     */
    public isTileWalkable(gx: number, gy: number): boolean {
        if (!this.isInBounds(gx, gy)) {
            return false;
        }

        const tileId = this.mapData.tiles[gy][gx];
        return !SOLID_TILES.has(tileId);
    }

    /**
     * Check whether a tile triggers random encounters (e.g. tall grass).
     * @param gx Grid column
     * @param gy Grid row
     * @returns true if the tile is an encounter tile
     */
    public isEncounterTile(gx: number, gy: number): boolean {
        if (!this.isInBounds(gx, gy)) {
            return false;
        }

        const tileId = this.mapData.tiles[gy][gx];
        return ENCOUNTER_TILES.has(tileId);
    }

    /**
     * Get the tile ID at a given grid position.
     * @param gx Grid column
     * @param gy Grid row
     * @returns The tile ID, or -1 if out of bounds
     */
    public getTileAt(gx: number, gy: number): number {
        if (!this.isInBounds(gx, gy)) {
            return -1;
        }
        return this.mapData.tiles[gy][gx];
    }

    /**
     * Look up a map exit at the given grid position.
     * @param gx Grid column
     * @param gy Grid row
     * @returns The IMapExit definition, or null if no exit exists there
     */
    public getExit(gx: number, gy: number): IMapExit | null {
        return this.exitMap.get(`${gx},${gy}`) ?? null;
    }

    /**
     * Look up an NPC placement at the given grid position.
     * @param gx Grid column
     * @param gy Grid row
     * @returns The INPCPlacement data, or null if no NPC is placed there
     */
    public getNPCAt(gx: number, gy: number): INPCPlacement | null {
        return this.npcMap.get(`${gx},${gy}`) ?? null;
    }

    // =====================================================================
    // DIMENSIONS
    // =====================================================================

    /** Get the total map width in pixels */
    public getWorldWidth(): number {
        return this.mapData.width * TILE_SIZE;
    }

    /** Get the total map height in pixels */
    public getWorldHeight(): number {
        return this.mapData.height * TILE_SIZE;
    }

    // =====================================================================
    // INTERNAL HELPERS
    // =====================================================================

    /**
     * Check whether the given grid coordinates are within map bounds.
     * @param gx Grid column
     * @param gy Grid row
     * @returns true if within bounds
     */
    private isInBounds(gx: number, gy: number): boolean {
        return gx >= 0 && gx < this.mapData.width && gy >= 0 && gy < this.mapData.height;
    }
}
