import Phaser from 'phaser';
import { Logger } from '../utils/Logger';
import { COOP, COLORS, DEPTH } from '../utils/Constants';
import { GameState } from '../state/GameState';

/** Player 2 state for co-op tracking */
interface IPlayer2State {
    sprite: Phaser.Physics.Arcade.Sprite;
    health: number;
    maxHealth: number;
    alive: boolean;
    deathTimestamp: number;
    reviving: boolean;
    reviveStartTime: number;
}

/**
 * Co-op system managing two-player cooperative gameplay.
 * Handles player 2 join/leave, camera management for split tracking,
 * teleportation when players are too far apart, a timed revive
 * mechanic, and difficulty scaling for enemies and bosses.
 *
 * When co-op is active, enemies gain 1.5x HP (bosses 1.8x),
 * the camera dynamically zooms to keep both players visible,
 * and a revive system allows the surviving player to resurrect
 * their partner within a countdown window.
 */
export class CoopSystem {
    private scene: Phaser.Scene;
    private gameState: GameState;

    /** Player 1 sprite reference */
    private player1Sprite: Phaser.Physics.Arcade.Sprite | null = null;

    /** Player 2 state (null when co-op is not active) */
    private player2: IPlayer2State | null = null;

    /** Whether co-op mode is currently active */
    private coopActive: boolean = false;

    /** Camera reference */
    private camera: Phaser.Cameras.Scene2D.Camera | null = null;

    /** Base camera zoom before co-op adjustments */
    private baseCameraZoom: number = 1.0;

    /** Maximum allowed distance between players in pixels */
    private maxDistance: number = 800;

    /** Revive proximity radius in pixels */
    private readonly REVIVE_RADIUS = 64;

    /** Revive progress UI elements */
    private reviveProgressBar: Phaser.GameObjects.Graphics | null = null;
    private reviveText: Phaser.GameObjects.Text | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.gameState = GameState.getInstance();
        Logger.info('CoopSystem', 'Co-op system initialized');
    }

    // ─── Setup ─────────────────────────────────────────────────────────

    /**
     * Set the player 1 sprite reference for distance calculations.
     * @param sprite Player 1's physics sprite
     */
    public setPlayer1(sprite: Phaser.Physics.Arcade.Sprite): void {
        this.player1Sprite = sprite;
    }

    /**
     * Set the camera reference for zoom management.
     * @param camera The main game camera
     * @param baseZoom The default zoom level without co-op
     */
    public setCamera(camera: Phaser.Cameras.Scene2D.Camera, baseZoom: number = 1.0): void {
        this.camera = camera;
        this.baseCameraZoom = baseZoom;
    }

    /**
     * Set the maximum allowed distance between players before teleport.
     * @param distance Maximum distance in pixels
     */
    public setMaxDistance(distance: number): void {
        this.maxDistance = distance;
    }

    // ─── Join / Leave ──────────────────────────────────────────────────

    /**
     * Handle player 2 joining the game.
     * Creates the player 2 entity and activates co-op mode.
     * @param sprite Player 2's physics sprite
     * @param maxHealth Player 2's maximum health
     * @returns True if player 2 successfully joined
     */
    public player2Join(sprite: Phaser.Physics.Arcade.Sprite, maxHealth: number = 80): boolean {
        if (this.coopActive) {
            Logger.warn('CoopSystem', 'Player 2 already active');
            return false;
        }

        if (!this.player1Sprite) {
            Logger.warn('CoopSystem', 'Cannot join co-op: player 1 not set');
            return false;
        }

        this.player2 = {
            sprite,
            health: maxHealth,
            maxHealth,
            alive: true,
            deathTimestamp: 0,
            reviving: false,
            reviveStartTime: 0,
        };

        this.coopActive = true;
        this.gameState.setCoopActive(true);

        // Position player 2 near player 1
        sprite.setPosition(
            this.player1Sprite.x + 50,
            this.player1Sprite.y,
        );

        this.scene.events.emit('coop:player2Joined', {
            maxHealth,
        });

        Logger.info('CoopSystem', 'Player 2 joined co-op');
        return true;
    }

    /**
     * Handle player 2 leaving the game.
     * Deactivates co-op mode and cleans up.
     */
    public player2Leave(): void {
        if (!this.coopActive || !this.player2) return;

        this.cleanupReviveUI();

        this.player2.sprite.destroy();
        this.player2 = null;
        this.coopActive = false;
        this.gameState.setCoopActive(false);

        // Reset camera
        if (this.camera) {
            this.camera.setZoom(this.baseCameraZoom);
            if (this.player1Sprite) {
                this.camera.startFollow(this.player1Sprite, true, 0.1, 0.1);
            }
        }

        this.scene.events.emit('coop:player2Left');
        Logger.info('CoopSystem', 'Player 2 left co-op');
    }

    /**
     * Whether co-op mode is currently active.
     */
    public isCoopActive(): boolean {
        return this.coopActive;
    }

    // ─── Per-frame Update ──────────────────────────────────────────────

    /**
     * Update the co-op system each frame.
     * Handles camera tracking, distance checking, teleportation,
     * and revive countdown.
     * @param time Current game time in ms
     * @param delta Frame delta in ms
     */
    public update(time: number, delta: number): void {
        if (!this.coopActive || !this.player1Sprite || !this.player2) return;

        // Update camera to track midpoint between players
        this.updateCamera();

        // Check distance and teleport if needed
        this.checkDistance();

        // Handle revive mechanics
        this.updateRevive(time);
    }

    // ─── Camera Management ─────────────────────────────────────────────

    /**
     * Update the camera to track the midpoint between both players
     * and adjust zoom based on their distance apart.
     */
    private updateCamera(): void {
        if (!this.camera || !this.player1Sprite || !this.player2) return;

        const p1x = this.player1Sprite.x;
        const p1y = this.player1Sprite.y;
        const p2x = this.player2.sprite.x;
        const p2y = this.player2.sprite.y;

        // Calculate midpoint
        const midX = (p1x + p2x) / 2;
        const midY = (p1y + p2y) / 2;

        // Calculate distance
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Dynamic zoom: zoom out as players get further apart
        const screenWidth = this.camera.width;
        const distanceRatio = distance / (screenWidth * COOP.MAX_DISTANCE_MULTIPLIER);
        const targetZoom = Phaser.Math.Clamp(
            this.baseCameraZoom * (1.0 - distanceRatio * 0.5),
            COOP.CAMERA_ZOOM_MIN,
            COOP.CAMERA_ZOOM_MAX,
        );

        // Smooth zoom transition
        const currentZoom = this.camera.zoom;
        const lerpedZoom = Phaser.Math.Linear(currentZoom, targetZoom, 0.05);
        this.camera.setZoom(lerpedZoom);

        // Smooth scroll to midpoint
        this.camera.centerOn(midX, midY);
    }

    // ─── Distance / Teleport ───────────────────────────────────────────

    /**
     * Check the distance between players and teleport player 2
     * to player 1 if they are too far apart.
     */
    private checkDistance(): void {
        if (!this.player1Sprite || !this.player2 || !this.player2.alive) return;

        const dx = this.player2.sprite.x - this.player1Sprite.x;
        const dy = this.player2.sprite.y - this.player1Sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.maxDistance) {
            this.teleportPlayer2ToPlayer1();
        }
    }

    /**
     * Teleport player 2 to player 1's position with a brief
     * invincibility period.
     */
    private teleportPlayer2ToPlayer1(): void {
        if (!this.player1Sprite || !this.player2) return;

        const targetX = this.player1Sprite.x + 40;
        const targetY = this.player1Sprite.y;

        this.player2.sprite.setPosition(targetX, targetY);
        this.player2.sprite.setVelocity(0, 0);

        // Grant brief invincibility after teleport
        this.player2.sprite.setData('invincibleUntil', this.scene.time.now + COOP.TELEPORT_INVINCIBILITY);

        // Visual effect
        this.showTeleportEffect(targetX, targetY);

        this.scene.events.emit('coop:player2Teleported', {
            x: targetX,
            y: targetY,
        });

        Logger.debug('CoopSystem', 'Player 2 teleported to player 1');
    }

    /**
     * Show a visual effect at the teleport destination.
     */
    private showTeleportEffect(x: number, y: number): void {
        const circle = this.scene.add
            .circle(x, y, 8, COLORS.PLAYER2_ACCENT, 0.8)
            .setDepth(DEPTH.EFFECTS);

        this.scene.tweens.add({
            targets: circle,
            scaleX: 5,
            scaleY: 5,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => circle.destroy(),
        });
    }

    // ─── Revive System ─────────────────────────────────────────────────

    /**
     * Handle player 2 taking damage.
     * @param damage The damage amount
     */
    public damagePlayer2(damage: number): void {
        if (!this.player2 || !this.player2.alive) return;

        this.player2.health = Math.max(0, this.player2.health - damage);

        this.scene.events.emit('coop:player2Damaged', {
            damage,
            remainingHealth: this.player2.health,
        });

        if (this.player2.health <= 0) {
            this.player2Down();
        }
    }

    /**
     * Mark player 2 as downed and start the revive countdown.
     */
    private player2Down(): void {
        if (!this.player2) return;

        this.player2.alive = false;
        this.player2.deathTimestamp = this.scene.time.now;
        this.player2.reviving = false;

        // Visual: tint the sprite to show downed state
        this.player2.sprite.setTint(0x666666);
        this.player2.sprite.setVelocity(0, 0);

        this.scene.events.emit('coop:player2Down', {
            reviveCountdown: COOP.REVIVE_COUNTDOWN,
        });

        Logger.info('CoopSystem', 'Player 2 is down, revive countdown started');
    }

    /**
     * Update the revive mechanic each frame.
     * If player 1 is close enough and both conditions are met,
     * a channel bar fills over REVIVE_TIME. If the countdown
     * expires, player 2 is removed.
     */
    private updateRevive(time: number): void {
        if (!this.player2 || this.player2.alive || !this.player1Sprite) return;

        // Check if revive countdown has expired
        const timeSinceDeath = time - this.player2.deathTimestamp;
        if (timeSinceDeath >= COOP.REVIVE_COUNTDOWN) {
            this.reviveFailed();
            return;
        }

        // Check if player 1 is in range to revive
        const dx = this.player2.sprite.x - this.player1Sprite.x;
        const dy = this.player2.sprite.y - this.player1Sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const inRange = distance <= this.REVIVE_RADIUS;

        if (inRange) {
            if (!this.player2.reviving) {
                // Start revive channel
                this.player2.reviving = true;
                this.player2.reviveStartTime = time;
                this.showReviveUI();

                this.scene.events.emit('coop:reviveStart');
                Logger.debug('CoopSystem', 'Revive channeling started');
            }

            // Update revive progress
            const reviveElapsed = time - this.player2.reviveStartTime;
            const progress = Math.min(1.0, reviveElapsed / COOP.REVIVE_TIME);

            this.updateReviveUI(progress);

            if (reviveElapsed >= COOP.REVIVE_TIME) {
                this.reviveSuccess();
            }
        } else {
            // Out of range, cancel channel
            if (this.player2.reviving) {
                this.player2.reviving = false;
                this.cleanupReviveUI();

                this.scene.events.emit('coop:reviveCancelled');
                Logger.debug('CoopSystem', 'Revive cancelled (out of range)');
            }
        }

        // Emit countdown update
        const remainingCountdown = Math.max(0, COOP.REVIVE_COUNTDOWN - timeSinceDeath);
        this.scene.events.emit('coop:reviveCountdown', {
            remaining: remainingCountdown,
            total: COOP.REVIVE_COUNTDOWN,
        });
    }

    /**
     * Successfully revive player 2.
     */
    private reviveSuccess(): void {
        if (!this.player2) return;

        this.player2.alive = true;
        this.player2.health = Math.floor(this.player2.maxHealth * COOP.REVIVE_HP_PERCENT);
        this.player2.reviving = false;

        // Restore visual
        this.player2.sprite.clearTint();

        // Brief invincibility
        this.player2.sprite.setData(
            'invincibleUntil',
            this.scene.time.now + COOP.TELEPORT_INVINCIBILITY,
        );

        this.cleanupReviveUI();

        this.scene.events.emit('coop:player2Revived', {
            health: this.player2.health,
        });

        Logger.info('CoopSystem', `Player 2 revived with ${this.player2.health} HP`);
    }

    /**
     * Handle revive failure (countdown expired).
     * Player 2 is removed from the game until the next checkpoint.
     */
    private reviveFailed(): void {
        if (!this.player2) return;

        this.cleanupReviveUI();

        this.player2.sprite.setAlpha(0.3);
        this.player2.sprite.setActive(false);

        this.scene.events.emit('coop:reviveFailed');
        Logger.info('CoopSystem', 'Revive failed, player 2 eliminated until checkpoint');
    }

    // ─── Revive UI ─────────────────────────────────────────────────────

    /**
     * Create the revive progress bar UI above player 2.
     */
    private showReviveUI(): void {
        this.cleanupReviveUI();

        if (!this.player2) return;

        this.reviveProgressBar = this.scene.add
            .graphics()
            .setDepth(DEPTH.UI);

        this.reviveText = this.scene.add
            .text(this.player2.sprite.x, this.player2.sprite.y - 40, 'REVIVING...', {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#00ffcc',
                stroke: '#000000',
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.UI);
    }

    /**
     * Update the revive progress bar fill.
     */
    private updateReviveUI(progress: number): void {
        if (!this.reviveProgressBar || !this.player2) return;

        const x = this.player2.sprite.x - 20;
        const y = this.player2.sprite.y - 30;
        const width = 40;
        const height = 4;

        this.reviveProgressBar.clear();

        // Background
        this.reviveProgressBar.fillStyle(0x333333, 0.8);
        this.reviveProgressBar.fillRect(x, y, width, height);

        // Fill
        this.reviveProgressBar.fillStyle(0x00ffcc, 1.0);
        this.reviveProgressBar.fillRect(x, y, width * progress, height);

        // Update text position
        if (this.reviveText) {
            this.reviveText.setPosition(this.player2.sprite.x, this.player2.sprite.y - 40);
        }
    }

    /**
     * Clean up revive UI elements.
     */
    private cleanupReviveUI(): void {
        if (this.reviveProgressBar) {
            this.reviveProgressBar.destroy();
            this.reviveProgressBar = null;
        }
        if (this.reviveText) {
            this.reviveText.destroy();
            this.reviveText = null;
        }
    }

    // ─── Difficulty Scaling ────────────────────────────────────────────

    /**
     * Get the HP multiplier for enemies when co-op is active.
     * @param isBoss Whether the enemy is a boss
     * @returns The HP multiplier (1.0 if solo)
     */
    public getEnemyHpMultiplier(isBoss: boolean = false): number {
        if (!this.coopActive) return 1.0;
        return isBoss ? COOP.BOSS_HP_MULTIPLIER : COOP.ENEMY_HP_MULTIPLIER;
    }

    /**
     * Get the item drop rate multiplier for co-op.
     * @returns The drop rate multiplier (1.0 if solo)
     */
    public getItemDropMultiplier(): number {
        return this.coopActive ? COOP.ITEM_DROP_MULTIPLIER : 1.0;
    }

    /**
     * Get the EXP multiplier for co-op.
     * @returns The EXP multiplier (1.0 if solo)
     */
    public getExpMultiplier(): number {
        return this.coopActive ? COOP.EXP_MULTIPLIER : 1.0;
    }

    /**
     * Scale an enemy's health for co-op mode.
     * @param baseHealth The enemy's base health value
     * @param isBoss Whether the enemy is a boss
     * @returns The scaled health value
     */
    public scaleEnemyHealth(baseHealth: number, isBoss: boolean = false): number {
        return Math.floor(baseHealth * this.getEnemyHpMultiplier(isBoss));
    }

    // ─── Query Methods ─────────────────────────────────────────────────

    /**
     * Get player 2's current health.
     * @returns Health value, or 0 if not in co-op
     */
    public getPlayer2Health(): number {
        return this.player2?.health ?? 0;
    }

    /**
     * Get player 2's max health.
     * @returns Max health value, or 0 if not in co-op
     */
    public getPlayer2MaxHealth(): number {
        return this.player2?.maxHealth ?? 0;
    }

    /**
     * Check if player 2 is alive.
     */
    public isPlayer2Alive(): boolean {
        return this.player2?.alive ?? false;
    }

    /**
     * Get the player 2 sprite, if active.
     */
    public getPlayer2Sprite(): Phaser.Physics.Arcade.Sprite | null {
        return this.player2?.sprite ?? null;
    }

    /**
     * Heal player 2 by a given amount.
     * @param amount HP to restore
     */
    public healPlayer2(amount: number): void {
        if (!this.player2 || !this.player2.alive) return;
        this.player2.health = Math.min(this.player2.maxHealth, this.player2.health + amount);

        this.scene.events.emit('coop:player2Healed', {
            health: this.player2.health,
            amount,
        });
    }

    /**
     * Respawn player 2 at full health (e.g., at a checkpoint).
     */
    public respawnPlayer2(): void {
        if (!this.player2 || !this.player1Sprite) return;

        this.player2.alive = true;
        this.player2.health = this.player2.maxHealth;
        this.player2.reviving = false;
        this.player2.sprite.setActive(true);
        this.player2.sprite.setAlpha(1);
        this.player2.sprite.clearTint();

        // Position near player 1
        this.player2.sprite.setPosition(
            this.player1Sprite.x + 50,
            this.player1Sprite.y,
        );

        this.cleanupReviveUI();

        this.scene.events.emit('coop:player2Respawned', {
            health: this.player2.health,
        });

        Logger.info('CoopSystem', 'Player 2 respawned at checkpoint');
    }

    // ─── Cleanup ───────────────────────────────────────────────────────

    /**
     * Clean up all co-op state and UI. Call when leaving a scene.
     */
    public destroy(): void {
        this.cleanupReviveUI();

        if (this.player2) {
            this.player2.sprite.destroy();
            this.player2 = null;
        }

        this.coopActive = false;
        this.player1Sprite = null;
        this.camera = null;

        Logger.info('CoopSystem', 'Co-op system destroyed');
    }
}
