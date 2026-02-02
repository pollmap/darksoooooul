import { GameState } from './GameState';

/**
 * Convenience wrapper for accessing player-specific state.
 * Delegates to GameState singleton.
 */
export class PlayerState {
    private gameState: GameState;

    constructor() {
        this.gameState = GameState.getInstance();
    }

    public get health(): number { return this.gameState.getHealth(); }
    public get maxHealth(): number { return this.gameState.getMaxHealth(); }
    public get gold(): number { return this.gameState.getGold(); }
    public get level(): number { return this.gameState.getLevel(); }
    public get exp(): number { return this.gameState.getExp(); }
    public get currentArea(): string { return this.gameState.getCurrentArea(); }

    public heal(amount: number): void {
        this.gameState.setHealth(Math.min(this.health + amount, this.maxHealth));
    }

    public takeDamage(amount: number): void {
        this.gameState.setHealth(Math.max(0, this.health - amount));
    }

    public isDead(): boolean {
        return this.health <= 0;
    }
}
