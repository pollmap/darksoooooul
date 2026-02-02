import Phaser from 'phaser';
import { DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/** Configuration for spawning or resetting a projectile */
export interface IProjectileConfig {
    /** Sprite texture key */
    spriteKey?: string;
    /** Travel speed in pixels per second */
    speed: number;
    /** Damage dealt on hit */
    damage: number;
    /** Horizontal direction: 1 = right, -1 = left */
    directionX: number;
    /** Vertical direction: 1 = down, -1 = up, 0 = horizontal only */
    directionY?: number;
    /** Time in ms before auto-destroy */
    lifetime?: number;
    /** Who fired this projectile: 'player' | 'enemy' */
    source?: 'player' | 'enemy';
}

/**
 * Generic projectile entity for ranged attacks.
 *
 * Configurable speed, damage, direction, and lifetime.
 * Auto-destroys on collision or timeout.
 * Supports object pool via reset().
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
    // --- Configuration ---
    private projectileSpeed: number = 300;
    private damage: number = 5;
    private directionX: number = 1;
    private directionY: number = 0;
    private lifetime: number = 3000;
    private lifetimeTimer: number = 0;
    private source: 'player' | 'enemy' = 'enemy';

    constructor(scene: Phaser.Scene, x: number, y: number, config?: IProjectileConfig) {
        super(scene, x, y, config?.spriteKey ?? 'projectile_default');

        scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
        scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

        this.setDepth(DEPTH.PROJECTILES);

        if (config) {
            this.configure(config);
        } else {
            // Start inactive until configured
            this.setActive(false);
            this.setVisible(false);
        }
    }

    /** Configure the projectile with new parameters */
    public configure(config: IProjectileConfig): void {
        this.projectileSpeed = config.speed;
        this.damage = config.damage;
        this.directionX = config.directionX;
        this.directionY = config.directionY ?? 0;
        this.lifetime = config.lifetime ?? 3000;
        this.lifetimeTimer = this.lifetime;
        this.source = config.source ?? 'enemy';

        if (config.spriteKey) {
            this.setTexture(config.spriteKey);
        }

        // Flip sprite based on direction
        this.setFlipX(this.directionX < 0);

        // Set velocity
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setAllowGravity(false);
            // Normalize direction vector
            const len = Math.sqrt(this.directionX * this.directionX + this.directionY * this.directionY);
            const nx = len > 0 ? this.directionX / len : this.directionX;
            const ny = len > 0 ? this.directionY / len : this.directionY;
            body.setVelocity(nx * this.projectileSpeed, ny * this.projectileSpeed);
        }

        this.setActive(true);
        this.setVisible(true);
    }

    // =====================================================================
    // UPDATE
    // =====================================================================

    public update(time: number, delta: number): void {
        if (!this.active) return;

        // Lifetime countdown
        this.lifetimeTimer -= delta;
        if (this.lifetimeTimer <= 0) {
            this.deactivate();
            return;
        }

        // Check if out of world bounds
        const bounds = this.scene.physics.world.bounds;
        if (this.x < bounds.x - 50 || this.x > bounds.right + 50 ||
            this.y < bounds.y - 50 || this.y > bounds.bottom + 50) {
            this.deactivate();
        }
    }

    // =====================================================================
    // COLLISION
    // =====================================================================

    /**
     * Called when the projectile hits something.
     * The combat system should call this on overlap/collision.
     */
    public onHit(): void {
        this.deactivate();
    }

    /** Deactivate the projectile (hide and stop physics) */
    private deactivate(): void {
        this.setActive(false);
        this.setVisible(false);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setVelocity(0, 0);
            body.setEnable(false);
        }
    }

    // =====================================================================
    // OBJECT POOL
    // =====================================================================

    /** Reset for object pool reuse */
    public reset(): void {
        this.projectileSpeed = 300;
        this.damage = 5;
        this.directionX = 1;
        this.directionY = 0;
        this.lifetime = 3000;
        this.lifetimeTimer = 0;
        this.source = 'enemy';

        this.setActive(false);
        this.setVisible(false);
        this.clearTint();
        this.setAlpha(1);
        this.setScale(1);
        this.setFlipX(false);
        this.setFlipY(false);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setVelocity(0, 0);
            body.setEnable(false);
        }
    }

    /**
     * Fire the projectile from a position with given config.
     * Useful for pool-based spawning.
     */
    public fire(x: number, y: number, config: IProjectileConfig): void {
        this.setPosition(x, y);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setEnable(true);
        }

        this.configure(config);
    }

    // =====================================================================
    // ACCESSORS
    // =====================================================================

    public getDamage(): number { return this.damage; }
    public getSource(): 'player' | 'enemy' { return this.source; }
    public getRemainingLifetime(): number { return this.lifetimeTimer; }
}
