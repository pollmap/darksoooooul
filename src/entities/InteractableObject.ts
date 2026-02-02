import Phaser from 'phaser';
import { DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';

/** Types of interactable objects */
export type TInteractableType = 'chest' | 'door' | 'save_point' | 'lever' | 'sign' | 'generic';

/** State of the interactable object */
export type TInteractableState = 'default' | 'open' | 'closed' | 'locked' | 'activated' | 'disabled';

/** Configuration for creating an interactable object */
export interface IInteractableConfig {
    /** Unique identifier for persistence */
    objectId: string;
    /** Type of object */
    type: TInteractableType;
    /** Sprite texture key */
    spriteKey: string;
    /** Initial state */
    initialState?: TInteractableState;
    /** Interaction prompt text */
    promptText?: string;
    /** Interaction radius in pixels */
    interactionRadius?: number;
    /** Whether this object can only be interacted with once */
    oneTimeUse?: boolean;
    /** Optional reward item ID (for chests) */
    rewardItem?: string;
    /** Optional reward item count */
    rewardCount?: number;
    /** Optional target scene or area (for doors) */
    targetDestination?: string;
    /** Optional required item to interact (for locked doors) */
    requiredItem?: string;
}

/**
 * Interactable world object (chests, doors, save points, etc.).
 *
 * Features:
 * - Interaction prompt display when player is nearby
 * - State tracking (open/closed/locked/activated/disabled)
 * - Event emission on interaction for game systems to handle
 * - Persistence through GameState flags
 */
export class InteractableObject extends Phaser.Physics.Arcade.Sprite {
    // --- Configuration ---
    private objectId: string;
    private objectType: TInteractableType;
    private currentState: TInteractableState;
    private promptText: string;
    private interactionRadius: number;
    private oneTimeUse: boolean;
    private rewardItem: string | null;
    private rewardCount: number;
    private targetDestination: string | null;
    private requiredItem: string | null;

    // --- Runtime ---
    private playerInRange: boolean = false;
    private promptLabel: Phaser.GameObjects.Text | null = null;
    private hasBeenUsed: boolean = false;
    private canInteract: boolean = true;
    private interactCooldown: number = 0;
    private interactCooldownMax: number = 500;

    // --- References ---
    private gameState: GameState;

    constructor(scene: Phaser.Scene, x: number, y: number, config: IInteractableConfig) {
        super(scene, x, y, config.spriteKey);

        scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
        scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject, true); // Static body

        this.objectId = config.objectId;
        this.objectType = config.type;
        this.promptText = config.promptText ?? this.getDefaultPrompt(config.type);
        this.interactionRadius = config.interactionRadius ?? 50;
        this.oneTimeUse = config.oneTimeUse ?? (config.type === 'chest');
        this.rewardItem = config.rewardItem ?? null;
        this.rewardCount = config.rewardCount ?? 1;
        this.targetDestination = config.targetDestination ?? null;
        this.requiredItem = config.requiredItem ?? null;

        this.gameState = GameState.getInstance();

        // Check if already used (persisted state)
        const persistedState = this.gameState.getFlag(`interactable_${this.objectId}`) as string | undefined;
        if (persistedState) {
            this.currentState = persistedState as TInteractableState;
            this.hasBeenUsed = this.oneTimeUse && (persistedState === 'open' || persistedState === 'activated');
        } else {
            this.currentState = config.initialState ?? 'default';
        }

        this.setDepth(DEPTH.ITEMS);

        // Create interaction prompt label (hidden by default)
        this.promptLabel = scene.add.text(x, y - 30, this.promptText, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 6, y: 3 },
        });
        this.promptLabel.setOrigin(0.5, 1);
        this.promptLabel.setDepth(DEPTH.UI);
        this.promptLabel.setVisible(false);

        // Apply visual state
        this.applyVisualState();

        Logger.debug('Interactable', `${this.objectType} "${this.objectId}" created. State: ${this.currentState}`);
    }

    /** Get default prompt text based on object type */
    private getDefaultPrompt(type: TInteractableType): string {
        switch (type) {
            case 'chest': return '[E] Open';
            case 'door': return '[E] Enter';
            case 'save_point': return '[E] Save';
            case 'lever': return '[E] Pull';
            case 'sign': return '[E] Read';
            default: return '[E] Interact';
        }
    }

    // =====================================================================
    // UPDATE
    // =====================================================================

    public update(time: number, delta: number): void {
        if (!this.active) return;

        // Update cooldown
        if (this.interactCooldown > 0) {
            this.interactCooldown -= delta;
            if (this.interactCooldown <= 0) {
                this.canInteract = true;
            }
        }

        // Update prompt position
        if (this.promptLabel) {
            this.promptLabel.setPosition(this.x, this.y - 30);
        }
    }

    // =====================================================================
    // PLAYER PROXIMITY
    // =====================================================================

    /**
     * Check whether a player is within interaction range.
     * @param player The player sprite
     * @returns true if in range
     */
    public checkPlayerProximity(player: Phaser.Physics.Arcade.Sprite): boolean {
        if (!this.active || !player.active) {
            this.setPlayerInRange(false);
            return false;
        }

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const inRange = distance <= this.interactionRadius;

        this.setPlayerInRange(inRange);
        return inRange;
    }

    private setPlayerInRange(inRange: boolean): void {
        if (this.playerInRange === inRange) return;
        this.playerInRange = inRange;

        // Show/hide prompt
        if (this.promptLabel) {
            const shouldShow = inRange && !this.hasBeenUsed;
            this.promptLabel.setVisible(shouldShow);
        }
    }

    // =====================================================================
    // INTERACTION
    // =====================================================================

    /**
     * Trigger interaction with this object.
     * @returns true if the interaction was successful
     */
    public interact(): boolean {
        if (!this.playerInRange || !this.canInteract) return false;
        if (this.hasBeenUsed && this.oneTimeUse) return false;

        // Check required item
        if (this.requiredItem) {
            if (this.gameState.getItemCount(this.requiredItem) <= 0) {
                this.scene.events.emit('interactable_locked', {
                    object: this,
                    objectId: this.objectId,
                    type: this.objectType,
                    requiredItem: this.requiredItem,
                });
                Logger.debug('Interactable', `${this.objectId} requires item: ${this.requiredItem}`);
                return false;
            }
        }

        // Apply cooldown
        this.canInteract = false;
        this.interactCooldown = this.interactCooldownMax;

        // Execute interaction based on type
        switch (this.objectType) {
            case 'chest':
                this.openChest();
                break;
            case 'door':
                this.useDoor();
                break;
            case 'save_point':
                this.useSavePoint();
                break;
            case 'lever':
                this.pullLever();
                break;
            case 'sign':
                this.readSign();
                break;
            default:
                this.genericInteract();
                break;
        }

        return true;
    }

    // =====================================================================
    // INTERACTION TYPES
    // =====================================================================

    private openChest(): void {
        this.setInteractState('open');
        this.hasBeenUsed = true;

        // Grant reward
        if (this.rewardItem) {
            this.gameState.addItem(this.rewardItem, this.rewardCount);
        }

        this.scene.events.emit('interactable_opened', {
            object: this,
            objectId: this.objectId,
            type: 'chest',
            rewardItem: this.rewardItem,
            rewardCount: this.rewardCount,
        });

        // Hide prompt
        if (this.promptLabel) {
            this.promptLabel.setVisible(false);
        }

        Logger.info('Interactable', `Chest "${this.objectId}" opened. Reward: ${this.rewardItem} x${this.rewardCount}`);
    }

    private useDoor(): void {
        this.scene.events.emit('interactable_door', {
            object: this,
            objectId: this.objectId,
            type: 'door',
            destination: this.targetDestination,
        });

        Logger.info('Interactable', `Door "${this.objectId}" used. Destination: ${this.targetDestination}`);
    }

    private useSavePoint(): void {
        this.setInteractState('activated');

        this.scene.events.emit('interactable_save', {
            object: this,
            objectId: this.objectId,
            type: 'save_point',
            position: { x: this.x, y: this.y },
        });

        Logger.info('Interactable', `Save point "${this.objectId}" activated`);
    }

    private pullLever(): void {
        const newState: TInteractableState = this.currentState === 'activated' ? 'default' : 'activated';
        this.setInteractState(newState);

        this.scene.events.emit('interactable_lever', {
            object: this,
            objectId: this.objectId,
            type: 'lever',
            activated: newState === 'activated',
        });

        Logger.info('Interactable', `Lever "${this.objectId}" ${newState === 'activated' ? 'activated' : 'deactivated'}`);
    }

    private readSign(): void {
        this.scene.events.emit('interactable_sign', {
            object: this,
            objectId: this.objectId,
            type: 'sign',
        });

        Logger.debug('Interactable', `Sign "${this.objectId}" read`);
    }

    private genericInteract(): void {
        this.scene.events.emit('interactable_generic', {
            object: this,
            objectId: this.objectId,
            type: this.objectType,
            state: this.currentState,
        });

        Logger.debug('Interactable', `Generic interaction: "${this.objectId}"`);
    }

    // =====================================================================
    // STATE MANAGEMENT
    // =====================================================================

    /** Set a new state and persist it */
    public setInteractState(newState: TInteractableState): void {
        this.currentState = newState;

        // Persist to GameState
        this.gameState.setFlag(`interactable_${this.objectId}`, newState);

        // Update visual
        this.applyVisualState();
    }

    /** Apply visual changes based on current state */
    private applyVisualState(): void {
        // Try to play a state-specific animation
        const animKey = `${this.texture.key}_${this.currentState}`;
        if (this.scene.anims.exists(animKey)) {
            this.play(animKey, true);
        }

        // Visual hints by state
        switch (this.currentState) {
            case 'locked':
                this.setTint(0x888888);
                break;
            case 'disabled':
                this.setAlpha(0.5);
                break;
            case 'activated':
                this.setTint(0x88ff88);
                break;
            default:
                this.clearTint();
                this.setAlpha(1);
                break;
        }
    }

    // =====================================================================
    // CLEANUP
    // =====================================================================

    public destroy(fromScene?: boolean): void {
        if (this.promptLabel) {
            this.promptLabel.destroy();
            this.promptLabel = null;
        }
        super.destroy(fromScene);
    }

    // =====================================================================
    // ACCESSORS
    // =====================================================================

    public getObjectId(): string { return this.objectId; }
    public getObjectType(): TInteractableType { return this.objectType; }
    public getCurrentState(): TInteractableState { return this.currentState; }
    public getIsUsed(): boolean { return this.hasBeenUsed; }
    public getIsPlayerInRange(): boolean { return this.playerInRange; }
    public getTargetDestination(): string | null { return this.targetDestination; }
}
