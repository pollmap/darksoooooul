import Phaser from 'phaser';
import { IPlayerAbilities, IPlayerStats, IPlayerCombat } from '../types/player.types';
import { COMBAT, DEPTH, PHYSICS } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';
import { InputSystem } from '../systems/InputSystem';

/** Animation state names for the player character */
type TPlayerAnimState =
    | 'idle'
    | 'run'
    | 'jump'
    | 'fall'
    | 'attack1'
    | 'attack2'
    | 'attack3'
    | 'dodge'
    | 'hurt'
    | 'parry'
    | 'heal'
    | 'dead';

/** Parry result types */
type TParryResult = 'perfect' | 'normal' | 'fail';

/** Default player 1 stats from player.json structure */
const DEFAULT_STATS: IPlayerStats = {
    maxHealth: 100,
    maxEnergy: 100,
    attackPower: 10,
    defense: 5,
    speed: 200,
    jumpForce: 400,
};

/** Default combat configuration from player.json structure */
const DEFAULT_COMBAT: IPlayerCombat = {
    attackFrames: { light1: 8, light2: 8, light3: 12 },
    damageMultipliers: { light1: 1.0, light2: 1.0, light3: 1.2, aerial: 0.8, downward: 1.5 },
    dodge: { iFrames: 12, distance: 150, cooldown: 300 },
    parry: { windowPerfect: 3, windowNormal: 9, stunDuration: 1000 },
    heal: { energyCost: 30, castTime: 3000, healAmount: 30 },
};

/** Energy regeneration constants */
const ENERGY_REGEN_PER_SEC = 5;
const ENERGY_PER_HIT = 3;
const ENERGY_ON_PARRY = 10;

/**
 * Main player character (P1 - Daeyeonmu/\ub300\uc5f0\ubb34).
 *
 * Manages movement, combo attacks, dodge with i-frames, parry, healing,
 * energy regeneration, damage handling, and ability unlocking.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
    // --- Core references ---
    protected inputSystem: InputSystem;
    protected gameState: GameState;
    protected playerNumber: number = 1;

    // --- Stats ---
    protected stats: IPlayerStats;
    protected combat: IPlayerCombat;
    protected health: number;
    protected energy: number;

    // --- Abilities ---
    protected abilities: IPlayerAbilities = {
        doubleJump: false,
        wallClimb: false,
        dashEnhanced: false,
        waterFlow: false,
        poisonImmune: false,
        glide: false,
    };

    // --- Animation / State ---
    protected currentAnimState: TPlayerAnimState = 'idle';
    protected facingRight: boolean = true;

    // --- Movement ---
    protected jumpCount: number = 0;
    protected maxJumps: number = 1;
    protected isGrounded: boolean = false;

    // --- Combo attack system ---
    protected comboStep: number = 0; // 0 = no combo, 1-3 = attack step
    protected comboTimer: number = 0;
    protected comboWindowMs: number = 500; // window to chain next attack
    protected isAttacking: boolean = false;
    protected attackTimer: number = 0;

    // --- Dodge ---
    protected isDodging: boolean = false;
    protected dodgeCooldownTimer: number = 0;
    protected dodgeIFrameTimer: number = 0;

    // --- Parry ---
    protected isParrying: boolean = false;
    protected parryTimer: number = 0;
    protected parryActiveFrames: number = 0;

    // --- Heal ---
    protected isHealing: boolean = false;
    protected healTimer: number = 0;

    // --- Damage / invincibility ---
    protected isInvincible: boolean = false;
    protected invincibilityTimer: number = 0;
    protected isDead: boolean = false;

    // --- Energy regen ---
    protected energyRegenAccumulator: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'player1');

        // Add to scene and enable physics
        scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
        scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

        // Retrieve InputSystem from scene (expected to be set by the scene)
        this.inputSystem = (scene as unknown as { inputSystem: InputSystem }).inputSystem;
        this.gameState = GameState.getInstance();

        // Initialize stats
        this.stats = { ...DEFAULT_STATS };
        this.combat = JSON.parse(JSON.stringify(DEFAULT_COMBAT));
        this.health = this.stats.maxHealth;
        this.energy = this.stats.maxEnergy;

        // Load abilities from GameState
        this.abilities = this.gameState.getAbilities();
        this.maxJumps = this.abilities.doubleJump ? 2 : 1;

        // Configure physics body
        this.setupPhysicsBody();

        // Set rendering depth
        this.setDepth(DEPTH.PLAYER);

        Logger.info('Player', `Player 1 (\ub300\uc5f0\ubb34) initialized at (${x}, ${y})`);
    }

    /** Configure the physics body dimensions and constraints */
    protected setupPhysicsBody(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        body.setSize(24, 40);
        body.setOffset(4, 8);
        body.setMaxVelocity(PHYSICS.MAX_VELOCITY_X, PHYSICS.MAX_VELOCITY_Y);
        body.setGravityY(0); // Scene gravity handles this
        body.setCollideWorldBounds(true);
    }

    // =====================================================================
    // UPDATE
    // =====================================================================

    public update(time: number, delta: number): void {
        if (this.isDead) return;

        const dt = delta / 1000; // seconds
        const dtMs = delta; // milliseconds

        // Update grounded state
        const body = this.body as Phaser.Physics.Arcade.Body;
        this.isGrounded = body.blocked.down || body.touching.down;

        if (this.isGrounded) {
            this.jumpCount = 0;
        }

        // Update timers
        this.updateTimers(dtMs);

        // Energy regeneration
        this.regenerateEnergy(dt);

        // Process input (only when not in a locked state)
        if (!this.isAttacking && !this.isDodging && !this.isHealing && !this.isParrying) {
            this.handleMovement();
            this.handleJump();
        }

        this.handleAttackInput();
        this.handleDodgeInput();
        this.handleParryInput();
        this.handleHealInput();

        // Update animation state
        this.updateAnimationState();
    }

    // =====================================================================
    // TIMERS
    // =====================================================================

    /** Decrement all active cooldown and state timers */
    protected updateTimers(dtMs: number): void {
        // Combo window
        if (this.comboTimer > 0) {
            this.comboTimer -= dtMs;
            if (this.comboTimer <= 0) {
                this.comboStep = 0;
                this.comboTimer = 0;
            }
        }

        // Attack duration
        if (this.attackTimer > 0) {
            this.attackTimer -= dtMs;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.attackTimer = 0;
                // Start combo window
                if (this.comboStep < 3) {
                    this.comboTimer = this.comboWindowMs;
                } else {
                    this.comboStep = 0;
                }
            }
        }

        // Dodge cooldown
        if (this.dodgeCooldownTimer > 0) {
            this.dodgeCooldownTimer -= dtMs;
        }

        // Dodge i-frame timer
        if (this.dodgeIFrameTimer > 0) {
            this.dodgeIFrameTimer -= dtMs;
            if (this.dodgeIFrameTimer <= 0) {
                this.isDodging = false;
                this.isInvincible = this.invincibilityTimer > 0;
            }
        }

        // Parry timer
        if (this.parryTimer > 0) {
            this.parryTimer -= dtMs;
            if (this.parryTimer <= 0) {
                this.isParrying = false;
                this.parryTimer = 0;
                this.parryActiveFrames = 0;
            }
        }

        // Heal timer
        if (this.healTimer > 0) {
            this.healTimer -= dtMs;
            if (this.healTimer <= 0) {
                this.completeHeal();
            }
        }

        // Invincibility timer
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= dtMs;
            if (this.invincibilityTimer <= 0) {
                this.isInvincible = false;
                this.setAlpha(1);
            } else {
                // Flicker effect during invincibility
                this.setAlpha(Math.sin(this.invincibilityTimer * 0.02) > 0 ? 1 : 0.4);
            }
        }
    }

    // =====================================================================
    // MOVEMENT
    // =====================================================================

    /** Handle left/right movement input */
    protected handleMovement(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const speed = this.stats.speed;

        if (this.inputSystem.isActionPressed('left', this.playerNumber)) {
            body.setVelocityX(-speed);
            this.facingRight = false;
            this.setFlipX(true);
        } else if (this.inputSystem.isActionPressed('right', this.playerNumber)) {
            body.setVelocityX(speed);
            this.facingRight = true;
            this.setFlipX(false);
        } else {
            body.setVelocityX(0);
        }
    }

    /** Handle jump and double jump input */
    protected handleJump(): void {
        if (!this.inputSystem.isActionJustPressed('jump', this.playerNumber)) return;

        this.maxJumps = this.abilities.doubleJump ? 2 : 1;

        if (this.jumpCount < this.maxJumps) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocityY(-this.stats.jumpForce);
            this.jumpCount++;
            Logger.debug('Player', `Jump ${this.jumpCount}/${this.maxJumps}`);
        }
    }

    // =====================================================================
    // COMBAT - COMBO ATTACKS
    // =====================================================================

    /** Handle attack input and combo chaining */
    protected handleAttackInput(): void {
        if (!this.inputSystem.isActionJustPressed('attack', this.playerNumber)) return;
        if (this.isDodging || this.isHealing || this.isParrying) return;

        // Determine next combo step
        let nextStep: number;
        if (!this.isAttacking && this.comboStep === 0) {
            nextStep = 1;
        } else if (!this.isAttacking && this.comboTimer > 0 && this.comboStep < 3) {
            nextStep = this.comboStep + 1;
        } else {
            return; // Cannot attack right now
        }

        this.comboStep = nextStep;
        this.isAttacking = true;
        this.comboTimer = 0;

        // Calculate attack duration from frame data
        const frameKey = `light${nextStep}` as keyof typeof this.combat.attackFrames;
        const frames = this.combat.attackFrames[frameKey];
        const frameDurationMs = (frames / 60) * 1000; // Convert frames at 60fps to ms
        this.attackTimer = frameDurationMs;

        // Calculate damage
        const multiplierKey = `light${nextStep}` as keyof typeof this.combat.damageMultipliers;
        const multiplier = this.combat.damageMultipliers[multiplierKey];
        const damage = Math.floor(this.stats.attackPower * multiplier);

        // Stop horizontal movement during attack
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        // Emit attack event for combat system to handle hit detection
        this.scene.events.emit('player_attack', {
            player: this,
            playerNumber: this.playerNumber,
            comboStep: nextStep,
            damage,
            facingRight: this.facingRight,
        });

        // Gain energy on attack
        this.addEnergy(ENERGY_PER_HIT);

        Logger.debug('Player', `Attack combo step ${nextStep}, damage: ${damage}`);
    }

    // =====================================================================
    // COMBAT - DODGE
    // =====================================================================

    /** Handle dodge input with i-frames */
    protected handleDodgeInput(): void {
        if (!this.inputSystem.isActionJustPressed('dodge', this.playerNumber)) return;
        if (this.isDodging || this.dodgeCooldownTimer > 0 || this.isAttacking || this.isHealing) return;

        this.isDodging = true;
        this.isInvincible = true;

        // Calculate i-frame duration: frames at 60fps
        const iFrameDurationMs = (this.combat.dodge.iFrames / 60) * 1000;
        this.dodgeIFrameTimer = iFrameDurationMs;
        this.dodgeCooldownTimer = this.combat.dodge.cooldown;

        // Apply dodge velocity
        const direction = this.facingRight ? 1 : -1;
        const dodgeSpeed = this.combat.dodge.distance / (iFrameDurationMs / 1000);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(dodgeSpeed * direction);

        // Cancel any ongoing attack
        this.isAttacking = false;
        this.attackTimer = 0;
        this.comboStep = 0;
        this.comboTimer = 0;

        Logger.debug('Player', 'Dodge initiated');
    }

    // =====================================================================
    // COMBAT - PARRY
    // =====================================================================

    /** Handle parry input */
    protected handleParryInput(): void {
        if (!this.inputSystem.isActionJustPressed('parry', this.playerNumber)) return;
        if (this.isDodging || this.isAttacking || this.isHealing || this.isParrying) return;

        this.isParrying = true;
        this.parryActiveFrames = 0;

        // Total parry window in ms (normal window encompasses perfect)
        const totalParryMs = (this.combat.parry.windowNormal / 60) * 1000;
        this.parryTimer = totalParryMs;

        // Stop movement during parry
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        Logger.debug('Player', 'Parry initiated');
    }

    /**
     * Check parry result against an incoming attack.
     * Should be called by the combat system when an enemy attack contacts
     * the player while parrying.
     * @returns 'perfect' if within perfect window, 'normal' if within normal window, 'fail' otherwise
     */
    public checkParry(): TParryResult {
        if (!this.isParrying) return 'fail';

        const totalParryMs = (this.combat.parry.windowNormal / 60) * 1000;
        const perfectWindowMs = (this.combat.parry.windowPerfect / 60) * 1000;
        const elapsed = totalParryMs - this.parryTimer;

        if (elapsed <= perfectWindowMs) {
            this.addEnergy(ENERGY_ON_PARRY);
            this.isParrying = false;
            this.parryTimer = 0;
            Logger.info('Player', 'Perfect parry!');
            return 'perfect';
        }

        if (this.parryTimer > 0) {
            this.addEnergy(ENERGY_ON_PARRY);
            this.isParrying = false;
            this.parryTimer = 0;
            Logger.info('Player', 'Normal parry');
            return 'normal';
        }

        return 'fail';
    }

    // =====================================================================
    // COMBAT - HEAL
    // =====================================================================

    /** Handle heal input */
    protected handleHealInput(): void {
        if (!this.inputSystem.isActionJustPressed('heal', this.playerNumber)) return;
        if (this.isHealing || this.isDodging || this.isAttacking || this.isParrying) return;
        if (this.energy < this.combat.heal.energyCost) return;
        if (this.health >= this.stats.maxHealth) return;

        this.isHealing = true;
        this.healTimer = this.combat.heal.castTime;

        // Deduct energy cost upfront
        this.addEnergy(-this.combat.heal.energyCost);

        // Stop movement
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        Logger.debug('Player', 'Heal started');
    }

    /** Called when heal cast time completes */
    protected completeHeal(): void {
        if (!this.isHealing) return;

        this.isHealing = false;
        this.healTimer = 0;

        const healAmount = this.combat.heal.healAmount;
        this.health = Math.min(this.health + healAmount, this.stats.maxHealth);

        this.scene.events.emit('player_healed', {
            player: this,
            playerNumber: this.playerNumber,
            amount: healAmount,
            currentHealth: this.health,
        });

        // Sync to GameState
        this.gameState.setHealth(this.health);

        Logger.info('Player', `Healed ${healAmount} HP. Health: ${this.health}/${this.stats.maxHealth}`);
    }

    /** Cancel healing (e.g., when hit during cast) */
    public cancelHeal(): void {
        if (this.isHealing) {
            this.isHealing = false;
            this.healTimer = 0;
            Logger.debug('Player', 'Heal interrupted');
        }
    }

    // =====================================================================
    // ENERGY
    // =====================================================================

    /** Add or subtract energy, clamped to [0, maxEnergy] */
    protected addEnergy(amount: number): void {
        const prev = this.energy;
        this.energy = Phaser.Math.Clamp(this.energy + amount, 0, this.stats.maxEnergy);
        if (this.energy !== prev) {
            this.scene.events.emit('energy_changed', {
                player: this,
                playerNumber: this.playerNumber,
                energy: this.energy,
                maxEnergy: this.stats.maxEnergy,
            });
            this.gameState.setEnergy(this.energy);
        }
    }

    /** Passive energy regeneration per second */
    protected regenerateEnergy(dt: number): void {
        if (this.isHealing || this.isDead) return;
        this.energyRegenAccumulator += ENERGY_REGEN_PER_SEC * dt;
        if (this.energyRegenAccumulator >= 1) {
            const amount = Math.floor(this.energyRegenAccumulator);
            this.energyRegenAccumulator -= amount;
            this.addEnergy(amount);
        }
    }

    // =====================================================================
    // DAMAGE
    // =====================================================================

    /**
     * Apply damage to the player.
     * Respects invincibility frames and dodge i-frames.
     * @param amount Raw damage before defense calculation
     * @param knockbackX Optional horizontal knockback force
     * @param knockbackY Optional vertical knockback force
     */
    public takeDamage(amount: number, knockbackX: number = 0, knockbackY: number = 0): void {
        if (this.isDead || this.isInvincible) return;

        // Check if parrying
        if (this.isParrying) {
            const result = this.checkParry();
            if (result !== 'fail') return; // Parry absorbed the hit
        }

        // Apply defense reduction
        const effectiveDamage = Math.max(1, amount - this.stats.defense);
        this.health = Math.max(0, this.health - effectiveDamage);

        // Cancel healing if in progress
        this.cancelHeal();

        // Start invincibility frames
        this.isInvincible = true;
        this.invincibilityTimer = COMBAT.INVINCIBILITY_AFTER_HIT;

        // Apply knockback
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (knockbackX !== 0 || knockbackY !== 0) {
            body.setVelocity(knockbackX, knockbackY);
        }

        // Red tint flash
        this.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => {
            this.clearTint();
        });

        // Emit damage event
        this.scene.events.emit('player_damaged', {
            player: this,
            playerNumber: this.playerNumber,
            damage: effectiveDamage,
            currentHealth: this.health,
            maxHealth: this.stats.maxHealth,
        });

        // Sync to GameState
        this.gameState.setHealth(this.health);

        Logger.info('Player', `Took ${effectiveDamage} damage. Health: ${this.health}/${this.stats.maxHealth}`);

        // Check death
        if (this.health <= 0) {
            this.die();
        }
    }

    /** Handle player death */
    protected die(): void {
        this.isDead = true;
        this.isAttacking = false;
        this.isDodging = false;
        this.isHealing = false;
        this.isParrying = false;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        body.setEnable(false);

        this.currentAnimState = 'dead';
        this.playAnimIfExists('player1_dead');

        this.scene.events.emit('player_died', {
            player: this,
            playerNumber: this.playerNumber,
        });

        Logger.info('Player', 'Player 1 died');
    }

    // =====================================================================
    // ABILITIES
    // =====================================================================

    /** Unlock a new ability */
    public unlockAbility(ability: keyof IPlayerAbilities): void {
        this.abilities[ability] = true;
        this.gameState.unlockAbility(ability);

        if (ability === 'doubleJump') {
            this.maxJumps = 2;
        }

        Logger.info('Player', `Ability unlocked: ${ability}`);
    }

    /** Check whether an ability is unlocked */
    public hasAbility(ability: keyof IPlayerAbilities): boolean {
        return this.abilities[ability];
    }

    // =====================================================================
    // ANIMATION
    // =====================================================================

    /** Determine and play the appropriate animation based on current state */
    protected updateAnimationState(): void {
        let newState: TPlayerAnimState;

        if (this.isDead) {
            newState = 'dead';
        } else if (this.isHealing) {
            newState = 'heal';
        } else if (this.isDodging) {
            newState = 'dodge';
        } else if (this.isParrying) {
            newState = 'parry';
        } else if (this.isAttacking) {
            newState = `attack${this.comboStep}` as TPlayerAnimState;
        } else {
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (!this.isGrounded) {
                newState = body.velocity.y < 0 ? 'jump' : 'fall';
            } else if (Math.abs(body.velocity.x) > 10) {
                newState = 'run';
            } else {
                newState = 'idle';
            }
        }

        if (newState !== this.currentAnimState) {
            this.currentAnimState = newState;
            this.playAnimIfExists(`player1_${newState}`);
        }
    }

    /** Safely play an animation key, only if it exists in the animation manager */
    protected playAnimIfExists(key: string): void {
        if (this.scene.anims.exists(key)) {
            this.play(key, true);
        }
    }

    // =====================================================================
    // ACCESSORS
    // =====================================================================

    public getHealth(): number { return this.health; }
    public getMaxHealth(): number { return this.stats.maxHealth; }
    public getEnergy(): number { return this.energy; }
    public getMaxEnergy(): number { return this.stats.maxEnergy; }
    public getAttackPower(): number { return this.stats.attackPower; }
    public getDefense(): number { return this.stats.defense; }
    public getSpeed(): number { return this.stats.speed; }
    public getStats(): Readonly<IPlayerStats> { return this.stats; }
    public getIsDead(): boolean { return this.isDead; }
    public getIsInvincible(): boolean { return this.isInvincible; }
    public getIsAttacking(): boolean { return this.isAttacking; }
    public getIsDodging(): boolean { return this.isDodging; }
    public getIsParrying(): boolean { return this.isParrying; }
    public getIsHealing(): boolean { return this.isHealing; }
    public getComboStep(): number { return this.comboStep; }
    public getFacingRight(): boolean { return this.facingRight; }
    public getPlayerNumber(): number { return this.playerNumber; }

    /** Set stats (e.g., after level-up or equipment change) */
    public setStats(stats: Partial<IPlayerStats>): void {
        Object.assign(this.stats, stats);
        this.health = Math.min(this.health, this.stats.maxHealth);
        this.energy = Math.min(this.energy, this.stats.maxEnergy);
    }

    /** Revive from death with a percentage of max health */
    public revive(healthPercent: number = 0.3): void {
        this.isDead = false;
        this.health = Math.floor(this.stats.maxHealth * healthPercent);
        this.energy = Math.floor(this.stats.maxEnergy * 0.5);
        this.isInvincible = true;
        this.invincibilityTimer = COMBAT.INVINCIBILITY_AFTER_HIT * 2;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setEnable(true);

        this.setAlpha(1);
        this.clearTint();
        this.gameState.setHealth(this.health);
        this.gameState.setEnergy(this.energy);

        Logger.info('Player', `Player 1 revived with ${this.health} HP`);
    }
}
