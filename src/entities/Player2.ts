import Phaser from 'phaser';
import { IPlayerAbilities, IPlayerStats, IPlayerCombat } from '../types/player.types';
import { COMBAT, DEPTH } from '../utils/Constants';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';
import { InputSystem } from '../systems/InputSystem';
import { Player } from './Player';

/** Default player 2 stats from player.json structure */
const P2_DEFAULT_STATS: IPlayerStats = {
    maxHealth: 80,
    maxEnergy: 100,
    attackPower: 8,
    defense: 3,
    speed: 220,
    jumpForce: 420,
};

/** Player 2 combat config - twin daggers: faster attacks, lower per-hit damage */
const P2_COMBAT: IPlayerCombat = {
    attackFrames: { light1: 6, light2: 6, light3: 10 },
    damageMultipliers: { light1: 0.8, light2: 0.8, light3: 1.0, aerial: 0.7, downward: 1.3 },
    dodge: { iFrames: 12, distance: 150, cooldown: 300 },
    parry: { windowPerfect: 3, windowNormal: 9, stunDuration: 1000 },
    heal: { energyCost: 30, castTime: 3000, healAmount: 30 },
};

/**
 * Co-op player character (P2 - Soyul/\uc18c\uc728).
 *
 * Extends the base Player class with different stats (lower HP, higher speed),
 * twin dagger combat style (faster attacks, lower damage per hit),
 * and uses InputSystem player number 2 for all input handling.
 */
export class Player2 extends Player {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Override texture to player 2 sprite
        this.setTexture('player2');

        // Set player number for input
        this.playerNumber = 2;

        // Override stats with P2 values
        this.stats = { ...P2_DEFAULT_STATS };
        this.combat = JSON.parse(JSON.stringify(P2_COMBAT));
        this.health = this.stats.maxHealth;
        this.energy = this.stats.maxEnergy;

        // P2 gets abilities from GameState same as P1 (shared progression)
        this.abilities = this.gameState.getAbilities();
        this.maxJumps = this.abilities.doubleJump ? 2 : 1;

        Logger.info('Player2', `Player 2 (\uc18c\uc728) initialized at (${x}, ${y})`);
    }

    // =====================================================================
    // ANIMATION OVERRIDES - Use player2 animation keys
    // =====================================================================

    protected updateAnimationState(): void {
        let newState: string;

        if (this.isDead) {
            newState = 'dead';
        } else if (this.isHealing) {
            newState = 'heal';
        } else if (this.isDodging) {
            newState = 'dodge';
        } else if (this.isParrying) {
            newState = 'parry';
        } else if (this.isAttacking) {
            newState = `attack${this.comboStep}`;
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
            this.currentAnimState = newState as any;
            this.playAnimIfExists(`player2_${newState}`);
        }
    }

    protected playAnimIfExists(key: string): void {
        if (this.scene.anims.exists(key)) {
            this.play(key, true);
        }
    }

    // =====================================================================
    // DEATH OVERRIDE - Emit with correct player number
    // =====================================================================

    protected die(): void {
        this.isDead = true;
        this.isAttacking = false;
        this.isDodging = false;
        this.isHealing = false;
        this.isParrying = false;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        body.setEnable(false);

        this.currentAnimState = 'dead' as any;
        this.playAnimIfExists('player2_dead');

        this.scene.events.emit('player_died', {
            player: this,
            playerNumber: this.playerNumber,
        });

        Logger.info('Player2', 'Player 2 died');
    }
}
