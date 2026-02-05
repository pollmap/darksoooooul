import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, COLOR_STRINGS, DEPTH } from '../utils/Constants';
import { SaveSystem } from '../systems/SaveSystem';
import { SettingsSystem } from '../systems/SettingsSystem';
import { SettingsUI } from '../ui/SettingsUI';
import { Logger } from '../utils/Logger';

/** Ambient particle for title screen atmosphere */
interface ITitleParticle {
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

/** Maximum atmospheric particles */
const MAX_AMBIENT_PARTICLES = 80;

/**
 * Cinematic main menu scene with animated background, particle effects,
 * parallax mountains, and atmospheric moon lighting.
 */
export class MainMenuScene extends BaseScene {
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedIndex: number = 0;
    private titleText!: Phaser.GameObjects.Text;
    private subtitleText!: Phaser.GameObjects.Text;
    private settingsUI!: SettingsUI;
    private settingsOpen: boolean = false;

    // Cinematic background elements
    private ambientParticles: ITitleParticle[] = [];
    private particleGraphics!: Phaser.GameObjects.Graphics;
    private moonGraphics!: Phaser.GameObjects.Graphics;
    private mountainLayers: Phaser.GameObjects.Graphics[] = [];
    private menuSelector!: Phaser.GameObjects.Rectangle;
    private titleGlow!: Phaser.GameObjects.Text;
    private fpsText: Phaser.GameObjects.Text | null = null;

    constructor() {
        super(SCENES.MAIN_MENU);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x0a0a18);

        this.createCinematicBackground();
        this.createMoon();
        this.createMountainLayers();
        this.createTitleElements();
        this.createMenuElements();
        this.createFooterElements();

        // Settings UI
        this.settingsUI = new SettingsUI(this);

        // Particle system
        this.particleGraphics = this.add.graphics()
            .setDepth(DEPTH.FOREGROUND + 5);

        this.setupKeyboardControls();
        this.fadeIn(800);

        // FPS counter
        const settings = SettingsSystem.getInstance();
        if (settings.get('showFPS')) {
            this.fpsText = this.add.text(10, GAME_HEIGHT - 20, '', {
                fontSize: '12px', color: '#44ff44',
            }).setDepth(DEPTH.UI + 50);
        }

        Logger.info('MainMenuScene', 'Cinematic main menu displayed');
    }

    update(time: number, delta: number): void {
        this.updateAmbientParticles(delta / 1000);
        this.renderParticles();

        // FPS
        if (this.fpsText) {
            this.fpsText.setText(`FPS: ${Math.round(1000 / delta)}`);
        }
    }

    // ─── Cinematic Background ───────────────────────────────────────

    /** Create the atmospheric gradient background */
    private createCinematicBackground(): void {
        const g = this.add.graphics().setDepth(DEPTH.BACKGROUND - 5);

        // Night sky gradient
        const steps = 60;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const r = Math.floor(10 + t * 15);
            const gv = Math.floor(10 + t * 12);
            const b = Math.floor(24 + t * 30);
            const color = (r << 16) | (gv << 8) | b;
            const yStart = t * GAME_HEIGHT;
            const yHeight = GAME_HEIGHT / steps + 1;
            g.fillStyle(color, 1);
            g.fillRect(0, yStart, GAME_WIDTH, yHeight);
        }

        // Stars
        for (let i = 0; i < 100; i++) {
            const sx = Phaser.Math.Between(0, GAME_WIDTH);
            const sy = Phaser.Math.Between(0, GAME_HEIGHT * 0.6);
            const size = Phaser.Math.Between(1, 2);
            const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
            g.fillStyle(0xffffff, alpha);
            g.fillRect(sx, sy, size, size);
        }

        // Twinkling stars
        for (let i = 0; i < 15; i++) {
            const sx = Phaser.Math.Between(0, GAME_WIDTH);
            const sy = Phaser.Math.Between(0, GAME_HEIGHT * 0.4);
            const star = this.add.circle(sx, sy, 1.5, 0xffffff, 0.8)
                .setDepth(DEPTH.BACKGROUND - 4);
            this.tweens.add({
                targets: star,
                alpha: { from: 0.3, to: 0.9 },
                duration: Phaser.Math.Between(1500, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
            });
        }
    }

    /** Create an atmospheric moon */
    private createMoon(): void {
        this.moonGraphics = this.add.graphics().setDepth(DEPTH.BACKGROUND - 3);

        const mx = GAME_WIDTH * 0.8;
        const my = 120;
        const radius = 40;

        // Moon glow (outer)
        for (let i = 5; i > 0; i--) {
            const glowR = radius + i * 15;
            const glowA = 0.02 * (6 - i);
            this.moonGraphics.fillStyle(0xeeddcc, glowA);
            this.moonGraphics.fillCircle(mx, my, glowR);
        }

        // Moon body
        this.moonGraphics.fillStyle(0xeeeedd, 0.9);
        this.moonGraphics.fillCircle(mx, my, radius);

        // Crescent shadow
        this.moonGraphics.fillStyle(0x0a0a18, 0.85);
        this.moonGraphics.fillCircle(mx - 12, my - 8, radius - 4);

        // Subtle craters on visible portion
        this.moonGraphics.fillStyle(0xccccbb, 0.3);
        this.moonGraphics.fillCircle(mx + 15, my + 5, 5);
        this.moonGraphics.fillCircle(mx + 8, my - 12, 3);
        this.moonGraphics.fillCircle(mx + 20, my - 5, 4);
    }

    /** Create parallax mountain silhouette layers */
    private createMountainLayers(): void {
        const layerConfigs = [
            { color: 0x0e0e20, yBase: 520, amplitude: 100, peaks: 6, alpha: 1.0 },
            { color: 0x141428, yBase: 480, amplitude: 120, peaks: 5, alpha: 0.9 },
            { color: 0x1a1a35, yBase: 440, amplitude: 80, peaks: 7, alpha: 0.7 },
        ];

        layerConfigs.forEach((cfg, layerIdx) => {
            const g = this.add.graphics()
                .setDepth(DEPTH.BACKGROUND - 2 + layerIdx);

            g.fillStyle(cfg.color, cfg.alpha);
            g.beginPath();
            g.moveTo(0, GAME_HEIGHT);

            // Generate mountain profile using sine waves
            for (let x = 0; x <= GAME_WIDTH; x += 2) {
                let y = cfg.yBase;
                for (let p = 1; p <= cfg.peaks; p++) {
                    const freq = p * 0.003 + layerIdx * 0.001;
                    const amp = cfg.amplitude / p;
                    y -= Math.abs(Math.sin(x * freq + layerIdx * 2)) * amp;
                }
                g.lineTo(x, y);
            }

            g.lineTo(GAME_WIDTH, GAME_HEIGHT);
            g.closePath();
            g.fill();

            this.mountainLayers.push(g);
        });

        // Foreground trees/structures silhouettes
        const fg = this.add.graphics().setDepth(DEPTH.BACKGROUND);
        fg.fillStyle(0x080812, 1);

        // Korean-style building silhouettes
        this.drawBuildingSilhouette(fg, 50, 550, 80, 100);
        this.drawBuildingSilhouette(fg, 200, 570, 60, 80);
        this.drawBuildingSilhouette(fg, GAME_WIDTH - 150, 560, 90, 90);
        this.drawBuildingSilhouette(fg, GAME_WIDTH - 300, 580, 70, 70);

        // Trees
        this.drawTreeSilhouette(fg, 350, 560, 40, 70);
        this.drawTreeSilhouette(fg, 900, 550, 50, 80);
        this.drawTreeSilhouette(fg, 1100, 570, 35, 60);

        // Ground
        fg.fillRect(0, 600, GAME_WIDTH, GAME_HEIGHT - 600);
    }

    /** Draw a Korean-style building silhouette */
    private drawBuildingSilhouette(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
        // Walls
        g.fillRect(x, y, w, h);
        // Curved roof
        g.fillRect(x - 10, y - 8, w + 20, 12);
        g.fillRect(x - 5, y - 14, w + 10, 8);
        // Roof tips
        g.fillRect(x - 15, y - 10, 12, 6);
        g.fillRect(x + w + 3, y - 10, 12, 6);
    }

    /** Draw a tree silhouette */
    private drawTreeSilhouette(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
        // Trunk
        g.fillRect(x + w / 2 - 4, y, 8, h * 0.5);
        // Canopy layers
        g.fillRect(x, y - h * 0.3, w, h * 0.5);
        g.fillRect(x + 5, y - h * 0.5, w - 10, h * 0.3);
    }

    // ─── Title Elements ─────────────────────────────────────────────

    /** Create animated title text elements */
    private createTitleElements(): void {
        // Title glow (behind main title)
        this.titleGlow = this.add.text(GAME_WIDTH / 2, 190, '삼한지몽', {
            fontSize: '68px',
            color: '#ffd700',
            stroke: '#ffd700',
            strokeThickness: 12,
            fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0.15).setDepth(DEPTH.BACKGROUND + 5);

        this.tweens.add({
            targets: this.titleGlow,
            alpha: { from: 0.1, to: 0.25 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Main title
        this.titleText = this.add.text(GAME_WIDTH / 2, 190, '삼한지몽', {
            fontSize: '64px',
            color: COLOR_STRINGS.WHITE,
            stroke: '#1a237e',
            strokeThickness: 6,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 6);

        // Animate title entrance
        this.titleText.setAlpha(0).setY(160);
        this.tweens.add({
            targets: [this.titleText, this.titleGlow],
            alpha: { from: 0, to: (target: Phaser.GameObjects.Text) => target === this.titleText ? 1 : 0.15 },
            y: 190,
            duration: 1200,
            ease: 'Power2',
            delay: 300,
        });

        // Subtitle with hanja
        this.subtitleText = this.add.text(GAME_WIDTH / 2, 260, '三韓之夢', {
            fontSize: '24px',
            color: '#998877',
            fontStyle: 'italic',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 6).setAlpha(0);

        this.tweens.add({
            targets: this.subtitleText,
            alpha: 0.8,
            duration: 1000,
            delay: 800,
        });

        // Tagline
        const tagline = this.add.text(GAME_WIDTH / 2, 295, '후삼국의 혼란 속에서, 당신의 운명을 개척하라', {
            fontSize: '14px',
            color: '#667788',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 6).setAlpha(0);

        this.tweens.add({
            targets: tagline,
            alpha: 0.7,
            duration: 800,
            delay: 1400,
        });

        // Decorative line under title
        const line = this.add.graphics().setDepth(DEPTH.BACKGROUND + 6);
        line.lineStyle(1, 0xffd700, 0);
        line.lineBetween(GAME_WIDTH / 2 - 150, 315, GAME_WIDTH / 2 + 150, 315);

        this.tweens.add({
            targets: line,
            alpha: 0.5,
            duration: 1000,
            delay: 1600,
        });
    }

    // ─── Menu Elements ──────────────────────────────────────────────

    /** Create the menu options */
    private createMenuElements(): void {
        const menuOptions = [
            { text: '새 게임', subtext: 'New Game' },
            { text: '이어하기', subtext: 'Continue' },
            { text: '설정', subtext: 'Settings' },
        ];
        const startY = 390;
        const spacing = 55;

        // Menu selector indicator
        this.menuSelector = this.add.rectangle(
            GAME_WIDTH / 2, startY, 220, 42, 0xffd700, 0.08
        ).setDepth(DEPTH.BACKGROUND + 7).setAlpha(0);

        this.tweens.add({
            targets: this.menuSelector,
            alpha: 0.08,
            duration: 600,
            delay: 2000,
        });

        menuOptions.forEach((option, index) => {
            // Main text
            const text = this.add.text(GAME_WIDTH / 2, startY + index * spacing, option.text, {
                fontSize: '26px',
                color: index === 0 ? COLOR_STRINGS.GOLD : '#cccccc',
                fontStyle: 'bold',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true })
                .setDepth(DEPTH.BACKGROUND + 8).setAlpha(0);

            // Sub-label (English)
            const sub = this.add.text(GAME_WIDTH / 2, startY + index * spacing + 18, option.subtext, {
                fontSize: '11px',
                color: '#556677',
            }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 8).setAlpha(0);

            // Entrance animation
            this.tweens.add({
                targets: [text, sub],
                alpha: (target: Phaser.GameObjects.Text) => target === text ? 1 : 0.6,
                x: { from: GAME_WIDTH / 2 - 30, to: GAME_WIDTH / 2 },
                duration: 500,
                delay: 1800 + index * 150,
                ease: 'Power2',
            });

            text.on('pointerover', () => this.selectItem(index));
            text.on('pointerdown', () => this.confirmSelection());

            this.menuItems.push(text);
        });
    }

    /** Create footer elements (version, credits) */
    private createFooterElements(): void {
        // Version
        this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 20, 'v2.0.0', {
            fontSize: '13px',
            color: '#334455',
        }).setOrigin(1).setDepth(DEPTH.BACKGROUND + 6);

        // Credits hint
        this.add.text(20, GAME_HEIGHT - 20, 'Phaser 3 + TypeScript', {
            fontSize: '11px',
            color: '#334455',
        }).setOrigin(0, 1).setDepth(DEPTH.BACKGROUND + 6);

        // Controls hint at bottom
        const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '↑↓ 선택  |  Enter/Z 확인', {
            fontSize: '12px',
            color: '#445566',
        }).setOrigin(0.5).setDepth(DEPTH.BACKGROUND + 6).setAlpha(0);

        this.tweens.add({
            targets: hint,
            alpha: 0.6,
            duration: 800,
            delay: 2500,
        });

        // Blinking hint
        this.tweens.add({
            targets: hint,
            alpha: { from: 0.4, to: 0.7 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            delay: 3500,
        });
    }

    // ─── Ambient Particles ──────────────────────────────────────────

    /** Update atmospheric floating particles */
    private updateAmbientParticles(dt: number): void {
        // Spawn
        while (this.ambientParticles.length < MAX_AMBIENT_PARTICLES) {
            this.ambientParticles.push({
                x: Phaser.Math.Between(0, GAME_WIDTH),
                y: Phaser.Math.Between(0, GAME_HEIGHT),
                velX: Phaser.Math.FloatBetween(-8, 8),
                velY: Phaser.Math.FloatBetween(-12, -3),
                size: Phaser.Math.Between(1, 3),
                alpha: 0,
                life: 0,
                maxLife: Phaser.Math.FloatBetween(4, 10),
                color: Phaser.Math.RND.pick([0xffd700, 0xffaa44, 0x88aaff, 0xffffff]),
            });
        }

        // Update
        this.ambientParticles = this.ambientParticles.filter(p => {
            p.life += dt;
            if (p.life >= p.maxLife) return false;

            p.x += p.velX * dt;
            p.y += p.velY * dt;

            // Wobble
            p.velX += Math.sin(p.life * 1.5) * 3 * dt;

            // Fade in/out
            const lifeRatio = p.life / p.maxLife;
            if (lifeRatio < 0.15) {
                p.alpha = lifeRatio / 0.15 * 0.6;
            } else if (lifeRatio > 0.7) {
                p.alpha = (1 - lifeRatio) / 0.3 * 0.6;
            }

            return true;
        });
    }

    /** Render particles to graphics */
    private renderParticles(): void {
        this.particleGraphics.clear();

        for (const p of this.ambientParticles) {
            if (p.alpha <= 0) continue;

            // Glow halo
            this.particleGraphics.fillStyle(p.color, p.alpha * 0.15);
            this.particleGraphics.fillCircle(p.x, p.y, p.size * 3);

            // Core
            this.particleGraphics.fillStyle(p.color, p.alpha);
            this.particleGraphics.fillCircle(p.x, p.y, p.size);
        }
    }

    // ─── Keyboard Controls ──────────────────────────────────────────

    /** Set up keyboard input handlers */
    private setupKeyboardControls(): void {
        if (!this.input.keyboard) return;

        this.input.keyboard.on('keydown-UP', () => {
            if (this.settingsOpen) {
                this.settingsUI.moveSelection(-1);
            } else {
                this.moveSelection(-1);
            }
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            if (this.settingsOpen) {
                this.settingsUI.moveSelection(1);
            } else {
                this.moveSelection(1);
            }
        });
        this.input.keyboard.on('keydown-W', () => {
            if (!this.settingsOpen) this.moveSelection(-1);
        });
        this.input.keyboard.on('keydown-S', () => {
            if (!this.settingsOpen) this.moveSelection(1);
        });
        this.input.keyboard.on('keydown-LEFT', () => {
            if (this.settingsOpen) this.settingsUI.adjustSetting(-1);
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (this.settingsOpen) this.settingsUI.adjustSetting(1);
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.settingsOpen) {
                this.settingsUI.adjustSetting(0);
            } else {
                this.confirmSelection();
            }
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.settingsOpen) this.confirmSelection();
        });
        this.input.keyboard.on('keydown-Z', () => {
            if (this.settingsOpen) {
                this.settingsUI.adjustSetting(0);
            } else {
                this.confirmSelection();
            }
        });
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.settingsOpen) {
                this.closeSettings();
            }
        });
        this.input.keyboard.on('keydown-R', () => {
            if (this.settingsOpen) this.settingsUI.resetDefaults();
        });
    }

    // ─── Menu Logic ─────────────────────────────────────────────────

    private moveSelection(direction: number): void {
        this.selectedIndex = (this.selectedIndex + direction + this.menuItems.length) % this.menuItems.length;
        this.updateMenuVisuals();
    }

    private selectItem(index: number): void {
        this.selectedIndex = index;
        this.updateMenuVisuals();
    }

    private updateMenuVisuals(): void {
        const startY = 390;
        const spacing = 55;

        this.menuItems.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.setColor(COLOR_STRINGS.GOLD);
                item.setScale(1.05);
            } else {
                item.setColor('#cccccc');
                item.setScale(1.0);
            }
        });

        // Move selector
        if (this.menuSelector) {
            this.tweens.add({
                targets: this.menuSelector,
                y: startY + this.selectedIndex * spacing,
                duration: 150,
                ease: 'Power2',
            });
        }
    }

    private confirmSelection(): void {
        switch (this.selectedIndex) {
            case 0:
                this.startNewGame();
                break;
            case 1:
                this.continueGame();
                break;
            case 2:
                this.openSettings();
                break;
        }
    }

    private async startNewGame(): Promise<void> {
        Logger.info('MainMenuScene', 'Starting new game');
        this.gameState.reset();
        await this.transitionTo(SCENES.GAME, { worldScene: SCENES.HUB });
    }

    private async continueGame(): Promise<void> {
        if (SaveSystem.load(0)) {
            Logger.info('MainMenuScene', 'Loaded auto-save');
            const area = this.gameState.getCurrentArea();
            const sceneKey = this.getSceneKeyForArea(area);
            await this.transitionTo(SCENES.GAME, { worldScene: sceneKey });
        } else if (SaveSystem.load(1)) {
            Logger.info('MainMenuScene', 'Loaded save slot 1');
            const area = this.gameState.getCurrentArea();
            const sceneKey = this.getSceneKeyForArea(area);
            await this.transitionTo(SCENES.GAME, { worldScene: sceneKey });
        } else {
            this.showNotification('저장 데이터가 없습니다.');
        }
    }

    private openSettings(): void {
        this.settingsOpen = true;
        this.settingsUI.show();
    }

    private closeSettings(): void {
        this.settingsOpen = false;
        this.settingsUI.hide();
    }

    private getSceneKeyForArea(area: string): string {
        const areaToScene: Record<string, string> = {
            hub: SCENES.HUB,
            songak: SCENES.SONGAK,
            wansanju: SCENES.WANSANJU,
            geumseong: SCENES.GEUMSEONG,
            cheolwon: SCENES.CHEOLWON,
            paegang: SCENES.PAEGANG,
            sangju: SCENES.SANGJU,
        };
        return areaToScene[area] || SCENES.HUB;
    }
}
