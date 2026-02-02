import Phaser from 'phaser';
import { DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';

/** Configuration for NPC creation */
export interface INPCConfig {
    /** Unique NPC identifier */
    npcId: string;
    /** Display name */
    name: string;
    /** Sprite texture key */
    spriteKey: string;
    /** Interaction zone radius in pixels */
    interactionRadius?: number;
    /** Default dialogue ID to trigger */
    defaultDialogueId?: string;
    /** Dialogue IDs keyed by GameState NPC state */
    dialogueByState?: Record<string, string>;
    /** Whether the NPC faces the player when nearby */
    facePlayer?: boolean;
}

/**
 * NPC entity for quest givers, merchants, and story characters.
 *
 * Features:
 * - Interaction zone detection (configurable radius)
 * - Dialogue triggering via scene events
 * - Visual indicator (floating icon) when player is nearby
 * - State-dependent dialogue selection via GameState
 */
export class NPC extends Phaser.Physics.Arcade.Sprite {
    // --- Configuration ---
    private npcId: string;
    private npcName: string;
    private interactionRadius: number;
    private defaultDialogueId: string;
    private dialogueByState: Record<string, string>;
    private shouldFacePlayer: boolean;

    // --- Runtime ---
    private playerInRange: boolean = false;
    private interactionIndicator: Phaser.GameObjects.Text | null = null;
    private canInteract: boolean = true;
    private interactCooldown: number = 0;
    private interactCooldownMax: number = 500;

    // --- References ---
    private gameState: GameState;

    constructor(scene: Phaser.Scene, x: number, y: number, config: INPCConfig) {
        super(scene, x, y, config.spriteKey);

        scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
        scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject, true); // Static body for NPCs

        this.npcId = config.npcId;
        this.npcName = config.name;
        this.interactionRadius = config.interactionRadius ?? 60;
        this.defaultDialogueId = config.defaultDialogueId ?? '';
        this.dialogueByState = config.dialogueByState ?? {};
        this.shouldFacePlayer = config.facePlayer ?? true;

        this.gameState = GameState.getInstance();

        this.setDepth(DEPTH.ENEMIES); // Same layer as other characters

        // Create floating interaction indicator (hidden by default)
        this.interactionIndicator = scene.add.text(x, y - 40, '[E]', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 4, y: 2 },
        });
        this.interactionIndicator.setOrigin(0.5, 1);
        this.interactionIndicator.setDepth(DEPTH.UI);
        this.interactionIndicator.setVisible(false);

        Logger.debug('NPC', `NPC "${this.npcName}" (${this.npcId}) created at (${x}, ${y})`);
    }

    // =====================================================================
    // UPDATE
    // =====================================================================

    public update(time: number, delta: number): void {
        if (!this.active) return;

        const dtMs = delta;

        // Update interaction cooldown
        if (this.interactCooldown > 0) {
            this.interactCooldown -= dtMs;
            if (this.interactCooldown <= 0) {
                this.canInteract = true;
            }
        }

        // Update indicator position to follow NPC (in case of moving NPCs)
        if (this.interactionIndicator) {
            this.interactionIndicator.setPosition(this.x, this.y - 40);

            // Gentle bobbing animation
            const bob = Math.sin(time * 0.003) * 3;
            this.interactionIndicator.y += bob;
        }
    }

    // =====================================================================
    // PLAYER PROXIMITY
    // =====================================================================

    /**
     * Check whether a player sprite is within interaction range.
     * Should be called by the scene during its update loop.
     * @param player The player sprite to check distance against
     * @returns true if the player is within interaction radius
     */
    public checkPlayerProximity(player: Phaser.Physics.Arcade.Sprite): boolean {
        if (!this.active || !player.active) {
            this.setPlayerInRange(false);
            return false;
        }

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const inRange = distance <= this.interactionRadius;

        this.setPlayerInRange(inRange);

        // Face toward player
        if (inRange && this.shouldFacePlayer) {
            this.setFlipX(player.x < this.x);
        }

        return inRange;
    }

    /** Update the in-range state and toggle indicator visibility */
    private setPlayerInRange(inRange: boolean): void {
        if (this.playerInRange === inRange) return;

        this.playerInRange = inRange;

        if (this.interactionIndicator) {
            this.interactionIndicator.setVisible(inRange);
        }

        if (inRange) {
            this.scene.events.emit('npc_player_nearby', {
                npc: this,
                npcId: this.npcId,
                name: this.npcName,
            });
        } else {
            this.scene.events.emit('npc_player_left', {
                npc: this,
                npcId: this.npcId,
            });
        }
    }

    // =====================================================================
    // INTERACTION
    // =====================================================================

    /**
     * Trigger NPC interaction (dialogue).
     * Called by the scene when the player presses the interact button while in range.
     */
    public interact(): void {
        if (!this.playerInRange || !this.canInteract) return;

        // Apply cooldown
        this.canInteract = false;
        this.interactCooldown = this.interactCooldownMax;

        // Determine which dialogue to use based on NPC state
        const dialogueId = this.resolveDialogueId();

        if (!dialogueId) {
            Logger.warn('NPC', `No dialogue configured for NPC "${this.npcName}" in current state`);
            return;
        }

        // Emit interaction event for DialogueScene to pick up
        this.scene.events.emit('npc_interact', {
            npc: this,
            npcId: this.npcId,
            name: this.npcName,
            dialogueId,
        });

        Logger.info('NPC', `Player interacted with "${this.npcName}". Dialogue: ${dialogueId}`);
    }

    /** Resolve the appropriate dialogue ID based on current GameState NPC state */
    private resolveDialogueId(): string {
        const npcState = this.gameState.getNpcState(this.npcId);

        // Check state-specific dialogue first
        if (npcState && this.dialogueByState[npcState]) {
            return this.dialogueByState[npcState];
        }

        // Fall back to default dialogue
        return this.defaultDialogueId;
    }

    // =====================================================================
    // CLEANUP
    // =====================================================================

    public destroy(fromScene?: boolean): void {
        if (this.interactionIndicator) {
            this.interactionIndicator.destroy();
            this.interactionIndicator = null;
        }
        super.destroy(fromScene);
    }

    // =====================================================================
    // ACCESSORS
    // =====================================================================

    public getNpcId(): string { return this.npcId; }
    public getNpcName(): string { return this.npcName; }
    public getIsPlayerInRange(): boolean { return this.playerInRange; }
    public getInteractionRadius(): number { return this.interactionRadius; }
}
