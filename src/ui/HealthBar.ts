import Phaser from 'phaser';
import { COLORS } from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';

/**
 * A health bar UI component with smooth animation.
 */
export class HealthBar extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private bar: Phaser.GameObjects.Graphics;
    private damageBar: Phaser.GameObjects.Graphics;
    private label: Phaser.GameObjects.Text;
    private barWidth: number;
    private barHeight: number;
    private currentPercent: number = 1;
    private displayPercent: number = 1;
    private damagePercent: number = 1;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, name?: string) {
        super(scene, x, y);
        scene.add.existing(this);

        this.barWidth = width;
        this.barHeight = height;

        // Background
        this.background = scene.add.graphics();
        this.background.fillStyle(0x333333, 0.8);
        this.background.fillRect(0, 0, width, height);
        this.background.lineStyle(1, 0x555555);
        this.background.strokeRect(0, 0, width, height);
        this.add(this.background);

        // Damage bar (shows trailing damage)
        this.damageBar = scene.add.graphics();
        this.add(this.damageBar);

        // Health bar
        this.bar = scene.add.graphics();
        this.add(this.bar);

        // Name label
        if (name) {
            this.label = scene.add.text(0, -16, name, {
                fontSize: '12px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1,
            });
            this.add(this.label);
        } else {
            this.label = scene.add.text(0, 0, '').setVisible(false);
            this.add(this.label);
        }

        this.drawBar();
        this.setScrollFactor(0);
    }

    /** Update the health bar with current and max values */
    public updateValue(current: number, max: number): void {
        const newPercent = MathUtils.clamp(current / max, 0, 1);
        this.currentPercent = newPercent;
        this.drawBar();
    }

    public update(current: number, max: number): void {
        this.updateValue(current, max);
    }

    preUpdate(): void {
        // Smooth damage bar trailing
        if (this.damagePercent > this.currentPercent) {
            this.damagePercent -= 0.005;
            if (this.damagePercent < this.currentPercent) {
                this.damagePercent = this.currentPercent;
            }
            this.drawDamageBar();
        }
    }

    private drawBar(): void {
        // If damage, set damage bar to previous value
        if (this.currentPercent < this.displayPercent) {
            this.damagePercent = this.displayPercent;
        }
        this.displayPercent = this.currentPercent;

        this.bar.clear();
        this.bar.fillStyle(this.getBarColor(), 1);
        this.bar.fillRect(1, 1, (this.barWidth - 2) * this.currentPercent, this.barHeight - 2);

        this.drawDamageBar();
    }

    private drawDamageBar(): void {
        this.damageBar.clear();
        if (this.damagePercent > this.currentPercent) {
            this.damageBar.fillStyle(0xff6666, 0.6);
            this.damageBar.fillRect(
                1 + (this.barWidth - 2) * this.currentPercent,
                1,
                (this.barWidth - 2) * (this.damagePercent - this.currentPercent),
                this.barHeight - 2
            );
        }
    }

    private getBarColor(): number {
        if (this.currentPercent > 0.5) return COLORS.HEALTH_BAR;
        if (this.currentPercent > 0.25) return 0xff8800;
        return 0xff0000;
    }
}
