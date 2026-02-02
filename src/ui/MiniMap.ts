import Phaser from 'phaser';
import { GAME_WIDTH } from '../utils/Constants';

/**
 * Mini-map UI component showing player position in the current area.
 */
export class MiniMap extends Phaser.GameObjects.Container {
    private mapBackground: Phaser.GameObjects.Graphics;
    private playerDot: Phaser.GameObjects.Graphics;
    private mapWidth: number;
    private mapHeight: number;
    private worldWidth: number;
    private worldHeight: number;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        mapWidth: number = 150,
        mapHeight: number = 100,
        worldWidth: number = 3200,
        worldHeight: number = 1600
    ) {
        super(scene, x, y);
        scene.add.existing(this);

        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        // Map background
        this.mapBackground = scene.add.graphics();
        this.mapBackground.fillStyle(0x111111, 0.7);
        this.mapBackground.fillRect(0, 0, mapWidth, mapHeight);
        this.mapBackground.lineStyle(1, 0x444444);
        this.mapBackground.strokeRect(0, 0, mapWidth, mapHeight);
        this.add(this.mapBackground);

        // Player position dot
        this.playerDot = scene.add.graphics();
        this.playerDot.fillStyle(0x1a237e, 1);
        this.playerDot.fillCircle(0, 0, 3);
        this.add(this.playerDot);

        this.setScrollFactor(0);
        this.setDepth(100);
    }

    /** Update player position on the mini-map */
    public updatePlayerPosition(worldX: number, worldY: number): void {
        const mapX = (worldX / this.worldWidth) * this.mapWidth;
        const mapY = (worldY / this.worldHeight) * this.mapHeight;
        this.playerDot.setPosition(mapX, mapY);
    }

    /** Update player 2 position (optional) */
    public updatePlayer2Position(worldX: number, worldY: number): void {
        // Could add a second dot for P2
    }

    /** Set world dimensions for scaling */
    public setWorldSize(width: number, height: number): void {
        this.worldWidth = width;
        this.worldHeight = height;
    }
}
