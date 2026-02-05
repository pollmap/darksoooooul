import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH, COLOR_STRINGS } from '../utils/Constants';
import { SettingsSystem } from '../systems/SettingsSystem';
import { Logger } from '../utils/Logger';

/** Settings menu entry */
interface ISettingsEntry {
    key: string;
    label: string;
    type: 'slider' | 'toggle';
    settingKey: string;
    min?: number;
    max?: number;
    step?: number;
}

const SETTINGS_ENTRIES: ISettingsEntry[] = [
    { key: 'master_vol', label: '마스터 볼륨', type: 'slider', settingKey: 'masterVolume', min: 0, max: 1, step: 0.1 },
    { key: 'bgm_vol', label: 'BGM 볼륨', type: 'slider', settingKey: 'bgmVolume', min: 0, max: 1, step: 0.1 },
    { key: 'sfx_vol', label: '효과음 볼륨', type: 'slider', settingKey: 'sfxVolume', min: 0, max: 1, step: 0.1 },
    { key: 'screen_shake', label: '화면 흔들림', type: 'toggle', settingKey: 'screenShake' },
    { key: 'damage_num', label: '데미지 표시', type: 'toggle', settingKey: 'showDamageNumbers' },
    { key: 'weather', label: '날씨 효과', type: 'toggle', settingKey: 'weatherEffects' },
    { key: 'particles', label: '파티클 밀도', type: 'slider', settingKey: 'particleDensity', min: 0, max: 1, step: 0.25 },
    { key: 'fps', label: 'FPS 표시', type: 'toggle', settingKey: 'showFPS' },
];

/**
 * Settings UI panel for adjusting game options.
 */
export class SettingsUI extends Phaser.GameObjects.Container {
    private settingsSystem: SettingsSystem;
    private panelContainer: Phaser.GameObjects.Container;
    private entries: Phaser.GameObjects.Container[] = [];
    private selectedIndex: number = 0;
    private isVisible: boolean = false;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.settingsSystem = SettingsSystem.getInstance();
        this.panelContainer = scene.add.container(0, 0);
        this.add(this.panelContainer);

        this.createPanel();
        this.setVisible(false);
        this.setScrollFactor(0);
        this.setDepth(DEPTH.UI + 35);
    }

    /** Create the settings panel */
    private createPanel(): void {
        const panelW = 600;
        const panelH = 500;
        const px = GAME_WIDTH / 2;
        const py = GAME_HEIGHT / 2;

        // Background
        const bg = this.scene.add.rectangle(px, py, panelW, panelH, 0x111122, 0.95);
        bg.setStrokeStyle(2, 0x445566);
        this.panelContainer.add(bg);

        // Title
        const title = this.scene.add.text(px, py - panelH / 2 + 30, '설정', {
            fontSize: '28px',
            color: COLOR_STRINGS.GOLD,
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Close hint
        const hint = this.scene.add.text(px, py + panelH / 2 - 25, 'ESC: 닫기  |  ←→: 조절  |  ↑↓: 선택  |  R: 초기화', {
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(0.5);
        this.panelContainer.add(hint);
    }

    /** Refresh all settings entries */
    private refreshEntries(): void {
        this.entries.forEach(e => e.destroy());
        this.entries = [];

        const startX = GAME_WIDTH / 2 - 250;
        const startY = GAME_HEIGHT / 2 - 500 / 2 + 75;

        SETTINGS_ENTRIES.forEach((entry, i) => {
            const container = this.scene.add.container(startX, startY + i * 48);
            const isSelected = i === this.selectedIndex;

            // Row background
            const rowBg = this.scene.add.rectangle(250, 0, 500, 40, isSelected ? 0x333366 : 0x1a1a33, 0.8);
            rowBg.setStrokeStyle(isSelected ? 1 : 0, 0x445588);
            container.add(rowBg);

            // Label
            const label = this.scene.add.text(20, 0, entry.label, {
                fontSize: '16px',
                color: isSelected ? '#ffffff' : '#aaaaaa',
            }).setOrigin(0, 0.5);
            container.add(label);

            if (entry.type === 'slider') {
                const value = this.settingsSystem.get(entry.settingKey as keyof ReturnType<SettingsSystem['getAll']>) as number;
                const min = entry.min ?? 0;
                const max = entry.max ?? 1;
                const pct = (value - min) / (max - min);

                // Slider track
                const trackX = 300;
                const trackW = 150;
                const track = this.scene.add.rectangle(trackX + trackW / 2, 0, trackW, 6, 0x333355);
                container.add(track);

                // Slider fill
                const fill = this.scene.add.rectangle(
                    trackX, 0, trackW * pct, 6, 0x4488ff
                ).setOrigin(0, 0.5);
                container.add(fill);

                // Slider handle
                const handle = this.scene.add.circle(
                    trackX + trackW * pct, 0, 8,
                    isSelected ? 0xffd700 : 0x88aacc
                );
                container.add(handle);

                // Value text
                const valueText = this.scene.add.text(trackX + trackW + 20, 0, `${Math.round(value * 100)}%`, {
                    fontSize: '14px',
                    color: '#88ccff',
                }).setOrigin(0, 0.5);
                container.add(valueText);

            } else if (entry.type === 'toggle') {
                const value = this.settingsSystem.get(entry.settingKey as keyof ReturnType<SettingsSystem['getAll']>) as boolean;

                // Toggle background
                const toggleX = 400;
                const toggleBg = this.scene.add.rectangle(toggleX, 0, 50, 24, value ? 0x225533 : 0x332233, 0.8);
                toggleBg.setStrokeStyle(1, value ? 0x44ff88 : 0x884444);
                container.add(toggleBg);

                // Toggle knob
                const knobX = value ? toggleX + 14 : toggleX - 14;
                const knob = this.scene.add.circle(knobX, 0, 10, value ? 0x44ff88 : 0xff4444);
                container.add(knob);

                // Value text
                const valueText = this.scene.add.text(toggleX + 40, 0, value ? 'ON' : 'OFF', {
                    fontSize: '14px',
                    color: value ? '#44ff88' : '#ff4444',
                }).setOrigin(0, 0.5);
                container.add(valueText);
            }

            rowBg.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.selectedIndex = i;
                    this.adjustSetting(0); // Toggle on click
                    this.refreshEntries();
                });

            this.entries.push(container);
            this.panelContainer.add(container);
        });
    }

    /** Adjust the selected setting */
    public adjustSetting(direction: number): void {
        const entry = SETTINGS_ENTRIES[this.selectedIndex];
        if (!entry) return;

        const key = entry.settingKey as keyof ReturnType<SettingsSystem['getAll']>;

        if (entry.type === 'toggle') {
            const current = this.settingsSystem.get(key) as boolean;
            this.settingsSystem.set(key, !current as never);
        } else if (entry.type === 'slider') {
            const current = this.settingsSystem.get(key) as number;
            const step = entry.step ?? 0.1;
            const min = entry.min ?? 0;
            const max = entry.max ?? 1;
            const newValue = Phaser.Math.Clamp(current + direction * step, min, max);
            this.settingsSystem.set(key, newValue as never);
        }

        this.refreshEntries();
    }

    /** Move selection up/down */
    public moveSelection(direction: number): void {
        this.selectedIndex = (this.selectedIndex + direction + SETTINGS_ENTRIES.length) % SETTINGS_ENTRIES.length;
        this.refreshEntries();
    }

    /** Reset all settings to default */
    public resetDefaults(): void {
        this.settingsSystem.reset();
        this.refreshEntries();
        Logger.info('SettingsUI', 'Settings reset to defaults');
    }

    /** Show the settings panel */
    public show(): void {
        this.isVisible = true;
        this.setVisible(true);
        this.panelContainer.setAlpha(0);
        this.scene.tweens.add({
            targets: this.panelContainer,
            alpha: 1,
            duration: 200,
        });
        this.refreshEntries();
    }

    /** Hide the settings panel */
    public hide(): void {
        this.isVisible = false;
        this.scene.tweens.add({
            targets: this.panelContainer,
            alpha: 0,
            duration: 150,
            onComplete: () => this.setVisible(false),
        });
    }

    /** Whether the panel is currently visible */
    public getIsVisible(): boolean {
        return this.isVisible;
    }
}
