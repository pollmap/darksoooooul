import Phaser from 'phaser';
import { DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/** Configuration for spawning a dropped item */
export interface IItemConfig {
    /** Item identifier matching items.json keys */
    itemId: string;
    /** Display name */
    name?: string;
    /** Sprite texture key */
    spriteKey?: string;
    /** Number of items in this drop */
    count?: number;
    /** Delay in ms before auto-collect is enabled */
    autoCollectDelay?: number;
    /** Whether to play bounce animation on spawn */
    bounce?: boolean;
}

/**
 * Dropped item entity that appears in the world.
 *
 * Features:
 * - Bounce animation on spawn
 * - Pickup on player overlap
 * - Auto-collect after a configurable delay
 * - Supports object pool via reset()
 */
export class Item extends Phaser.Physics.Arcade.Sprite {
    // --- Configuration ---
    private itemId: string = '';
    private itemName: string = '';
    private itemCount: number = 1;
    private autoCollectDelay: number = 2000;

    // --- Runtime ---
    private isCollectable: boolean = false;
    private collectTimer: number = 0;
    private isCollected: boolean = false;
    private bounceComplete: boolean = false;

    // --- Auto-collect ---
    private autoCollectTimer: number = 0;
    private autoCollectEnabled: boolean = false;
    private autoCollectRange: number = 100;

    constructor(scene: Phaser.Scene, x: number, y: number, config?: IItemConfig) {
        super(scene, x, y, config?.spriteKey ?? 'item_default');

        scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
        scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

        this.setDepth(DEPTH.ITEMS);

        if (config) {
            this.configure(config);
        } else {
            this.setActive(false);
            this.setVisible(false);
        }
    }

    /** Configure the item with data */
    public configure(config: IItemConfig): void {
        this.itemId = config.itemId;
        this.itemName = config.name ?? config.itemId;
        this.itemCount = config.count ?? 1;
        this.autoCollectDelay = config.autoCollectDelay ?? 2000;

        if (config.spriteKey) {
            this.setTexture(config.spriteKey);
        }

        this.isCollectable = false;
        this.isCollected = false;
        this.collectTimer = 0;
        this.autoCollectTimer = 0;
        this.autoCollectEnabled = false;
        this.bounceComplete = false;

        this.setActive(true);
        this.setVisible(true);
        this.setAlpha(1);
        this.setScale(1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setEnable(true);
            body.setSize(16, 16);
            body.setAllowGravity(true);
        }

        // Play bounce animation on spawn
        if (config.bounce !== false) {
            this.spawnBounce();
        } else {
            this.bounceComplete = true;
            this.isCollectable = true;
        }
    }

    // =====================================================================
    // SPAWN BOUNCE
    // =====================================================================

    /** Play a bounce animation when the item spawns */
    private spawnBounce(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        // Launch upward with random horizontal spread
        const horizontalSpread = Phaser.Math.Between(-80, 80);
        body.setVelocity(horizontalSpread, -200);

        // After a short delay, enable collection
        this.scene.time.delayedCall(400, () => {
            this.bounceComplete = true;
            this.isCollectable = true;
        });
    }

    // =====================================================================
    // UPDATE
    // =====================================================================

    public update(time: number, delta: number): void {
        if (!this.active || this.isCollected) return;

        const dtMs = delta;

        // Gentle floating animation after bounce completes
        if (this.bounceComplete) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body && (body.blocked.down || body.touching.down)) {
                body.setVelocity(0, 0);
                body.setAllowGravity(false);

                // Bobbing effect
                const bob = Math.sin(time * 0.004) * 2;
                this.y = (this.body as Phaser.Physics.Arcade.Body).y + bob;
            }
        }

        // Auto-collect timer
        if (this.isCollectable && !this.autoCollectEnabled) {
            this.autoCollectTimer += dtMs;
            if (this.autoCollectTimer >= this.autoCollectDelay) {
                this.autoCollectEnabled = true;
            }
        }
    }

    // =====================================================================
    // PICKUP
    // =====================================================================

    /**
     * Attempt to pick up this item.
     * Called by the scene on player-item overlap.
     * @returns true if the item was successfully picked up
     */
    public pickup(): boolean {
        if (!this.isCollectable || this.isCollected) return false;

        this.isCollected = true;

        // Emit pickup event
        this.scene.events.emit('item_picked_up', {
            item: this,
            itemId: this.itemId,
            name: this.itemName,
            count: this.itemCount,
        });

        // Pickup animation: scale up and fade out
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            y: this.y - 20,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.deactivate();
            },
        });

        Logger.debug('Item', `Picked up: ${this.itemName} x${this.itemCount}`);
        return true;
    }

    /**
     * Check if auto-collect should trigger for a nearby player.
     * @param playerX Player x position
     * @param playerY Player y position
     * @returns true if within auto-collect range and auto-collect is enabled
     */
    public checkAutoCollect(playerX: number, playerY: number): boolean {
        if (!this.autoCollectEnabled || this.isCollected || !this.isCollectable) return false;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
        return distance <= this.autoCollectRange;
    }

    /** Deactivate the item after collection */
    private deactivate(): void {
        this.setActive(false);
        this.setVisible(false);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setEnable(false);
            body.setVelocity(0, 0);
        }
    }

    // =====================================================================
    // OBJECT POOL
    // =====================================================================

    /** Reset for object pool reuse */
    public reset(): void {
        this.itemId = '';
        this.itemName = '';
        this.itemCount = 1;
        this.isCollectable = false;
        this.isCollected = false;
        this.collectTimer = 0;
        this.autoCollectTimer = 0;
        this.autoCollectEnabled = false;
        this.bounceComplete = false;

        this.setActive(false);
        this.setVisible(false);
        this.clearTint();
        this.setAlpha(1);
        this.setScale(1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setEnable(false);
            body.setVelocity(0, 0);
            body.setAllowGravity(true);
        }
    }

    /**
     * Spawn the item at a position with config.
     * Useful for pool-based spawning.
     */
    public spawn(x: number, y: number, config: IItemConfig): void {
        this.setPosition(x, y);
        this.configure(config);
    }

    // =====================================================================
    // ACCESSORS
    // =====================================================================

    public getItemId(): string { return this.itemId; }
    public getItemName(): string { return this.itemName; }
    public getItemCount(): number { return this.itemCount; }
    public getIsCollectable(): boolean { return this.isCollectable; }
    public getIsCollected(): boolean { return this.isCollected; }
}
