import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';
import { Logger } from '../utils/Logger';

/** Weather types */
type TWeatherType = 'clear' | 'rain' | 'snow' | 'dust' | 'fog' | 'fireflies';

/** Weather particle configuration */
interface IWeatherConfig {
    type: TWeatherType;
    intensity: number; // 0-1
    windSpeed: number; // pixels per second
}

/** Minimum required particle properties */
interface IWeatherParticle {
    x: number;
    y: number;
    velX: number;
    velY: number;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    color: number;
}

/**
 * Weather and atmosphere system using canvas-based particle rendering.
 * Supports rain, snow, dust, fog, and firefly effects.
 */
export class WeatherSystem {
    private scene: Phaser.Scene;
    private config: IWeatherConfig = { type: 'clear', intensity: 0, windSpeed: 0 };
    private particles: IWeatherParticle[] = [];
    private graphics: Phaser.GameObjects.Graphics;
    private fogOverlay: Phaser.GameObjects.Rectangle | null = null;
    private isActive: boolean = false;

    /** Maximum particle count for performance */
    private static readonly MAX_PARTICLES = 300;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics()
            .setScrollFactor(0)
            .setDepth(DEPTH.FOREGROUND + 5);
        Logger.info('WeatherSystem', 'Weather system initialized');
    }

    /** Set the current weather */
    public setWeather(type: TWeatherType, intensity: number = 0.5, windSpeed: number = 0): void {
        this.config = { type, intensity: Phaser.Math.Clamp(intensity, 0, 1), windSpeed };
        this.isActive = type !== 'clear';

        // Clean up fog overlay if not fog
        if (type !== 'fog' && this.fogOverlay) {
            this.fogOverlay.destroy();
            this.fogOverlay = null;
        }

        // Create fog overlay
        if (type === 'fog' && !this.fogOverlay) {
            this.fogOverlay = this.scene.add.rectangle(
                GAME_WIDTH / 2, GAME_HEIGHT / 2,
                GAME_WIDTH, GAME_HEIGHT,
                0x888899, intensity * 0.3
            ).setScrollFactor(0).setDepth(DEPTH.FOREGROUND + 4);
        }

        if (!this.isActive) {
            this.particles = [];
            this.graphics.clear();
        }

        Logger.info('WeatherSystem', `Weather set to: ${type} (intensity: ${intensity})`);
    }

    /** Update particles each frame */
    public update(_time: number, delta: number): void {
        if (!this.isActive) return;

        const dt = delta / 1000;

        // Spawn new particles
        this.spawnParticles(dt);

        // Update existing particles
        this.updateParticles(dt);

        // Render
        this.render();
    }

    /** Spawn new particles based on weather type and intensity */
    private spawnParticles(dt: number): void {
        const targetCount = Math.floor(this.config.intensity * WeatherSystem.MAX_PARTICLES);
        const spawnRate = targetCount * 2; // per second
        const spawnCount = Math.min(
            Math.floor(spawnRate * dt),
            targetCount - this.particles.length
        );

        for (let i = 0; i < spawnCount; i++) {
            if (this.particles.length >= WeatherSystem.MAX_PARTICLES) break;
            this.particles.push(this.createParticle());
        }
    }

    /** Create a single weather particle based on type */
    private createParticle(): IWeatherParticle {
        const x = Phaser.Math.Between(0, GAME_WIDTH);

        switch (this.config.type) {
            case 'rain':
                return {
                    x,
                    y: Phaser.Math.Between(-20, -5),
                    velX: this.config.windSpeed + Phaser.Math.Between(-20, 20),
                    velY: Phaser.Math.Between(400, 600),
                    size: Phaser.Math.Between(1, 2),
                    alpha: Phaser.Math.FloatBetween(0.3, 0.7),
                    life: 0,
                    maxLife: 2,
                    color: 0x8899cc,
                };

            case 'snow':
                return {
                    x,
                    y: Phaser.Math.Between(-20, -5),
                    velX: this.config.windSpeed + Phaser.Math.Between(-30, 30),
                    velY: Phaser.Math.Between(30, 80),
                    size: Phaser.Math.Between(2, 4),
                    alpha: Phaser.Math.FloatBetween(0.5, 0.9),
                    life: 0,
                    maxLife: 8,
                    color: 0xeeeeff,
                };

            case 'dust':
                return {
                    x,
                    y: Phaser.Math.Between(GAME_HEIGHT * 0.3, GAME_HEIGHT),
                    velX: this.config.windSpeed + Phaser.Math.Between(10, 50),
                    velY: Phaser.Math.Between(-15, 15),
                    size: Phaser.Math.Between(1, 3),
                    alpha: Phaser.Math.FloatBetween(0.15, 0.4),
                    life: 0,
                    maxLife: 5,
                    color: 0xaa9977,
                };

            case 'fireflies':
                return {
                    x,
                    y: Phaser.Math.Between(GAME_HEIGHT * 0.2, GAME_HEIGHT * 0.8),
                    velX: Phaser.Math.Between(-20, 20),
                    velY: Phaser.Math.Between(-20, 20),
                    size: Phaser.Math.Between(2, 4),
                    alpha: 0,
                    life: 0,
                    maxLife: Phaser.Math.FloatBetween(3, 6),
                    color: 0xffee44,
                };

            case 'fog':
                return {
                    x,
                    y: Phaser.Math.Between(0, GAME_HEIGHT),
                    velX: this.config.windSpeed + Phaser.Math.Between(5, 20),
                    velY: Phaser.Math.Between(-5, 5),
                    size: Phaser.Math.Between(20, 50),
                    alpha: Phaser.Math.FloatBetween(0.03, 0.08),
                    life: 0,
                    maxLife: 10,
                    color: 0x888899,
                };

            default:
                return {
                    x, y: 0, velX: 0, velY: 0, size: 1,
                    alpha: 0, life: 0, maxLife: 1, color: 0xffffff,
                };
        }
    }

    /** Update all particle positions and lifetimes */
    private updateParticles(dt: number): void {
        this.particles = this.particles.filter(p => {
            p.life += dt;
            if (p.life >= p.maxLife) return false;
            if (p.y > GAME_HEIGHT + 20 || p.x > GAME_WIDTH + 50 || p.x < -50) return false;

            p.x += p.velX * dt;
            p.y += p.velY * dt;

            // Firefly special: sinusoidal wobble and fade in/out
            if (this.config.type === 'fireflies') {
                p.velX += Phaser.Math.Between(-40, 40) * dt;
                p.velY += Phaser.Math.Between(-40, 40) * dt;
                p.velX = Phaser.Math.Clamp(p.velX, -30, 30);
                p.velY = Phaser.Math.Clamp(p.velY, -30, 30);

                const lifeRatio = p.life / p.maxLife;
                if (lifeRatio < 0.2) {
                    p.alpha = lifeRatio / 0.2 * 0.8;
                } else if (lifeRatio > 0.8) {
                    p.alpha = (1 - lifeRatio) / 0.2 * 0.8;
                } else {
                    p.alpha = 0.5 + 0.3 * Math.sin(p.life * 4);
                }
            }

            // Snow special: slight wobble
            if (this.config.type === 'snow') {
                p.velX += Math.sin(p.life * 2) * 10 * dt;
            }

            return true;
        });
    }

    /** Render all particles to the graphics object */
    private render(): void {
        this.graphics.clear();

        for (const p of this.particles) {
            if (p.alpha <= 0) continue;

            if (this.config.type === 'rain') {
                // Rain drops: vertical lines
                this.graphics.lineStyle(p.size, p.color, p.alpha);
                this.graphics.lineBetween(p.x, p.y, p.x + p.velX * 0.02, p.y + p.velY * 0.02);
            } else if (this.config.type === 'fog') {
                // Fog: large semi-transparent circles
                this.graphics.fillStyle(p.color, p.alpha);
                this.graphics.fillCircle(p.x, p.y, p.size);
            } else if (this.config.type === 'fireflies') {
                // Fireflies: small glowing circles with halo
                this.graphics.fillStyle(p.color, p.alpha * 0.2);
                this.graphics.fillCircle(p.x, p.y, p.size * 3);
                this.graphics.fillStyle(p.color, p.alpha);
                this.graphics.fillCircle(p.x, p.y, p.size);
                this.graphics.fillStyle(0xffffff, p.alpha * 0.8);
                this.graphics.fillCircle(p.x, p.y, p.size * 0.5);
            } else {
                // Default: filled rectangles
                this.graphics.fillStyle(p.color, p.alpha);
                this.graphics.fillRect(p.x, p.y, p.size, p.size);
            }
        }
    }

    /** Get current weather type */
    public getWeatherType(): TWeatherType {
        return this.config.type;
    }

    /** Clean up */
    public destroy(): void {
        this.particles = [];
        this.graphics.destroy();
        if (this.fogOverlay) {
            this.fogOverlay.destroy();
            this.fogOverlay = null;
        }
        Logger.info('WeatherSystem', 'Weather system destroyed');
    }
}
