import { Player } from './Player';
import { Logger } from '../utils/Logger';

/**
 * Co-op player character (P2 - Soyul/소율).
 * Inherits all behavior from Player. In the current top-down RPG version,
 * co-op support is minimal — Player2 exists as a placeholder for future
 * implementation of local co-op grid-based movement.
 */
export class Player2 extends Player {
    constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
        super(scene, gridX, gridY);
        Logger.info('Player2', 'Co-op player initialized');
    }
}
