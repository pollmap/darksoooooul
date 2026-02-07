import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { InputSystem } from '../systems/InputSystem';
import { TILE_SIZE, MOVE_DURATION, DEPTH, DIR } from '../utils/Constants';
import { TDirection } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/** Direction name lookup indexed by DIR constant values */
const DIRECTION_NAMES: Record<TDirection, string> = {
    [DIR.DOWN]: 'down',
    [DIR.UP]: 'up',
    [DIR.LEFT]: 'left',
    [DIR.RIGHT]: 'right',
};

/** Grid offset deltas (dx, dy) for each direction */
const DIRECTION_DELTAS: Record<TDirection, { dx: number; dy: number }> = {
    [DIR.DOWN]: { dx: 0, dy: 1 },
    [DIR.UP]: { dx: 0, dy: -1 },
    [DIR.LEFT]: { dx: -1, dy: 0 },
    [DIR.RIGHT]: { dx: 1, dy: 0 },
};

/**
 * Walkability checker function type.
 * Returns true if the tile at the given grid coordinates can be entered.
 */
type TWalkabilityChecker = (gx: number, gy: number) => boolean;

/**
 * Top-down grid-based player character (Pokemon-style).
 *
 * Moves tile-by-tile on a 16x16 grid with smooth tween-based sliding
 * transitions. No physics are used — all collision is handled through
 * an external walkability checker provided by the parent scene.
 *
 * Movement flow:
 *  1. If idle and a direction key is held, update facing direction.
 *  2. Query the walkability checker for the target tile.
 *  3. If walkable, tween the sprite to the new position over MOVE_DURATION ms.
 *  4. On tween completion, emit 'player_stepped' on the scene.
 *  5. If blocked, face the direction without moving.
 *
 * Interaction:
 *  - When the interact or attack action is just pressed, emit
 *    'player_interact' with the faced tile coordinates.
 *
 * Animations:
 *  - Walk: 'player_walk_down', 'player_walk_up', etc.
 *  - Idle: 'player_idle_down', 'player_idle_up', etc.
 *
 * Spritesheet layout (player_sheet, 3 columns x 4 rows, 16x16 each):
 *  - Row 0 (frames 0-2): facing down
 *  - Row 1 (frames 3-5): facing up
 *  - Row 2 (frames 6-8): facing left
 *  - Row 3 (frames 9-11): facing right
 */
export class Player extends Phaser.GameObjects.Sprite {
    /** Current tile column */
    private gridX: number;

    /** Current tile row */
    private gridY: number;

    /** Current facing direction (DIR.DOWN=0, DIR.UP=1, DIR.LEFT=2, DIR.RIGHT=3) */
    private direction: TDirection;

    /** Whether the player is currently sliding between tiles */
    private isMoving: boolean;

    /** Scene input system for reading key and gamepad state */
    private inputSystem: InputSystem;

    /** Global game state singleton */
    private gameState: GameState;

    /** Player number for InputSystem bindings (player 1) */
    private playerNumber: number = 1;

    /** External walkability checker set by the parent scene */
    private walkabilityChecker: TWalkabilityChecker | null = null;

    /**
     * Create a new grid-based Player sprite.
     * @param scene - The parent Phaser scene (must have an inputSystem property)
     * @param gridX - Starting tile column
     * @param gridY - Starting tile row
     */
    constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
        const pixelX = gridX * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = gridY * TILE_SIZE + TILE_SIZE / 2;

        super(scene, pixelX, pixelY, 'player_sheet', 0);

        this.gridX = gridX;
        this.gridY = gridY;
        this.direction = DIR.DOWN as TDirection;
        this.isMoving = false;

        // Retrieve InputSystem from the scene (expected to be attached by BaseScene)
        this.inputSystem = (scene as unknown as { inputSystem: InputSystem }).inputSystem;
        this.gameState = GameState.getInstance();

        // Add to the scene display list and set render depth
        scene.add.existing(this);
        this.setDepth(DEPTH.PLAYER);

        // Start with the idle-down animation
        this.playIdleAnimation();

        Logger.info('Player', `Player initialized at grid (${gridX}, ${gridY})`);
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Set the walkability checker function.
     * Called by the parent scene to provide tile collision logic without
     * the Player needing to own a TileMapManager reference.
     * @param fn - Returns true if the tile at (gx, gy) is walkable
     */
    public setWalkabilityChecker(fn: TWalkabilityChecker): void {
        this.walkabilityChecker = fn;
    }

    /**
     * Per-frame update. Call from the parent scene's update method.
     * Processes interaction input every frame, but only processes
     * movement input when the player is not currently sliding.
     */
    public update(): void {
        this.handleInteractionInput();

        if (!this.isMoving) {
            this.handleMovementInput();
        }
    }

    /** Get the current tile column */
    public getGridX(): number {
        return this.gridX;
    }

    /** Get the current tile row */
    public getGridY(): number {
        return this.gridY;
    }

    /** Get the current facing direction (DIR constant) */
    public getDirection(): TDirection {
        return this.direction;
    }

    /** Check whether the player is currently moving between tiles */
    public getIsMoving(): boolean {
        return this.isMoving;
    }

    /**
     * Get the grid position of the tile the player is facing.
     * Useful for interaction targets (NPCs, signs, doors, etc.).
     * @returns Object with gx and gy of the faced tile
     */
    public getFacedTile(): { gx: number; gy: number } {
        const delta = DIRECTION_DELTAS[this.direction];
        return {
            gx: this.gridX + delta.dx,
            gy: this.gridY + delta.dy,
        };
    }

    /**
     * Teleport the player to a new grid position without animation.
     * Cancels any active movement and snaps to the target tile.
     * Used for scene transitions, warps, and loading saved positions.
     * @param gx - Target tile column
     * @param gy - Target tile row
     * @param dir - Optional facing direction after teleport
     */
    public setGridPosition(gx: number, gy: number, dir?: TDirection): void {
        this.isMoving = false;
        this.gridX = gx;
        this.gridY = gy;
        this.x = gx * TILE_SIZE + TILE_SIZE / 2;
        this.y = gy * TILE_SIZE + TILE_SIZE / 2;

        if (dir !== undefined) {
            this.direction = dir;
        }

        this.playIdleAnimation();
        this.gameState.setPosition(this.x, this.y);

        Logger.debug('Player', `Teleported to grid (${gx}, ${gy})`);
    }

    // =========================================================================
    // INPUT HANDLING
    // =========================================================================

    /**
     * Read directional input and attempt to move or change facing direction.
     * Down is checked first to match classic top-down RPG priority.
     * Always updates the facing direction even if the target tile is blocked.
     */
    private handleMovementInput(): void {
        let targetDir: TDirection | null = null;

        if (this.inputSystem.isActionPressed('down', this.playerNumber)) {
            targetDir = DIR.DOWN as TDirection;
        } else if (this.inputSystem.isActionPressed('up', this.playerNumber)) {
            targetDir = DIR.UP as TDirection;
        } else if (this.inputSystem.isActionPressed('left', this.playerNumber)) {
            targetDir = DIR.LEFT as TDirection;
        } else if (this.inputSystem.isActionPressed('right', this.playerNumber)) {
            targetDir = DIR.RIGHT as TDirection;
        }

        if (targetDir === null) {
            return;
        }

        // Always update facing direction, even when blocked
        const directionChanged = this.direction !== targetDir;
        this.direction = targetDir;

        if (directionChanged) {
            this.playIdleAnimation();
        }

        // Calculate target tile from direction
        const delta = DIRECTION_DELTAS[targetDir];
        const targetGX = this.gridX + delta.dx;
        const targetGY = this.gridY + delta.dy;

        if (this.isTileWalkable(targetGX, targetGY)) {
            this.startMove(targetGX, targetGY);
        }
    }

    /**
     * Check for interact/attack input and emit an interaction event
     * targeting the tile the player is facing.
     */
    private handleInteractionInput(): void {
        const interactPressed =
            this.inputSystem.isActionJustPressed('interact', this.playerNumber) ||
            this.inputSystem.isActionJustPressed('attack', this.playerNumber);

        if (!interactPressed) {
            return;
        }

        const faced = this.getFacedTile();
        this.scene.events.emit('player_interact', faced.gx, faced.gy, this.direction);

        Logger.debug('Player', `Interact at grid (${faced.gx}, ${faced.gy})`);
    }

    // =========================================================================
    // MOVEMENT
    // =========================================================================

    /**
     * Check whether a tile is walkable using the external checker.
     * If no checker has been set, all tiles default to walkable with a warning.
     * @param gx - Grid X to check
     * @param gy - Grid Y to check
     * @returns True if the tile can be entered
     */
    private isTileWalkable(gx: number, gy: number): boolean {
        if (!this.walkabilityChecker) {
            Logger.warn('Player', 'No walkability checker set — defaulting to walkable');
            return true;
        }
        return this.walkabilityChecker(gx, gy);
    }

    /**
     * Begin a tween-based slide from the current tile to the target tile.
     * Updates gridX/gridY immediately so other systems can query the
     * player's logical position during the slide. Emits 'player_stepped'
     * on the scene when the tween completes.
     * @param targetGX - Destination tile column
     * @param targetGY - Destination tile row
     */
    private startMove(targetGX: number, targetGY: number): void {
        this.isMoving = true;
        this.gridX = targetGX;
        this.gridY = targetGY;

        const targetPixelX = targetGX * TILE_SIZE + TILE_SIZE / 2;
        const targetPixelY = targetGY * TILE_SIZE + TILE_SIZE / 2;

        this.playWalkAnimation();

        this.scene.tweens.add({
            targets: this,
            x: targetPixelX,
            y: targetPixelY,
            duration: MOVE_DURATION,
            ease: 'Linear',
            onComplete: () => {
                this.onMoveComplete();
            },
        });
    }

    /**
     * Called when the movement tween finishes.
     * Resets the moving flag, syncs position to GameState, emits the
     * 'player_stepped' event, and returns to idle animation if no
     * direction key is being held.
     */
    private onMoveComplete(): void {
        this.isMoving = false;

        // Sync position to GameState
        this.gameState.setPosition(this.x, this.y);

        // Notify the parent scene that the player completed a step
        this.scene.events.emit('player_stepped', this.gridX, this.gridY);

        // Return to idle if no direction key is held
        if (!this.isDirectionKeyHeld()) {
            this.playIdleAnimation();
        }
    }

    /**
     * Check whether any directional key is currently held.
     * @returns True if at least one direction is pressed
     */
    private isDirectionKeyHeld(): boolean {
        return (
            this.inputSystem.isActionPressed('up', this.playerNumber) ||
            this.inputSystem.isActionPressed('down', this.playerNumber) ||
            this.inputSystem.isActionPressed('left', this.playerNumber) ||
            this.inputSystem.isActionPressed('right', this.playerNumber)
        );
    }

    // =========================================================================
    // ANIMATION
    // =========================================================================

    /** Play the walk animation for the current facing direction */
    private playWalkAnimation(): void {
        const dirName = DIRECTION_NAMES[this.direction];
        this.playAnimSafe(`player_walk_${dirName}`);
    }

    /** Play the idle animation for the current facing direction */
    private playIdleAnimation(): void {
        const dirName = DIRECTION_NAMES[this.direction];
        this.playAnimSafe(`player_idle_${dirName}`);
    }

    /**
     * Safely play an animation only if it exists in the animation manager.
     * Prevents errors during early initialization or when animations
     * have not yet been registered.
     * @param key - The animation key to play
     */
    private playAnimSafe(key: string): void {
        if (this.scene.anims.exists(key)) {
            this.play(key, true);
        }
    }
}
