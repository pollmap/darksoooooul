import Phaser from 'phaser';
import { Logger } from '../utils/Logger';

/** Volume settings */
interface IVolumeSettings {
    master: number;
    bgm: number;
    sfx: number;
}

/**
 * Singleton audio system managing background music and sound effects.
 * Provides separate volume controls for BGM and SFX, crossfade
 * transitions between BGM tracks, mute functionality, and
 * centralized playback management through the Phaser sound manager.
 */
export class AudioSystem {
    private static instance: AudioSystem;

    private scene: Phaser.Scene | null = null;

    /** Currently playing BGM key */
    private currentBgmKey: string | null = null;

    /** Reference to the current BGM sound object */
    private currentBgm: Phaser.Sound.BaseSound | null = null;

    /** BGM that is being faded out during a crossfade */
    private fadingOutBgm: Phaser.Sound.BaseSound | null = null;

    /** Volume settings (0.0 to 1.0) */
    private volume: IVolumeSettings = {
        master: 1.0,
        bgm: 0.7,
        sfx: 0.8,
    };

    /** Mute states */
    private muted: boolean = false;
    private bgmMuted: boolean = false;
    private sfxMuted: boolean = false;

    /** Crossfade duration in milliseconds */
    private readonly CROSSFADE_DURATION = 1000;

    private constructor() {}

    /** Get the singleton instance. */
    public static getInstance(): AudioSystem {
        if (!AudioSystem.instance) {
            AudioSystem.instance = new AudioSystem();
        }
        return AudioSystem.instance;
    }

    /**
     * Initialize the audio system with a Phaser scene.
     * Must be called before any playback methods.
     * @param scene The active Phaser scene with a sound manager
     */
    public init(scene: Phaser.Scene): void {
        this.scene = scene;
        Logger.info('AudioSystem', 'Audio system initialized');
    }

    /**
     * Update the scene reference (call when transitioning between scenes).
     * @param scene The new active scene
     */
    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
    }

    // ─── BGM Management ────────────────────────────────────────────────

    /**
     * Play a background music track. If the same track is already playing,
     * this is a no-op. If a different track is playing, it will be stopped
     * before the new one starts.
     * @param key The audio asset key for the BGM
     * @param loop Whether to loop the BGM (default: true)
     */
    public playBgm(key: string, loop: boolean = true): void {
        if (!this.scene) return;

        // Already playing this track
        if (this.currentBgmKey === key && this.currentBgm) return;

        // Stop current BGM
        this.stopBgm();

        try {
            const effectiveVolume = this.getEffectiveBgmVolume();
            this.currentBgm = this.scene.sound.add(key, {
                volume: effectiveVolume,
                loop,
            });
            this.currentBgm.play();
            this.currentBgmKey = key;

            Logger.debug('AudioSystem', `BGM playing: ${key}`);
        } catch (err) {
            Logger.error('AudioSystem', `Failed to play BGM: ${key}`, err);
        }
    }

    /**
     * Stop the currently playing background music.
     */
    public stopBgm(): void {
        if (this.currentBgm) {
            this.currentBgm.stop();
            this.currentBgm.destroy();
            this.currentBgm = null;
            this.currentBgmKey = null;
            Logger.debug('AudioSystem', 'BGM stopped');
        }
    }

    /**
     * Crossfade from the current BGM to a new track.
     * The old track fades out while the new track fades in over
     * the configured crossfade duration.
     * @param newKey The audio asset key for the new BGM
     * @param duration Crossfade duration in ms (default: CROSSFADE_DURATION)
     * @param loop Whether to loop the new BGM (default: true)
     */
    public crossfadeBgm(
        newKey: string,
        duration: number = this.CROSSFADE_DURATION,
        loop: boolean = true,
    ): void {
        if (!this.scene) return;

        // Already playing this track
        if (this.currentBgmKey === newKey && this.currentBgm) return;

        const effectiveVolume = this.getEffectiveBgmVolume();

        // Clean up any previous fading-out BGM
        if (this.fadingOutBgm) {
            this.fadingOutBgm.stop();
            this.fadingOutBgm.destroy();
            this.fadingOutBgm = null;
        }

        // Move current BGM to fading-out slot
        if (this.currentBgm) {
            this.fadingOutBgm = this.currentBgm;

            // Fade out the old BGM
            if (this.scene.tweens && this.fadingOutBgm instanceof Phaser.Sound.WebAudioSound) {
                this.scene.tweens.add({
                    targets: this.fadingOutBgm,
                    volume: 0,
                    duration,
                    ease: 'Linear',
                    onComplete: () => {
                        if (this.fadingOutBgm) {
                            this.fadingOutBgm.stop();
                            this.fadingOutBgm.destroy();
                            this.fadingOutBgm = null;
                        }
                    },
                });
            } else {
                // Fallback: just stop immediately
                this.fadingOutBgm.stop();
                this.fadingOutBgm.destroy();
                this.fadingOutBgm = null;
            }
        }

        // Start the new BGM at volume 0 and fade in
        try {
            this.currentBgm = this.scene.sound.add(newKey, {
                volume: 0,
                loop,
            });
            this.currentBgm.play();
            this.currentBgmKey = newKey;

            if (this.scene.tweens && this.currentBgm instanceof Phaser.Sound.WebAudioSound) {
                this.scene.tweens.add({
                    targets: this.currentBgm,
                    volume: effectiveVolume,
                    duration,
                    ease: 'Linear',
                });
            }

            Logger.debug('AudioSystem', `BGM crossfading to: ${newKey}`);
        } catch (err) {
            Logger.error('AudioSystem', `Failed to crossfade BGM to: ${newKey}`, err);
        }
    }

    /**
     * Pause the current BGM.
     */
    public pauseBgm(): void {
        if (this.currentBgm && this.currentBgm.isPlaying) {
            this.currentBgm.pause();
        }
    }

    /**
     * Resume the paused BGM.
     */
    public resumeBgm(): void {
        if (this.currentBgm && this.currentBgm.isPaused) {
            this.currentBgm.resume();
        }
    }

    /**
     * Get the key of the currently playing BGM, if any.
     */
    public getCurrentBgmKey(): string | null {
        return this.currentBgmKey;
    }

    // ─── SFX Playback ──────────────────────────────────────────────────

    /**
     * Play a sound effect.
     * @param key The audio asset key for the SFX
     * @param volumeScale Optional volume multiplier relative to SFX volume (0-1)
     * @returns The sound instance, or null if playback failed
     */
    public playSfx(key: string, volumeScale: number = 1.0): Phaser.Sound.BaseSound | null {
        if (!this.scene) return null;
        if (this.muted || this.sfxMuted) return null;

        try {
            const effectiveVolume = this.getEffectiveSfxVolume() * volumeScale;
            const sfx = this.scene.sound.add(key, {
                volume: effectiveVolume,
            });
            sfx.play();

            // Auto-destroy when finished
            sfx.once('complete', () => {
                sfx.destroy();
            });

            return sfx;
        } catch (err) {
            Logger.error('AudioSystem', `Failed to play SFX: ${key}`, err);
            return null;
        }
    }

    /**
     * Play a sound effect with spatial positioning (volume based on distance).
     * @param key The audio asset key
     * @param listenerX Listener (camera/player) x position
     * @param listenerY Listener y position
     * @param sourceX Sound source x position
     * @param sourceY Sound source y position
     * @param maxDistance Maximum audible distance in pixels
     */
    public playSfxPositional(
        key: string,
        listenerX: number,
        listenerY: number,
        sourceX: number,
        sourceY: number,
        maxDistance: number = 600,
    ): void {
        const dx = sourceX - listenerX;
        const dy = sourceY - listenerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= maxDistance) return;

        const volumeScale = 1.0 - distance / maxDistance;
        this.playSfx(key, volumeScale);
    }

    // ─── Volume Control ────────────────────────────────────────────────

    /**
     * Set the master volume.
     * @param value Volume from 0.0 to 1.0
     */
    public setMasterVolume(value: number): void {
        this.volume.master = Phaser.Math.Clamp(value, 0, 1);
        this.updateBgmVolume();
        Logger.debug('AudioSystem', `Master volume: ${this.volume.master}`);
    }

    /**
     * Set the BGM volume.
     * @param value Volume from 0.0 to 1.0
     */
    public setBgmVolume(value: number): void {
        this.volume.bgm = Phaser.Math.Clamp(value, 0, 1);
        this.updateBgmVolume();
        Logger.debug('AudioSystem', `BGM volume: ${this.volume.bgm}`);
    }

    /**
     * Set the SFX volume.
     * @param value Volume from 0.0 to 1.0
     */
    public setSfxVolume(value: number): void {
        this.volume.sfx = Phaser.Math.Clamp(value, 0, 1);
        Logger.debug('AudioSystem', `SFX volume: ${this.volume.sfx}`);
    }

    /**
     * Get the current volume settings.
     */
    public getVolumeSettings(): Readonly<IVolumeSettings> {
        return { ...this.volume };
    }

    /** Calculate the effective BGM volume (master * bgm, respecting mute). */
    private getEffectiveBgmVolume(): number {
        if (this.muted || this.bgmMuted) return 0;
        return this.volume.master * this.volume.bgm;
    }

    /** Calculate the effective SFX volume (master * sfx, respecting mute). */
    private getEffectiveSfxVolume(): number {
        if (this.muted || this.sfxMuted) return 0;
        return this.volume.master * this.volume.sfx;
    }

    /** Apply the current effective BGM volume to the playing track. */
    private updateBgmVolume(): void {
        if (this.currentBgm && this.currentBgm instanceof Phaser.Sound.WebAudioSound) {
            this.currentBgm.setVolume(this.getEffectiveBgmVolume());
        }
    }

    // ─── Mute Control ──────────────────────────────────────────────────

    /**
     * Toggle global mute on/off.
     * @returns The new mute state
     */
    public toggleMute(): boolean {
        this.muted = !this.muted;
        this.updateBgmVolume();

        if (this.scene) {
            this.scene.sound.mute = this.muted;
        }

        Logger.info('AudioSystem', `Mute: ${this.muted}`);
        return this.muted;
    }

    /**
     * Set global mute state.
     * @param muted True to mute, false to unmute
     */
    public setMuted(muted: boolean): void {
        this.muted = muted;
        this.updateBgmVolume();

        if (this.scene) {
            this.scene.sound.mute = this.muted;
        }
    }

    /**
     * Toggle BGM mute independently.
     * @returns The new BGM mute state
     */
    public toggleBgmMute(): boolean {
        this.bgmMuted = !this.bgmMuted;
        this.updateBgmVolume();
        Logger.info('AudioSystem', `BGM mute: ${this.bgmMuted}`);
        return this.bgmMuted;
    }

    /**
     * Toggle SFX mute independently.
     * @returns The new SFX mute state
     */
    public toggleSfxMute(): boolean {
        this.sfxMuted = !this.sfxMuted;
        Logger.info('AudioSystem', `SFX mute: ${this.sfxMuted}`);
        return this.sfxMuted;
    }

    /**
     * Check if audio is currently muted.
     */
    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Check if BGM is currently muted.
     */
    public isBgmMuted(): boolean {
        return this.bgmMuted;
    }

    /**
     * Check if SFX is currently muted.
     */
    public isSfxMuted(): boolean {
        return this.sfxMuted;
    }

    // ─── Cleanup ───────────────────────────────────────────────────────

    /**
     * Stop all audio and clean up references.
     * Does not destroy the singleton -- call when leaving a scene.
     */
    public cleanup(): void {
        this.stopBgm();

        if (this.fadingOutBgm) {
            this.fadingOutBgm.stop();
            this.fadingOutBgm.destroy();
            this.fadingOutBgm = null;
        }

        this.scene = null;
        Logger.info('AudioSystem', 'Audio system cleaned up');
    }
}
