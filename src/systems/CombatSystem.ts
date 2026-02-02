import Phaser from 'phaser';
import { IPlayerState, IParryConfig } from '../types/player.types';
import { IEnemyData } from '../types/enemy.types';
import { Logger } from '../utils/Logger';
import { COMBAT, COLORS, DEPTH } from '../utils/Constants';
import { GameState } from '../state/GameState';

/** Result of a parry attempt */
type TParryResult = 'perfect' | 'normal' | 'fail';

/** Tracked hit entry for co-op bonus calculation */
interface IRecentHit {
    playerIndex: number;
    enemyId: string;
    timestamp: number;
}

/** Registered player entity */
interface ICombatPlayer {
    sprite: Phaser.Physics.Arcade.Sprite;
    playerIndex: number;
    state: IPlayerState;
    isParrying: boolean;
    parryStartTime: number;
    invincibleUntil: number;
    lastAttackTime: number;
}

/** Registered enemy entity */
interface ICombatEnemy {
    id: string;
    sprite: Phaser.Physics.Arcade.Sprite;
    data: IEnemyData;
    currentHealth: number;
    isBoss: boolean;
    lastAttackTime: number;
    telegraphStart: number;
    isAttacking: boolean;
}

/**
 * Combat system managing player attacks, enemy attacks, hit detection,
 * parrying mechanics, and cooperative play bonuses.
 *
 * Handles the full combat loop including hitbox overlap checks,
 * perfect/normal parry windows, time-slow effects on perfect parries,
 * co-op bonus tracking within a short time window, and visual feedback
 * for hits, parries, and co-op bonuses.
 */
export class CombatSystem {
    private scene: Phaser.Scene;
    private gameState: GameState;

    private players: Map<number, ICombatPlayer> = new Map();
    private enemies: Map<string, ICombatEnemy> = new Map();

    private recentHits: IRecentHit[] = [];
    private readonly COOP_WINDOW_MS = COMBAT.COOP_BONUS_WINDOW;
    private readonly COOP_MULTIPLIER = COMBAT.COOP_BONUS_MULTIPLIER;

    private parryConfig: IParryConfig = {
        windowPerfect: 100,
        windowNormal: 250,
        stunDuration: 1200,
    };

    private timeSlowActive: boolean = false;
    private timeSlowEndTime: number = 0;
    private readonly TIME_SLOW_DURATION = 600;
    private readonly TIME_SLOW_SCALE = 0.3;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.gameState = GameState.getInstance();
        Logger.info('CombatSystem', 'Combat system initialized');
    }

    // ─── Player Registration ───────────────────────────────────────────

    /**
     * Register a player entity with the combat system.
     * @param playerIndex 1 or 2
     * @param sprite The player's physics sprite
     * @param state The player's runtime state
     */
    public registerPlayer(
        playerIndex: number,
        sprite: Phaser.Physics.Arcade.Sprite,
        state: IPlayerState,
    ): void {
        this.players.set(playerIndex, {
            sprite,
            playerIndex,
            state,
            isParrying: false,
            parryStartTime: 0,
            invincibleUntil: 0,
            lastAttackTime: 0,
        });
        Logger.info('CombatSystem', `Player ${playerIndex} registered`);
    }

    /**
     * Unregister a player from the combat system.
     * @param playerIndex 1 or 2
     */
    public unregisterPlayer(playerIndex: number): void {
        this.players.delete(playerIndex);
        Logger.info('CombatSystem', `Player ${playerIndex} unregistered`);
    }

    // ─── Enemy Registration ────────────────────────────────────────────

    /**
     * Register an enemy entity with the combat system.
     * @param id Unique enemy instance identifier
     * @param sprite The enemy's physics sprite
     * @param data The base enemy data
     * @param isBoss Whether this enemy is a boss
     * @param healthOverride Optional HP override (used for co-op scaling)
     */
    public registerEnemy(
        id: string,
        sprite: Phaser.Physics.Arcade.Sprite,
        data: IEnemyData,
        isBoss: boolean = false,
        healthOverride?: number,
    ): void {
        this.enemies.set(id, {
            id,
            sprite,
            data,
            currentHealth: healthOverride ?? data.health,
            isBoss,
            lastAttackTime: 0,
            telegraphStart: 0,
            isAttacking: false,
        });
        Logger.debug('CombatSystem', `Enemy registered: ${id} (${data.name})`);
    }

    /**
     * Unregister an enemy from the combat system.
     * @param id Unique enemy instance identifier
     */
    public unregisterEnemy(id: string): void {
        this.enemies.delete(id);
        Logger.debug('CombatSystem', `Enemy unregistered: ${id}`);
    }

    // ─── Parry Configuration ───────────────────────────────────────────

    /**
     * Override the default parry timing configuration.
     * @param config Partial parry config to merge
     */
    public setParryConfig(config: Partial<IParryConfig>): void {
        this.parryConfig = { ...this.parryConfig, ...config };
    }

    // ─── Per-frame Update ──────────────────────────────────────────────

    /**
     * Update the combat system each frame. Handles time-slow expiry
     * and purges stale co-op hit records.
     * @param time Current game time in ms
     * @param _delta Frame delta in ms
     */
    public update(time: number, _delta: number): void {
        // Handle time-slow expiry
        if (this.timeSlowActive && time >= this.timeSlowEndTime) {
            this.endTimeSlow();
        }

        // Purge stale co-op hit records
        const cutoff = time - this.COOP_WINDOW_MS;
        this.recentHits = this.recentHits.filter((h) => h.timestamp >= cutoff);
    }

    // ─── Player Attack ─────────────────────────────────────────────────

    /**
     * Handle a player attack event. Checks hitbox overlap against all
     * registered enemies and applies damage with co-op bonuses.
     * @param playerIndex Attacking player (1 or 2)
     * @param hitbox The attack hitbox rectangle in world coordinates
     * @param baseDamage The base damage amount before multipliers
     */
    public handlePlayerAttack(
        playerIndex: number,
        hitbox: Phaser.Geom.Rectangle,
        baseDamage: number,
    ): void {
        const player = this.players.get(playerIndex);
        if (!player) return;

        const now = this.scene.time.now;
        player.lastAttackTime = now;

        this.enemies.forEach((enemy) => {
            if (enemy.currentHealth <= 0) return;

            const enemyBounds = enemy.sprite.getBounds();
            if (!Phaser.Geom.Rectangle.Overlaps(hitbox, enemyBounds)) return;

            // Check co-op bonus: another player hit this enemy within the window
            let coopMultiplier = 1.0;
            if (this.players.size > 1) {
                const hasRecentPartnerHit = this.recentHits.some(
                    (h) =>
                        h.enemyId === enemy.id &&
                        h.playerIndex !== playerIndex &&
                        now - h.timestamp <= this.COOP_WINDOW_MS,
                );
                if (hasRecentPartnerHit) {
                    coopMultiplier = this.COOP_MULTIPLIER;
                    this.showCoopBonusText(enemy.sprite.x, enemy.sprite.y - 40);
                }
            }

            // Check critical hit
            let critMultiplier = 1.0;
            const isCrit = Math.random() < COMBAT.CRIT_CHANCE;
            if (isCrit) {
                critMultiplier = COMBAT.CRIT_MULTIPLIER;
            }

            // Check backstab
            if (COMBAT.BACKSTAB_CRIT && this.isBackstab(player, enemy)) {
                critMultiplier = Math.max(critMultiplier, COMBAT.CRIT_MULTIPLIER);
            }

            // Compute final damage
            const defense = enemy.data.defense || 0;
            const rawDamage = baseDamage * coopMultiplier * critMultiplier;
            const finalDamage = Math.max(1, Math.floor(rawDamage - defense));

            // Apply damage
            enemy.currentHealth -= finalDamage;
            this.showHitEffect(enemy.sprite.x, enemy.sprite.y, finalDamage, isCrit);

            // Record hit for co-op tracking
            this.recentHits.push({
                playerIndex,
                enemyId: enemy.id,
                timestamp: now,
            });

            // Knockback
            const knockDir = enemy.sprite.x > player.sprite.x ? 1 : -1;
            enemy.sprite.setVelocityX(knockDir * COMBAT.KNOCKBACK_FORCE);

            // Emit hit event
            this.scene.events.emit('combat:enemyHit', {
                enemyId: enemy.id,
                damage: finalDamage,
                isCrit,
                coopBonus: coopMultiplier > 1.0,
                remainingHealth: enemy.currentHealth,
            });

            // Check death
            if (enemy.currentHealth <= 0) {
                this.handleEnemyDeath(enemy, playerIndex);
            }
        });
    }

    // ─── Enemy Attack ──────────────────────────────────────────────────

    /**
     * Handle an enemy attack event. Checks hitbox overlap against all
     * registered players and evaluates parry windows.
     * @param enemyId The attacking enemy's identifier
     * @param hitbox The attack hitbox rectangle in world coordinates
     * @param baseDamage The base damage amount
     */
    public handleEnemyAttack(
        enemyId: string,
        hitbox: Phaser.Geom.Rectangle,
        baseDamage: number,
    ): void {
        const enemy = this.enemies.get(enemyId);
        if (!enemy) return;

        const now = this.scene.time.now;
        enemy.lastAttackTime = now;
        enemy.isAttacking = true;

        this.players.forEach((player) => {
            if (player.state.health <= 0) return;

            const playerBounds = player.sprite.getBounds();
            if (!Phaser.Geom.Rectangle.Overlaps(hitbox, playerBounds)) return;

            // Check invincibility
            if (now < player.invincibleUntil) return;

            // Check parry
            if (player.isParrying) {
                const parryResult = this.evaluateParry(player, now);
                this.handleParryResult(parryResult, player, enemy, baseDamage);
                return;
            }

            // Player takes damage
            const defense = player.state.defense || 0;
            const finalDamage = Math.max(1, Math.floor(baseDamage - defense));
            player.state.health = Math.max(0, player.state.health - finalDamage);
            player.invincibleUntil = now + COMBAT.INVINCIBILITY_AFTER_HIT;

            // Knockback
            const knockDir = player.sprite.x > enemy.sprite.x ? 1 : -1;
            player.sprite.setVelocityX(knockDir * COMBAT.KNOCKBACK_FORCE);

            // Visual feedback
            this.flashSprite(player.sprite, 0xff0000, 200);

            // Emit damage event
            this.scene.events.emit('combat:playerHit', {
                playerIndex: player.playerIndex,
                damage: finalDamage,
                remainingHealth: player.state.health,
            });

            // Check player death
            if (player.state.health <= 0) {
                this.scene.events.emit('combat:playerDead', {
                    playerIndex: player.playerIndex,
                });
            }
        });
    }

    // ─── Parry Handling ────────────────────────────────────────────────

    /**
     * Begin a parry stance for a player.
     * @param playerIndex The player initiating the parry
     */
    public startParry(playerIndex: number): void {
        const player = this.players.get(playerIndex);
        if (!player) return;

        player.isParrying = true;
        player.parryStartTime = this.scene.time.now;
    }

    /**
     * End a parry stance for a player.
     * @param playerIndex The player ending the parry
     */
    public endParry(playerIndex: number): void {
        const player = this.players.get(playerIndex);
        if (!player) return;

        player.isParrying = false;
    }

    /**
     * Evaluate the parry timing and return the result category.
     */
    private evaluateParry(player: ICombatPlayer, currentTime: number): TParryResult {
        const elapsed = currentTime - player.parryStartTime;

        if (elapsed <= this.parryConfig.windowPerfect) {
            return 'perfect';
        }
        if (elapsed <= this.parryConfig.windowNormal) {
            return 'normal';
        }
        return 'fail';
    }

    /**
     * Process the outcome of a parry attempt.
     */
    private handleParryResult(
        result: TParryResult,
        player: ICombatPlayer,
        enemy: ICombatEnemy,
        incomingDamage: number,
    ): void {
        const now = this.scene.time.now;

        switch (result) {
            case 'perfect': {
                // No damage taken, stun enemy, trigger time slow
                this.showParryEffect(player.sprite.x, player.sprite.y, true);
                this.stunEnemy(enemy, this.parryConfig.stunDuration);
                this.startTimeSlow();

                player.invincibleUntil = now + this.parryConfig.stunDuration;

                this.scene.events.emit('combat:parry', {
                    playerIndex: player.playerIndex,
                    enemyId: enemy.id,
                    type: 'perfect',
                });

                Logger.debug('CombatSystem', `Perfect parry by P${player.playerIndex} against ${enemy.id}`);
                break;
            }

            case 'normal': {
                // Reduced damage, brief stun
                const reducedDamage = Math.max(1, Math.floor(incomingDamage * 0.25));
                player.state.health = Math.max(0, player.state.health - reducedDamage);
                player.invincibleUntil = now + COMBAT.INVINCIBILITY_AFTER_HIT;

                this.showParryEffect(player.sprite.x, player.sprite.y, false);
                this.stunEnemy(enemy, Math.floor(this.parryConfig.stunDuration * 0.4));

                this.scene.events.emit('combat:parry', {
                    playerIndex: player.playerIndex,
                    enemyId: enemy.id,
                    type: 'normal',
                    damageTaken: reducedDamage,
                });

                Logger.debug('CombatSystem', `Normal parry by P${player.playerIndex} against ${enemy.id}`);
                break;
            }

            case 'fail': {
                // Full damage, parry window expired
                const defense = player.state.defense || 0;
                const finalDamage = Math.max(1, Math.floor(incomingDamage - defense));
                player.state.health = Math.max(0, player.state.health - finalDamage);
                player.invincibleUntil = now + COMBAT.INVINCIBILITY_AFTER_HIT;
                player.isParrying = false;

                this.flashSprite(player.sprite, 0xff0000, 200);

                this.scene.events.emit('combat:playerHit', {
                    playerIndex: player.playerIndex,
                    damage: finalDamage,
                    remainingHealth: player.state.health,
                });

                if (player.state.health <= 0) {
                    this.scene.events.emit('combat:playerDead', {
                        playerIndex: player.playerIndex,
                    });
                }
                break;
            }
        }
    }

    // ─── Time Slow ─────────────────────────────────────────────────────

    /**
     * Start the time-slow effect triggered by a perfect parry.
     */
    private startTimeSlow(): void {
        if (this.timeSlowActive) return;

        this.timeSlowActive = true;
        this.timeSlowEndTime = this.scene.time.now + this.TIME_SLOW_DURATION;
        this.scene.time.timeScale = this.TIME_SLOW_SCALE;

        // Keep player at normal speed via physics
        this.players.forEach((p) => {
            p.sprite.setData('timeSlowImmune', true);
        });

        this.scene.events.emit('combat:timeSlow', { active: true });
        Logger.debug('CombatSystem', 'Time slow started');
    }

    /**
     * End the time-slow effect and restore normal speed.
     */
    private endTimeSlow(): void {
        this.timeSlowActive = false;
        this.scene.time.timeScale = 1.0;

        this.players.forEach((p) => {
            p.sprite.setData('timeSlowImmune', false);
        });

        this.scene.events.emit('combat:timeSlow', { active: false });
        Logger.debug('CombatSystem', 'Time slow ended');
    }

    /** Whether a time-slow effect is currently active. */
    public isTimeSlowActive(): boolean {
        return this.timeSlowActive;
    }

    // ─── Enemy Death ───────────────────────────────────────────────────

    /**
     * Handle enemy death: emit events and clean up.
     */
    private handleEnemyDeath(enemy: ICombatEnemy, killerPlayerIndex: number): void {
        enemy.currentHealth = 0;

        this.scene.events.emit('combat:enemyDead', {
            enemyId: enemy.id,
            enemyName: enemy.data.name,
            isBoss: enemy.isBoss,
            killerPlayerIndex,
            exp: enemy.data.exp,
            gold: Phaser.Math.Between(enemy.data.gold[0], enemy.data.gold[1]),
            drops: enemy.data.drops,
        });

        Logger.info('CombatSystem', `Enemy ${enemy.id} (${enemy.data.name}) defeated by P${killerPlayerIndex}`);
    }

    /**
     * Stun an enemy for a given duration by disabling its AI temporarily.
     */
    private stunEnemy(enemy: ICombatEnemy, duration: number): void {
        enemy.sprite.setData('stunned', true);
        enemy.sprite.setVelocity(0, 0);
        enemy.isAttacking = false;

        this.scene.time.delayedCall(duration, () => {
            if (enemy.sprite.active) {
                enemy.sprite.setData('stunned', false);
            }
        });
    }

    // ─── Visual Effects ────────────────────────────────────────────────

    /**
     * Show a floating damage number at the given position.
     */
    private showHitEffect(x: number, y: number, damage: number, isCrit: boolean): void {
        const color = isCrit ? '#ffcc00' : '#ffffff';
        const fontSize = isCrit ? '20px' : '16px';
        const prefix = isCrit ? 'CRIT ' : '';

        const text = this.scene.add
            .text(x, y - 10, `${prefix}${damage}`, {
                fontFamily: 'monospace',
                fontSize,
                color,
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.EFFECTS);

        this.scene.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy(),
        });
    }

    /**
     * Show a parry visual effect at the given position.
     * @param x World x coordinate
     * @param y World y coordinate
     * @param isPerfect Whether this was a perfect parry
     */
    private showParryEffect(x: number, y: number, isPerfect: boolean): void {
        const label = isPerfect ? 'PERFECT PARRY!' : 'PARRY!';
        const color = isPerfect ? '#ffd700' : '#88ccff';

        const text = this.scene.add
            .text(x, y - 30, label, {
                fontFamily: 'monospace',
                fontSize: isPerfect ? '22px' : '18px',
                color,
                stroke: '#000000',
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.EFFECTS);

        this.scene.tweens.add({
            targets: text,
            y: y - 70,
            alpha: 0,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => text.destroy(),
        });

        // Flash ring effect
        const ring = this.scene.add
            .circle(x, y, 10, isPerfect ? COLORS.GOLD : 0x88ccff, 0.6)
            .setDepth(DEPTH.EFFECTS);

        this.scene.tweens.add({
            targets: ring,
            scaleX: 4,
            scaleY: 4,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => ring.destroy(),
        });
    }

    /**
     * Show a co-op bonus indicator near the enemy.
     */
    private showCoopBonusText(x: number, y: number): void {
        const text = this.scene.add
            .text(x, y, `CO-OP x${this.COOP_MULTIPLIER}`, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#00ffcc',
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.EFFECTS);

        this.scene.tweens.add({
            targets: text,
            y: y - 30,
            alpha: 0,
            duration: 700,
            ease: 'Power1',
            onComplete: () => text.destroy(),
        });
    }

    /**
     * Flash a sprite with a tint color for a brief duration.
     */
    private flashSprite(sprite: Phaser.Physics.Arcade.Sprite, color: number, duration: number): void {
        sprite.setTint(color);
        this.scene.time.delayedCall(duration, () => {
            if (sprite.active) {
                sprite.clearTint();
            }
        });
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    /**
     * Check whether the player is attacking from behind the enemy.
     */
    private isBackstab(player: ICombatPlayer, enemy: ICombatEnemy): boolean {
        const enemyFacing = enemy.sprite.flipX ? -1 : 1;
        const playerSide = player.sprite.x > enemy.sprite.x ? 1 : -1;
        // Backstab if player is behind the enemy (same sign as facing)
        return playerSide === enemyFacing;
    }

    /**
     * Get the current health of a registered enemy.
     * @param enemyId The enemy's identifier
     * @returns Current health or -1 if enemy not found
     */
    public getEnemyHealth(enemyId: string): number {
        const enemy = this.enemies.get(enemyId);
        return enemy ? enemy.currentHealth : -1;
    }

    /**
     * Check whether an enemy is currently stunned.
     * @param enemyId The enemy's identifier
     */
    public isEnemyStunned(enemyId: string): boolean {
        const enemy = this.enemies.get(enemyId);
        return enemy ? enemy.sprite.getData('stunned') === true : false;
    }

    /**
     * Clean up all combat state. Call when leaving a combat scene.
     */
    public destroy(): void {
        if (this.timeSlowActive) {
            this.endTimeSlow();
        }
        this.players.clear();
        this.enemies.clear();
        this.recentHits = [];
        Logger.info('CombatSystem', 'Combat system destroyed');
    }
}
