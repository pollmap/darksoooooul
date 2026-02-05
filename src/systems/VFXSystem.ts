import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/** Screen shake intensity presets */
const SHAKE_PRESETS = {
    LIGHT: { intensity: 0.003, duration: 100 },
    MEDIUM: { intensity: 0.006, duration: 200 },
    HEAVY: { intensity: 0.012, duration: 350 },
    BOSS: { intensity: 0.02, duration: 500 },
} as const;

/** Particle burst configuration */
interface IParticleBurst {
    x: number;
    y: number;
    count: number;
    color: number;
    speed: number;
    lifespan: number;
    gravity?: number;
    size?: number;
}

/**
 * Visual effects system providing screen shake, flash, particles,
 * floating damage numbers, trail effects, and vignette overlay.
 */
export class VFXSystem {
    private scene: Phaser.Scene;
    private vignette: Phaser.GameObjects.Graphics | null = null;
    private vignetteAlpha: number = 0;
    private damageFlashOverlay: Phaser.GameObjects.Rectangle | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        Logger.info('VFXSystem', 'VFX system initialized');
    }

    // ─── Screen Shake ───────────────────────────────────────────────

    /** Light screen shake (small hit) */
    public shakeLight(): void {
        this.shake(SHAKE_PRESETS.LIGHT.intensity, SHAKE_PRESETS.LIGHT.duration);
    }

    /** Medium screen shake (strong hit) */
    public shakeMedium(): void {
        this.shake(SHAKE_PRESETS.MEDIUM.intensity, SHAKE_PRESETS.MEDIUM.duration);
    }

    /** Heavy screen shake (boss attack) */
    public shakeHeavy(): void {
        this.shake(SHAKE_PRESETS.HEAVY.intensity, SHAKE_PRESETS.HEAVY.duration);
    }

    /** Boss-level screen shake */
    public shakeBoss(): void {
        this.shake(SHAKE_PRESETS.BOSS.intensity, SHAKE_PRESETS.BOSS.duration);
    }

    /** Custom screen shake */
    public shake(intensity: number, duration: number): void {
        this.scene.cameras.main.shake(duration, intensity);
    }

    // ─── Screen Flash ───────────────────────────────────────────────

    /** Flash the screen white (parry, level up) */
    public flashWhite(duration: number = 200): void {
        this.flash(0xffffff, duration, 0.4);
    }

    /** Flash the screen red (player hit) */
    public flashRed(duration: number = 150): void {
        this.flash(0xff0000, duration, 0.25);
    }

    /** Flash the screen gold (perfect parry) */
    public flashGold(duration: number = 300): void {
        this.flash(0xffd700, duration, 0.35);
    }

    /** Custom screen flash with color */
    public flash(color: number, duration: number, alpha: number = 0.3): void {
        if (!this.damageFlashOverlay) {
            this.damageFlashOverlay = this.scene.add.rectangle(
                GAME_WIDTH / 2, GAME_HEIGHT / 2,
                GAME_WIDTH, GAME_HEIGHT,
                color, 0
            ).setScrollFactor(0).setDepth(DEPTH.UI + 50);
        }

        this.damageFlashOverlay.setFillStyle(color, alpha);

        this.scene.tweens.add({
            targets: this.damageFlashOverlay,
            alpha: { from: alpha, to: 0 },
            duration,
            ease: 'Power2',
        });
    }

    // ─── Floating Damage Numbers ────────────────────────────────────

    /** Show floating damage number at world position */
    public showDamageNumber(
        x: number, y: number,
        damage: number,
        options: { isCrit?: boolean; isHeal?: boolean; color?: string } = {}
    ): void {
        const { isCrit = false, isHeal = false, color } = options;

        let textColor = color || '#ffffff';
        let fontSize = '16px';
        let prefix = '';

        if (isCrit) {
            textColor = '#ffcc00';
            fontSize = '24px';
            prefix = 'CRIT ';
        }
        if (isHeal) {
            textColor = '#44ff44';
            prefix = '+';
        }

        const offsetX = Phaser.Math.Between(-20, 20);
        const text = this.scene.add.text(x + offsetX, y - 10, `${prefix}${damage}`, {
            fontFamily: 'monospace',
            fontSize,
            color: textColor,
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: isCrit ? 'bold' : 'normal',
        }).setOrigin(0.5).setDepth(DEPTH.EFFECTS + 10);

        if (isCrit) {
            text.setScale(0.5);
            this.scene.tweens.add({
                targets: text,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 150,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: text,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 100,
                    });
                },
            });
        }

        this.scene.tweens.add({
            targets: text,
            y: y - 60,
            alpha: 0,
            duration: 900,
            ease: 'Power2',
            onComplete: () => text.destroy(),
        });
    }

    // ─── Particle Bursts ────────────────────────────────────────────

    /** Create a burst of pixel particles */
    public particleBurst(config: IParticleBurst): void {
        const { x, y, count, color, speed, lifespan, gravity = 200, size = 4 } = config;

        for (let i = 0; i < count; i++) {
            const angle = Phaser.Math.Between(0, 360);
            const spd = Phaser.Math.Between(speed * 0.5, speed);
            const velX = Math.cos(Phaser.Math.DegToRad(angle)) * spd;
            const velY = Math.sin(Phaser.Math.DegToRad(angle)) * spd;
            const particleSize = Phaser.Math.Between(Math.max(1, size - 2), size);

            const particle = this.scene.add.rectangle(
                x, y, particleSize, particleSize, color
            ).setDepth(DEPTH.EFFECTS);

            this.scene.tweens.add({
                targets: particle,
                x: x + velX * (lifespan / 1000),
                y: y + velY * (lifespan / 1000) + gravity * 0.5 * (lifespan / 1000) ** 2,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: lifespan,
                ease: 'Power1',
                onComplete: () => particle.destroy(),
            });
        }
    }

    /** Hit spark effect */
    public hitSpark(x: number, y: number, isCrit: boolean = false): void {
        const color = isCrit ? 0xffcc00 : 0xffffff;
        const count = isCrit ? 16 : 10;
        const speed = isCrit ? 250 : 180;

        this.particleBurst({
            x, y, count, color, speed,
            lifespan: 400,
            gravity: 100,
            size: isCrit ? 5 : 3,
        });

        if (isCrit) {
            this.shakeLight();
        }
    }

    /** Death explosion effect */
    public deathExplosion(x: number, y: number, color: number = 0xff4444): void {
        this.particleBurst({
            x, y,
            count: 24,
            color,
            speed: 200,
            lifespan: 800,
            gravity: 300,
            size: 5,
        });

        // Secondary burst
        this.particleBurst({
            x, y,
            count: 12,
            color: 0xffffff,
            speed: 120,
            lifespan: 500,
            gravity: 100,
            size: 3,
        });

        this.shakeMedium();
    }

    /** Parry flash effect */
    public parryFlash(x: number, y: number, isPerfect: boolean): void {
        const color = isPerfect ? 0xffd700 : 0x88ccff;
        const ringColor = isPerfect ? 0xffd700 : 0x88ccff;

        // Particle burst
        this.particleBurst({
            x, y,
            count: isPerfect ? 20 : 12,
            color,
            speed: isPerfect ? 300 : 200,
            lifespan: 500,
            gravity: 50,
            size: isPerfect ? 5 : 3,
        });

        // Expanding ring
        const ring = this.scene.add.circle(x, y, 8, ringColor, 0.6)
            .setDepth(DEPTH.EFFECTS + 5);

        this.scene.tweens.add({
            targets: ring,
            scaleX: isPerfect ? 6 : 4,
            scaleY: isPerfect ? 6 : 4,
            alpha: 0,
            duration: isPerfect ? 500 : 350,
            ease: 'Power2',
            onComplete: () => ring.destroy(),
        });

        // Second ring for perfect
        if (isPerfect) {
            this.scene.time.delayedCall(80, () => {
                const ring2 = this.scene.add.circle(x, y, 12, 0xffffff, 0.4)
                    .setDepth(DEPTH.EFFECTS + 5);
                this.scene.tweens.add({
                    targets: ring2,
                    scaleX: 5,
                    scaleY: 5,
                    alpha: 0,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => ring2.destroy(),
                });
            });

            this.flashGold(250);
            this.shakeMedium();
        } else {
            this.flashWhite(150);
            this.shakeLight();
        }
    }

    /** Heal effect with rising green particles */
    public healEffect(x: number, y: number): void {
        for (let i = 0; i < 15; i++) {
            const offsetX = Phaser.Math.Between(-20, 20);
            const delay = Phaser.Math.Between(0, 500);

            this.scene.time.delayedCall(delay, () => {
                const particle = this.scene.add.rectangle(
                    x + offsetX, y + 10, 4, 4, 0x44ff88
                ).setDepth(DEPTH.EFFECTS).setAlpha(0.8);

                this.scene.tweens.add({
                    targets: particle,
                    y: y - 50 - Phaser.Math.Between(0, 30),
                    alpha: 0,
                    scaleX: 0.3,
                    scaleY: 0.3,
                    duration: 800,
                    ease: 'Power1',
                    onComplete: () => particle.destroy(),
                });
            });
        }
    }

    /** Level up effect */
    public levelUpEffect(x: number, y: number): void {
        // Golden pillar
        const pillar = this.scene.add.rectangle(x, y, 6, 0, 0xffd700, 0.6)
            .setDepth(DEPTH.EFFECTS + 5);

        this.scene.tweens.add({
            targets: pillar,
            displayHeight: 200,
            y: y - 100,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => pillar.destroy(),
        });

        // Radial burst
        this.particleBurst({
            x, y,
            count: 30,
            color: 0xffd700,
            speed: 250,
            lifespan: 1000,
            gravity: -50,
            size: 5,
        });

        this.flashGold(400);
        this.shakeMedium();

        // Text
        const text = this.scene.add.text(x, y - 30, 'LEVEL UP!', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.EFFECTS + 10).setScale(0.5);

        this.scene.tweens.add({
            targets: text,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 300,
            ease: 'Back.easeOut',
            yoyo: true,
            hold: 500,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: text,
                    y: y - 80,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => text.destroy(),
                });
            },
        });
    }

    // ─── Trail Effect ───────────────────────────────────────────────

    /** Create a dodge/dash after-image trail */
    public dashTrail(
        sprite: Phaser.GameObjects.Sprite,
        color: number = 0x4488ff,
        count: number = 5
    ): void {
        const interval = 40;
        for (let i = 0; i < count; i++) {
            this.scene.time.delayedCall(i * interval, () => {
                if (!sprite.active) return;

                const ghost = this.scene.add.rectangle(
                    sprite.x, sprite.y,
                    sprite.displayWidth, sprite.displayHeight,
                    color, 0.4
                ).setDepth(DEPTH.EFFECTS - 1);

                this.scene.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    scaleX: 0.8,
                    scaleY: 0.8,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => ghost.destroy(),
                });
            });
        }
    }

    // ─── Vignette ───────────────────────────────────────────────────

    /** Create or update a vignette overlay for atmosphere */
    public setVignette(alpha: number): void {
        this.vignetteAlpha = alpha;

        if (alpha <= 0) {
            if (this.vignette) {
                this.vignette.destroy();
                this.vignette = null;
            }
            return;
        }

        if (!this.vignette) {
            this.vignette = this.scene.add.graphics()
                .setScrollFactor(0)
                .setDepth(DEPTH.UI + 40);
        }

        this.vignette.clear();

        // Radial gradient vignette using concentric rectangles
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const a = t * t * alpha;
            this.vignette.fillStyle(0x000000, a);

            const margin = (1 - t) * 0.5;
            const x = margin * GAME_WIDTH;
            const y = margin * GAME_HEIGHT;
            const w = GAME_WIDTH - x * 2;
            const h = GAME_HEIGHT - y * 2;

            if (w > 0 && h > 0) {
                this.vignette.fillRect(
                    x - (GAME_WIDTH * 0.05), y - (GAME_HEIGHT * 0.05),
                    w + (GAME_WIDTH * 0.1), h + (GAME_HEIGHT * 0.1)
                );
            }
        }

        // Dark corners
        this.vignette.fillStyle(0x000000, alpha * 0.7);
        this.vignette.fillRect(0, 0, GAME_WIDTH * 0.15, GAME_HEIGHT * 0.15);
        this.vignette.fillRect(GAME_WIDTH * 0.85, 0, GAME_WIDTH * 0.15, GAME_HEIGHT * 0.15);
        this.vignette.fillRect(0, GAME_HEIGHT * 0.85, GAME_WIDTH * 0.15, GAME_HEIGHT * 0.15);
        this.vignette.fillRect(GAME_WIDTH * 0.85, GAME_HEIGHT * 0.85, GAME_WIDTH * 0.15, GAME_HEIGHT * 0.15);
    }

    // ─── Slow Motion ────────────────────────────────────────────────

    /** Hitstop / freeze frame effect */
    public hitStop(durationMs: number = 60): void {
        this.scene.time.timeScale = 0.05;
        this.scene.time.delayedCall(durationMs, () => {
            this.scene.time.timeScale = 1;
        });
    }

    // ─── Cleanup ────────────────────────────────────────────────────

    /** Clean up all VFX resources */
    public destroy(): void {
        if (this.vignette) {
            this.vignette.destroy();
            this.vignette = null;
        }
        if (this.damageFlashOverlay) {
            this.damageFlashOverlay.destroy();
            this.damageFlashOverlay = null;
        }
        Logger.info('VFXSystem', 'VFX system destroyed');
    }
}
