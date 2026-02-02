import Phaser from 'phaser';
import { COLORS } from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';

/**
 * An energy/mana bar UI component.
 */
export class EnergyBar extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private bar: Phaser.GameObjects.Graphics;
    private barWidth: number;
    private barHeight: number;
    private currentPercent: number = 1;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        super(scene, x, y);
        scene.add.existing(this);

        this.barWidth = width;
        this.barHeight = height;

        this.background = scene.add.graphics();
        this.background.fillStyle(0x222244, 0.8);
        this.background.fillRect(0, 0, width, height);
        this.background.lineStyle(1, 0x444466);
        this.background.strokeRect(0, 0, width, height);
        this.add(this.background);

        this.bar = scene.add.graphics();
        this.add(this.bar);

        this.drawBar();
        this.setScrollFactor(0);
    }

    /** Update the energy bar display */
    public update(current: number, max: number): void {
        this.currentPercent = MathUtils.clamp(current / max, 0, 1);
        this.drawBar();
    }

    private drawBar(): void {
        this.bar.clear();
        this.bar.fillStyle(COLORS.ENERGY_BAR, 1);
        this.bar.fillRect(1, 1, (this.barWidth - 2) * this.currentPercent, this.barHeight - 2);
    }
}
