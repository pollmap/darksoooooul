import { ISaveData, ISaveSlotInfo } from '../types/save.types';
import { Logger } from '../utils/Logger';
import { SAVE } from '../utils/Constants';
import { GameState } from '../state/GameState';

/**
 * Save system supporting 3 manual save slots plus auto-save.
 * Uses localStorage for persistence with JSON serialization.
 * Includes save version compatibility checking and provides
 * save slot metadata for display in the UI.
 */
export class SaveSystem {
    private static _instance: SaveSystem;
    private gameState: GameState;

    constructor() {
        this.gameState = GameState.getInstance();
        Logger.info('SaveSystem', 'Save system initialized');
    }

    private static get instance(): SaveSystem {
        if (!SaveSystem._instance) {
            SaveSystem._instance = new SaveSystem();
        }
        return SaveSystem._instance;
    }

    /** Static convenience: save to slot */
    public static save(slot: number): boolean {
        return SaveSystem.instance._save(slot);
    }

    /** Static convenience: load from slot */
    public static load(slot: number): boolean {
        return SaveSystem.instance._load(slot);
    }

    /** Static convenience: auto-save */
    public static autoSave(): boolean {
        return SaveSystem.instance._autoSave();
    }

    // ─── Save Operations ───────────────────────────────────────────────

    /**
     * Save the current game state to a specific slot.
     * @param slot Slot number (1-3) or 0 for auto-save
     * @returns True if the save was successful
     */
    private _save(slot: number): boolean {
        try {
            const key = this.getSlotKey(slot);
            const data = this.buildSaveData();
            const json = JSON.stringify(data);

            localStorage.setItem(key, json);
            Logger.info('SaveSystem', `Game saved to slot ${slot} (${(json.length / 1024).toFixed(1)} KB)`);

            return true;
        } catch (err) {
            Logger.error('SaveSystem', `Failed to save to slot ${slot}`, err);
            return false;
        }
    }

    /**
     * Auto-save the current game state.
     * @returns True if the auto-save was successful
     */
    private _autoSave(): boolean {
        try {
            const key = SAVE.KEY_PREFIX + SAVE.AUTO_SAVE_SLOT;
            const data = this.buildSaveData();
            const json = JSON.stringify(data);

            localStorage.setItem(key, json);
            Logger.debug('SaveSystem', 'Auto-save completed');

            return true;
        } catch (err) {
            Logger.error('SaveSystem', 'Auto-save failed', err);
            return false;
        }
    }

    /**
     * Load game state from a specific slot.
     * @param slot Slot number (1-3) or 0 for auto-save
     * @returns True if the load was successful
     */
    private _load(slot: number): boolean {
        try {
            const key = slot === 0
                ? SAVE.KEY_PREFIX + SAVE.AUTO_SAVE_SLOT
                : this.getSlotKey(slot);

            const json = localStorage.getItem(key);
            if (!json) {
                Logger.warn('SaveSystem', `No save data found in slot ${slot}`);
                return false;
            }

            const data: ISaveData = JSON.parse(json);

            // Version compatibility check
            if (!this.isVersionCompatible(data.version)) {
                Logger.warn(
                    'SaveSystem',
                    `Save version mismatch: save=${data.version}, current=${SAVE.CURRENT_VERSION}`,
                );
                return false;
            }

            // Apply to GameState
            this.gameState.loadFromSave(data);
            Logger.info('SaveSystem', `Game loaded from slot ${slot}`);

            return true;
        } catch (err) {
            Logger.error('SaveSystem', `Failed to load from slot ${slot}`, err);
            return false;
        }
    }

    /**
     * Delete a save from a specific slot.
     * @param slot Slot number (1-3) or 0 for auto-save
     */
    public deleteSave(slot: number): void {
        const key = slot === 0
            ? SAVE.KEY_PREFIX + SAVE.AUTO_SAVE_SLOT
            : this.getSlotKey(slot);

        localStorage.removeItem(key);
        Logger.info('SaveSystem', `Save deleted from slot ${slot}`);
    }

    // ─── Slot Information ──────────────────────────────────────────────

    /**
     * Get display information for a save slot.
     * @param slot Slot number (1-3) or 0 for auto-save
     * @returns Slot info with existence, timestamp, play time, area, and level
     */
    public getSlotInfo(slot: number): ISaveSlotInfo {
        try {
            const key = slot === 0
                ? SAVE.KEY_PREFIX + SAVE.AUTO_SAVE_SLOT
                : this.getSlotKey(slot);

            const json = localStorage.getItem(key);
            if (!json) {
                return { exists: false };
            }

            const data: ISaveData = JSON.parse(json);
            return {
                exists: true,
                timestamp: data.timestamp,
                playTime: data.playTime,
                area: data.player.currentArea,
                level: data.player.level,
            };
        } catch {
            return { exists: false };
        }
    }

    /**
     * Get display information for all save slots (1-3 + auto).
     * @returns Array of slot info objects indexed 0=auto, 1-3=manual
     */
    public getAllSlotInfo(): ISaveSlotInfo[] {
        const slots: ISaveSlotInfo[] = [];

        // Auto-save slot (index 0)
        slots.push(this.getSlotInfo(0));

        // Manual slots (1-3)
        for (let i = 1; i <= SAVE.MAX_SLOTS; i++) {
            slots.push(this.getSlotInfo(i));
        }

        return slots;
    }

    /**
     * Check whether a slot has save data.
     * @param slot Slot number
     */
    public hasSave(slot: number): boolean {
        return this.getSlotInfo(slot).exists;
    }

    // ─── Version Compatibility ─────────────────────────────────────────

    /**
     * Check if a save version is compatible with the current game version.
     * Uses semantic versioning: major version must match; minor can differ.
     * @param saveVersion The version string from the save data
     * @returns True if the save is loadable
     */
    private isVersionCompatible(saveVersion: string): boolean {
        if (!saveVersion) return false;

        const saveParts = saveVersion.split('.').map(Number);
        const currentParts = SAVE.CURRENT_VERSION.split('.').map(Number);

        // Major version must match
        if (saveParts[0] !== currentParts[0]) {
            return false;
        }

        // Minor version of save must be <= current (forward compatible)
        if (saveParts[1] > currentParts[1]) {
            return false;
        }

        return true;
    }

    // ─── Build Save Data ───────────────────────────────────────────────

    /**
     * Build a complete ISaveData object from the current GameState.
     */
    private buildSaveData(): ISaveData {
        this.gameState.updatePlayTime();

        return {
            version: SAVE.CURRENT_VERSION,
            timestamp: Date.now(),
            player: this.gameState.getPlayerSaveData(),
            quests: this.gameState.getQuestSaveData(),
            factions: this.gameState.getFactionSaveData(),
            world: this.gameState.getWorldSaveData(),
            flags: this.gameState.getFlagsSaveData(),
            playTime: this.gameState.getPlayTime(),
            personality: {
                cold: 0,
                warm: 0,
                aggressive: 0,
                diplomatic: 0,
            },
            morality: this.gameState.getMorality(),
        };
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    /**
     * Build the localStorage key for a manual save slot.
     */
    private getSlotKey(slot: number): string {
        return `${SAVE.KEY_PREFIX}slot_${slot}`;
    }

    /**
     * Format play time in milliseconds to a human-readable string.
     * @param ms Play time in milliseconds
     * @returns Formatted string like "2h 15m"
     */
    public static formatPlayTime(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    /**
     * Format a timestamp to a locale date string.
     * @param timestamp Unix timestamp in ms
     * @returns Formatted date string
     */
    public static formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * Get total storage used by all save slots in bytes.
     */
    public getStorageUsage(): number {
        let total = 0;
        for (let i = 0; i <= SAVE.MAX_SLOTS; i++) {
            const key = i === 0
                ? SAVE.KEY_PREFIX + SAVE.AUTO_SAVE_SLOT
                : this.getSlotKey(i);
            const data = localStorage.getItem(key);
            if (data) {
                total += data.length * 2; // UTF-16 chars = 2 bytes each
            }
        }
        return total;
    }
}
