import { Logger } from '../utils/Logger';

/** Game settings interface */
interface IGameSettings {
    /** Master volume 0-1 */
    masterVolume: number;
    /** BGM volume 0-1 */
    bgmVolume: number;
    /** SFX volume 0-1 */
    sfxVolume: number;
    /** Screen shake enabled */
    screenShake: boolean;
    /** Show damage numbers */
    showDamageNumbers: boolean;
    /** Show FPS counter */
    showFPS: boolean;
    /** Weather effects enabled */
    weatherEffects: boolean;
    /** Particle density 0-1 */
    particleDensity: number;
    /** Fullscreen mode */
    fullscreen: boolean;
    /** Language */
    language: 'ko' | 'en';
}

/** Default settings */
const DEFAULT_SETTINGS: IGameSettings = {
    masterVolume: 0.7,
    bgmVolume: 0.6,
    sfxVolume: 0.8,
    screenShake: true,
    showDamageNumbers: true,
    showFPS: false,
    weatherEffects: true,
    particleDensity: 1.0,
    fullscreen: false,
    language: 'ko',
};

const STORAGE_KEY = 'samhanjimong_settings';

/**
 * Singleton system for managing and persisting game settings.
 */
export class SettingsSystem {
    private static instance: SettingsSystem;
    private settings: IGameSettings;

    private constructor() {
        this.settings = this.load();
        Logger.info('SettingsSystem', 'Settings loaded');
    }

    /** Get the singleton instance */
    public static getInstance(): SettingsSystem {
        if (!SettingsSystem.instance) {
            SettingsSystem.instance = new SettingsSystem();
        }
        return SettingsSystem.instance;
    }

    /** Load settings from localStorage */
    private load(): IGameSettings {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Partial<IGameSettings>;
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (e) {
            Logger.warn('SettingsSystem', 'Failed to load settings, using defaults');
        }
        return { ...DEFAULT_SETTINGS };
    }

    /** Save settings to localStorage */
    public save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
            Logger.debug('SettingsSystem', 'Settings saved');
        } catch (e) {
            Logger.warn('SettingsSystem', 'Failed to save settings');
        }
    }

    /** Reset to defaults */
    public reset(): void {
        this.settings = { ...DEFAULT_SETTINGS };
        this.save();
    }

    // ─── Getters / Setters ──────────────────────────────────────────

    public get<K extends keyof IGameSettings>(key: K): IGameSettings[K] {
        return this.settings[key];
    }

    public set<K extends keyof IGameSettings>(key: K, value: IGameSettings[K]): void {
        this.settings[key] = value;
        this.save();
    }

    public getAll(): Readonly<IGameSettings> {
        return { ...this.settings };
    }

    /** Get effective master * channel volume */
    public getEffectiveBGMVolume(): number {
        return this.settings.masterVolume * this.settings.bgmVolume;
    }

    /** Get effective master * SFX volume */
    public getEffectiveSFXVolume(): number {
        return this.settings.masterVolume * this.settings.sfxVolume;
    }
}
