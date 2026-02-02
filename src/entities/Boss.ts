import Phaser from 'phaser';
import { IBossData, IBossPhase, IEnemyData } from '../types/enemy.types';
import { DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';
import { Enemy, IEnemyConfig } from './Enemy';

/** Configuration for creating a boss */
export interface IBossConfig {
    /** Boss-specific data from enemies.json bosses section */
    bossData: IBossData;
    /** Base enemy data (health, attack, etc.) constructed from boss data */
    enemyData: IEnemyData;
}

/**
 * Boss entity extending Enemy with multi-phase combat,
 * phase transition effects, and reward granting on defeat.
 *
 * Phases are defined by health thresholds (e.g., 1.0 = full HP, 0.5 = half HP).
 * When the boss's health drops below a threshold, the boss transitions
 * to a new phase with different attack patterns.
 */
export class Boss extends Enemy {
    // --- Boss-specific data ---
    private bossData!: IBossData;
    private phases: IBossPhase[] = [];
    private currentPhaseIndex: number = 0;
    private currentPatterns: string[] = [];
    private isTransitioning: boolean = false;
    private transitionTimer: number = 0;
    private transitionDuration: number = 1500; // ms for phase transition effect

    // --- Pattern execution ---
    private patternCooldown: number = 0;
    private patternCooldownMax: number = 2000;
    private activePattern: string | null = null;
    private patternTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, bossConfig: IBossConfig) {
        // Build enemy config from boss data
        const enemyConfig: IEnemyConfig = {
            data: bossConfig.enemyData,
            patrolRange: 200,
            respawn: false,
        };

        super(scene, x, y, enemyConfig);

        this.bossData = bossConfig.bossData;
        this.phases = bossConfig.bossData.phases;

        // Initialize first phase
        if (this.phases.length > 0) {
            this.currentPhaseIndex = 0;
            this.currentPatterns = [...this.phases[0].patterns];
        }

        // Bosses have larger chase and attack ranges
        this.chaseRange = 400;
        this.attackRange = 80;
        this.attackCooldownMax = 1500;

        Logger.info('Boss', `Boss "${this.bossData.name}" (${this.bossData.title}) initialized`);
    }

    // =====================================================================
    // UPDATE OVERRIDE
    // =====================================================================

    public update(time: number, delta: number): void {
        if (!this.active) return;

        const dtMs = delta;

        // Handle phase transition
        if (this.isTransitioning) {
            this.updateTransition(dtMs);
            return;
        }

        // Pattern cooldown
        if (this.patternCooldown > 0) {
            this.patternCooldown -= dtMs;
        }

        // Active pattern timer
        if (this.patternTimer > 0) {
            this.patternTimer -= dtMs;
            if (this.patternTimer <= 0) {
                this.activePattern = null;
            }
        }

        // Delegate to base Enemy state machine
        super.update(time, delta);

        // Check for phase transitions based on health thresholds
        this.checkPhaseTransition();
    }

    // =====================================================================
    // PHASE SYSTEM
    // =====================================================================

    /** Check if health has dropped below the next phase threshold */
    private checkPhaseTransition(): void {
        if (this.currentState === 'dead' || this.isTransitioning) return;

        const healthPercent = this.health / this.maxHealth;
        const nextPhaseIndex = this.currentPhaseIndex + 1;

        if (nextPhaseIndex < this.phases.length) {
            const nextPhase = this.phases[nextPhaseIndex];
            if (healthPercent <= nextPhase.threshold) {
                this.beginPhaseTransition(nextPhaseIndex);
            }
        }
    }

    /** Start a phase transition with visual effects */
    private beginPhaseTransition(phaseIndex: number): void {
        this.isTransitioning = true;
        this.transitionTimer = this.transitionDuration;
        this.currentPhaseIndex = phaseIndex;

        // Stop movement during transition
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);

        // Visual effect: flash white and scale pulse
        this.setTint(0xffffff);

        // Screen shake effect
        if (this.scene.cameras.main) {
            this.scene.cameras.main.shake(300, 0.01);
        }

        // Emit phase change event
        this.scene.events.emit('boss_phase_change', {
            boss: this,
            bossName: this.bossData.name,
            phase: phaseIndex,
            totalPhases: this.phases.length,
        });

        Logger.info('Boss', `${this.bossData.name} entering phase ${phaseIndex + 1}/${this.phases.length}`);
    }

    /** Update during phase transition animation */
    private updateTransition(dtMs: number): void {
        this.transitionTimer -= dtMs;

        // Pulsing visual effect
        const progress = 1 - (this.transitionTimer / this.transitionDuration);
        const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.15;
        this.setScale(pulseScale);

        if (this.transitionTimer <= 0) {
            this.completePhaseTransition();
        }
    }

    /** Finalize the phase transition */
    private completePhaseTransition(): void {
        this.isTransitioning = false;
        this.setScale(1);
        this.clearTint();

        // Activate new phase patterns
        const phase = this.phases[this.currentPhaseIndex];
        this.currentPatterns = [...phase.patterns];

        // Reset attack cooldown
        this.patternCooldown = 500;

        Logger.info('Boss', `${this.bossData.name} phase ${this.currentPhaseIndex + 1} active. Patterns: ${this.currentPatterns.join(', ')}`);
    }

    // =====================================================================
    // ATTACK OVERRIDE - Pattern-based attacks
    // =====================================================================

    /** Override to use boss attack patterns instead of simple melee */
    protected executeAttack(): void {
        if (this.currentPatterns.length === 0) {
            super.executeAttack();
            return;
        }

        // Select a random pattern from current phase
        const patternIndex = Phaser.Math.Between(0, this.currentPatterns.length - 1);
        const pattern = this.currentPatterns[patternIndex];

        this.activePattern = pattern;
        this.patternTimer = 1000; // Default pattern duration
        this.patternCooldown = this.patternCooldownMax;
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownMax;

        // Emit pattern event for combat system to handle specific pattern logic
        this.scene.events.emit('boss_pattern', {
            boss: this,
            bossName: this.bossData.name,
            pattern,
            damage: this.attackPower,
            facingRight: this.facingRight,
        });

        // Play pattern animation if available
        this.playAnimIfExists(`${this.enemyData.spriteKey}_${pattern}`);

        Logger.debug('Boss', `${this.bossData.name} executes pattern: ${pattern}`);
    }

    // =====================================================================
    // DEATH OVERRIDE - Grant rewards
    // =====================================================================

    protected onDeath(): void {
        // Stop all patterns
        this.activePattern = null;
        this.patternTimer = 0;
        this.isTransitioning = false;

        this.deathTimer = 1500; // Bosses have longer death animation

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);

        this.setAlpha(0.6);

        // Grant rewards
        const rewards = this.bossData.rewards;
        const gameState = GameState.getInstance();

        gameState.addExp(rewards.exp);
        gameState.addGold(rewards.gold);
        gameState.defeatBoss(this.bossData.nameEn.toLowerCase());

        // Grant reward item
        if (rewards.item) {
            gameState.addItem(rewards.item);
        }

        // Emit boss killed event
        this.scene.events.emit('boss_killed', {
            boss: this,
            bossName: this.bossData.name,
            bossNameEn: this.bossData.nameEn,
            rewards: {
                exp: rewards.exp,
                gold: rewards.gold,
                item: rewards.item,
                achievement: rewards.achievement,
            },
            position: { x: this.x, y: this.y },
        });

        // Also emit standard enemy killed event
        this.scene.events.emit('enemy_killed', {
            enemy: this,
            name: this.bossData.name,
            exp: rewards.exp,
            gold: rewards.gold,
            position: { x: this.x, y: this.y },
        });

        // Camera effect
        if (this.scene.cameras.main) {
            this.scene.cameras.main.shake(500, 0.02);
            this.scene.cameras.main.flash(300, 255, 255, 255);
        }

        Logger.info('Boss', `Boss "${this.bossData.name}" defeated! Rewards: ${rewards.exp} exp, ${rewards.gold} gold, item: ${rewards.item}`);
    }

    // =====================================================================
    // DAMAGE OVERRIDE - Log boss damage with extra detail
    // =====================================================================

    public takeDamage(amount: number, knockbackX: number = 0, knockbackY: number = 0): void {
        if (this.currentState === 'dead' || this.isTransitioning) return;

        // Bosses have reduced knockback
        super.takeDamage(amount, knockbackX * 0.3, knockbackY * 0.3);
    }

    // =====================================================================
    // ACCESSORS
    // =====================================================================

    public getBossData(): IBossData { return this.bossData; }
    public getCurrentPhase(): number { return this.currentPhaseIndex; }
    public getTotalPhases(): number { return this.phases.length; }
    public getCurrentPatterns(): string[] { return [...this.currentPatterns]; }
    public getActivePattern(): string | null { return this.activePattern; }
    public getIsTransitioning(): boolean { return this.isTransitioning; }
}
