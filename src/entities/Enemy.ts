import Phaser from 'phaser';
import { IEnemyData, IEnemyDrop, TEnemyState } from '../types/enemy.types';
import { COMBAT, DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';

/** Configuration passed when creating or resetting an enemy */
export interface IEnemyConfig {
    /** Enemy data from enemies.json */
    data: IEnemyData;
    /** Horizontal patrol range from spawn point (pixels) */
    patrolRange?: number;
    /** Whether this enemy respawns */
    respawn?: boolean;
}

/**
 * Base enemy class with state-machine AI.
 *
 * States: idle, patrol, chase, attack, hurt, dead.
 * Supports attack telegraph, knockback, drop items on death,
 * co-op HP scaling, and object pool reset.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
    // --- Data ---
    protected enemyData!: IEnemyData;
    protected patrolRange: number = 150;
    protected canRespawn: boolean = true;

    // --- Runtime state ---
    protected currentState: TEnemyState = 'idle';
    protected health: number = 0;
    protected maxHealth: number = 0;
    protected attackPower: number = 0;
    protected defenseStat: number = 0;
    protected moveSpeed: number = 0;

    // --- AI ---
    protected spawnX: number = 0;
    protected spawnY: number = 0;
    protected facingRight: boolean = true;
    protected patrolTimer: number = 0;
    protected patrolDirectionChangeInterval: number = 3000; // 3 seconds
    protected chaseRange: number = 200;
    protected attackRange: number = 50;
    protected target: Phaser.Physics.Arcade.Sprite | null = null;

    // --- Attack ---
    protected isAttacking: boolean = false;
    protected attackCooldown: number = 0;
    protected attackCooldownMax: number = 1000;
    protected telegraphDuration: number = 300;
    protected telegraphTimer: number = 0;
    protected isTelegraphing: boolean = false;

    // --- Hurt ---
    protected hurtTimer: number = 0;
    protected hurtDuration: number = 300;

    // --- Dead ---
    protected deathTimer: number = 0;
    protected deathDuration: number = 500;

    constructor(scene: Phaser.Scene, x: number, y: number, config?: IEnemyConfig) {
        super(scene, x, y, config?.data.spriteKey ?? 'enemy_default');

        scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
        scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

        this.setDepth(DEPTH.ENEMIES);

        this.spawnX = x;
        this.spawnY = y;

        if (config) {
            this.configure(config);
        }
    }

    /** Configure the enemy with data (used on creation and pool reset) */
    public configure(config: IEnemyConfig): void {
        this.enemyData = config.data;
        this.patrolRange = config.patrolRange ?? 150;
        this.canRespawn = config.respawn ?? true;

        this.maxHealth = config.data.health;
        this.health = this.maxHealth;
        this.attackPower = config.data.attack;
        this.defenseStat = config.data.defense;
        this.moveSpeed = config.data.speed;
        this.telegraphDuration = config.data.attackTelegraph;

        this.setTexture(config.data.spriteKey);

        // Configure physics body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setSize(24, 36);
            body.setOffset(4, 12);
            body.setCollideWorldBounds(true);
            body.setGravityY(0);
        }

        this.currentState = 'idle';
        this.setActive(true);
        this.setVisible(true);
        this.clearTint();
        this.setAlpha(1);
    }

    // =====================================================================
    // UPDATE
    // =====================================================================

    public update(time: number, delta: number): void {
        if (!this.active) return;

        const dtMs = delta;

        switch (this.currentState) {
            case 'idle':
                this.updateIdle(dtMs);
                break;
            case 'patrol':
                this.updatePatrol(dtMs);
                break;
            case 'chase':
                this.updateChase(dtMs);
                break;
            case 'attack':
                this.updateAttack(dtMs);
                break;
            case 'hurt':
                this.updateHurt(dtMs);
                break;
            case 'dead':
                this.updateDead(dtMs);
                break;
        }
    }

    // =====================================================================
    // STATE UPDATES
    // =====================================================================

    protected updateIdle(dtMs: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        // Check for player proximity to transition to chase
        if (this.target && this.getDistanceToTarget() <= this.chaseRange) {
            this.setAIState('chase');
            return;
        }

        // Transition to patrol after a brief idle
        this.patrolTimer += dtMs;
        if (this.patrolTimer >= 1000) {
            this.patrolTimer = 0;
            this.setAIState('patrol');
        }
    }

    protected updatePatrol(dtMs: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        // Move in facing direction
        const direction = this.facingRight ? 1 : -1;
        body.setVelocityX(this.moveSpeed * direction);
        this.setFlipX(!this.facingRight);

        // Change direction periodically
        this.patrolTimer += dtMs;
        if (this.patrolTimer >= this.patrolDirectionChangeInterval) {
            this.patrolTimer = 0;
            this.facingRight = !this.facingRight;
        }

        // Reverse if too far from spawn
        const distFromSpawn = this.x - this.spawnX;
        if (Math.abs(distFromSpawn) > this.patrolRange) {
            this.facingRight = distFromSpawn < 0;
            this.patrolTimer = 0;
        }

        // Check for player proximity
        if (this.target && this.getDistanceToTarget() <= this.chaseRange) {
            this.setAIState('chase');
        }
    }

    protected updateChase(dtMs: number): void {
        if (!this.target || !this.target.active) {
            this.setAIState('patrol');
            return;
        }

        const distance = this.getDistanceToTarget();

        // If player is out of range, return to patrol
        if (distance > this.chaseRange * 1.5) {
            this.setAIState('patrol');
            return;
        }

        // Move toward target
        const body = this.body as Phaser.Physics.Arcade.Body;
        this.facingRight = this.target.x > this.x;
        const direction = this.facingRight ? 1 : -1;
        body.setVelocityX(this.moveSpeed * 1.2 * direction);
        this.setFlipX(!this.facingRight);

        // If within attack range, attack
        if (distance <= this.attackRange) {
            this.setAIState('attack');
        }
    }

    protected updateAttack(dtMs: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        // Telegraph phase
        if (this.isTelegraphing) {
            this.telegraphTimer -= dtMs;
            if (this.telegraphTimer <= 0) {
                this.isTelegraphing = false;
                this.clearTint();
                this.executeAttack();
            }
            return;
        }

        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dtMs;
            if (this.attackCooldown <= 0) {
                this.isAttacking = false;
                // Return to chase or idle
                if (this.target && this.getDistanceToTarget() <= this.chaseRange) {
                    this.setAIState('chase');
                } else {
                    this.setAIState('idle');
                }
            }
        }
    }

    /** Begin telegraph visual before attacking */
    protected startAttackTelegraph(): void {
        this.isTelegraphing = true;
        this.telegraphTimer = this.telegraphDuration;
        // Yellow tint to warn player
        this.setTint(0xffff00);
    }

    /** Execute the actual attack after telegraph */
    protected executeAttack(): void {
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownMax;

        // Play attack animation
        this.playAnimIfExists(`${this.enemyData.spriteKey}_attack`);

        // Emit event for combat system to handle collision
        this.scene.events.emit('enemy_attack', {
            enemy: this,
            damage: this.attackPower,
            facingRight: this.facingRight,
        });

        Logger.debug('Enemy', `${this.enemyData.name} attacks for ${this.attackPower} damage`);
    }

    protected updateHurt(dtMs: number): void {
        this.hurtTimer -= dtMs;
        if (this.hurtTimer <= 0) {
            this.clearTint();
            if (this.target && this.getDistanceToTarget() <= this.chaseRange) {
                this.setAIState('chase');
            } else {
                this.setAIState('idle');
            }
        }
    }

    protected updateDead(dtMs: number): void {
        this.deathTimer -= dtMs;
        if (this.deathTimer <= 0) {
            this.setActive(false);
            this.setVisible(false);
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setEnable(false);
        }
    }

    // =====================================================================
    // STATE TRANSITIONS
    // =====================================================================

    /** Transition to a new AI state */
    protected setAIState(newState: TEnemyState): void {
        if (this.currentState === 'dead') return; // Cannot leave dead state

        const prevState = this.currentState;
        this.currentState = newState;

        switch (newState) {
            case 'idle':
                this.patrolTimer = 0;
                break;
            case 'patrol':
                this.patrolTimer = 0;
                break;
            case 'chase':
                break;
            case 'attack':
                this.startAttackTelegraph();
                break;
            case 'hurt':
                this.hurtTimer = this.hurtDuration;
                break;
            case 'dead':
                this.onDeath();
                break;
        }

        // Play state animation
        this.playAnimIfExists(`${this.enemyData.spriteKey}_${newState}`);
    }

    // =====================================================================
    // DAMAGE
    // =====================================================================

    /**
     * Apply damage to this enemy.
     * @param amount Raw damage
     * @param knockbackX Horizontal knockback
     * @param knockbackY Vertical knockback
     */
    public takeDamage(amount: number, knockbackX: number = 0, knockbackY: number = 0): void {
        if (this.currentState === 'dead') return;

        const effectiveDamage = Math.max(1, amount - this.defenseStat);
        this.health -= effectiveDamage;

        // Red tint flash
        this.setTint(0xff0000);

        // Apply knockback
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (knockbackX !== 0 || knockbackY !== 0) {
            body.setVelocity(knockbackX, knockbackY);
        }

        Logger.debug('Enemy', `${this.enemyData.name} took ${effectiveDamage} damage. HP: ${this.health}/${this.maxHealth}`);

        if (this.health <= 0) {
            this.health = 0;
            this.setAIState('dead');
        } else {
            this.setAIState('hurt');
        }
    }

    // =====================================================================
    // DEATH & DROPS
    // =====================================================================

    /** Handle death: drop items, emit events, start death timer */
    protected onDeath(): void {
        this.deathTimer = this.deathDuration;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);

        this.setAlpha(0.6);

        // Calculate gold drop
        const [minGold, maxGold] = this.enemyData.gold;
        const goldDrop = Phaser.Math.Between(minGold, maxGold);

        // Emit kill event
        this.scene.events.emit('enemy_killed', {
            enemy: this,
            name: this.enemyData.name,
            exp: this.enemyData.exp,
            gold: goldDrop,
            position: { x: this.x, y: this.y },
        });

        // Process item drops
        this.processDrops();

        Logger.info('Enemy', `${this.enemyData.name} killed. Exp: ${this.enemyData.exp}, Gold: ${goldDrop}`);
    }

    /** Roll drop table and emit item drop events */
    protected processDrops(): void {
        for (const drop of this.enemyData.drops) {
            if (Math.random() <= drop.chance) {
                this.scene.events.emit('item_drop', {
                    itemId: drop.item,
                    x: this.x,
                    y: this.y,
                });
                Logger.debug('Enemy', `Dropped item: ${drop.item}`);
            }
        }
    }

    // =====================================================================
    // CO-OP SCALING
    // =====================================================================

    /**
     * Adjust enemy health by a multiplier (for co-op scaling).
     * @param multiplier Health scaling factor (e.g., 1.5 for co-op)
     */
    public adjustHealth(multiplier: number): void {
        this.maxHealth = Math.floor(this.enemyData.health * multiplier);
        this.health = this.maxHealth;
    }

    // =====================================================================
    // TARGETING
    // =====================================================================

    /** Set the current target for AI tracking */
    public setTarget(target: Phaser.Physics.Arcade.Sprite | null): void {
        this.target = target;
    }

    /** Get distance to current target */
    protected getDistanceToTarget(): number {
        if (!this.target) return Infinity;
        return Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    }

    // =====================================================================
    // OBJECT POOL SUPPORT
    // =====================================================================

    /** Reset the enemy for object pool reuse */
    public reset(): void {
        this.health = this.maxHealth;
        this.currentState = 'idle';
        this.isAttacking = false;
        this.isTelegraphing = false;
        this.attackCooldown = 0;
        this.telegraphTimer = 0;
        this.patrolTimer = 0;
        this.hurtTimer = 0;
        this.deathTimer = 0;
        this.facingRight = true;
        this.target = null;

        this.setActive(true);
        this.setVisible(true);
        this.clearTint();
        this.setAlpha(1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setEnable(true);
            body.setVelocity(0, 0);
        }
    }

    /** Reposition and reset for respawning */
    public respawnAt(x: number, y: number): void {
        this.spawnX = x;
        this.spawnY = y;
        this.setPosition(x, y);
        this.reset();
    }

    // =====================================================================
    // HELPERS
    // =====================================================================

    /** Safely play an animation if it exists */
    protected playAnimIfExists(key: string): void {
        if (this.scene.anims.exists(key)) {
            this.play(key, true);
        }
    }

    // --- Accessors ---
    public getHealth(): number { return this.health; }
    public getMaxHealth(): number { return this.maxHealth; }
    public getAttackPower(): number { return this.attackPower; }
    public getCurrentState(): TEnemyState { return this.currentState; }
    public getEnemyData(): IEnemyData { return this.enemyData; }
    public getFacingRight(): boolean { return this.facingRight; }
    public getIsAttacking(): boolean { return this.isAttacking; }
}
