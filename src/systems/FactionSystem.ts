import Phaser from 'phaser';
import {
    IFaction,
    IFactionEffects,
    TFactionRelation,
} from '../types/quest.types';
import { Logger } from '../utils/Logger';
import { FACTIONS, REPUTATION } from '../utils/Constants';
import { GameState } from '../state/GameState';

/** Raw faction JSON structure */
interface IRawFactionJSON {
    factions: Record<string, IFaction>;
    reputationThresholds: Record<string, number>;
    reputationEffects: Record<string, IFactionEffects>;
}

/**
 * Faction system managing reputation for the three main factions
 * (Taebong, Goryeo, Hubaekje). Provides relation level calculation
 * based on configurable thresholds, shop discount rates, area access
 * levels, and emits events when reputation changes.
 *
 * Faction reputation affects NPC behavior, shop prices, area
 * accessibility, and story branching throughout the game.
 */
export class FactionSystem {
    private scene: Phaser.Scene;
    private gameState: GameState;

    /** Faction static data */
    private factions: Map<string, IFaction> = new Map();

    /** Reputation effect definitions per relation level */
    private reputationEffects: Map<string, IFactionEffects> = new Map();

    /** Configurable thresholds (loaded from JSON or use defaults) */
    private thresholds: Record<string, number> = {
        hostile: REPUTATION.HOSTILE,
        unfriendly: REPUTATION.UNFRIENDLY,
        neutral: REPUTATION.NEUTRAL,
        friendly: REPUTATION.FRIENDLY,
        allied: REPUTATION.ALLIED,
        devoted: REPUTATION.DEVOTED,
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.gameState = GameState.getInstance();
        Logger.info('FactionSystem', 'Faction system initialized');
    }

    // ─── Data Loading ──────────────────────────────────────────────────

    /**
     * Load faction data from the parsed factions JSON.
     * @param json The raw factions JSON
     */
    public loadFactions(json: IRawFactionJSON): void {
        // Load faction definitions
        if (json.factions) {
            for (const [id, data] of Object.entries(json.factions)) {
                this.factions.set(id, data);
            }
            Logger.info('FactionSystem', `Loaded ${this.factions.size} factions`);
        }

        // Load thresholds
        if (json.reputationThresholds) {
            this.thresholds = { ...json.reputationThresholds };
        }

        // Load reputation effects
        if (json.reputationEffects) {
            for (const [level, effects] of Object.entries(json.reputationEffects)) {
                this.reputationEffects.set(level, effects);
            }
        }
    }

    // ─── Reputation Management ─────────────────────────────────────────

    /**
     * Get the current reputation value for a faction.
     * @param factionId The faction identifier
     * @returns Numeric reputation value
     */
    public getReputation(factionId: string): number {
        return this.gameState.getFactionReputation(factionId);
    }

    /**
     * Add reputation to a faction. Clamps to [-100, 100].
     * Emits 'faction:repChanged' with the old and new values.
     * @param factionId The faction identifier
     * @param amount The amount to add (can be negative)
     */
    public addReputation(factionId: string, amount: number): void {
        const oldValue = this.getReputation(factionId);
        const oldRelation = this.getRelation(factionId);

        // Clamp to range
        const newValue = Math.max(-100, Math.min(100, oldValue + amount));
        this.gameState.setFactionReputation(factionId, newValue);

        const newRelation = this.getRelation(factionId);

        // Emit change event
        this.scene.events.emit('faction:repChanged', {
            factionId,
            oldValue,
            newValue,
            change: amount,
            oldRelation,
            newRelation,
        });

        // Emit special event if relation level changed
        if (oldRelation !== newRelation) {
            this.scene.events.emit('faction:relationChanged', {
                factionId,
                oldRelation,
                newRelation,
                factionName: this.getFactionName(factionId),
            });

            Logger.info(
                'FactionSystem',
                `Faction ${factionId} relation changed: ${oldRelation} -> ${newRelation}`,
            );
        }

        // Apply cross-faction effects: helping one faction may upset rivals
        this.applyCrossFactionEffects(factionId, amount);
    }

    /**
     * Set a faction's reputation to an exact value.
     * @param factionId The faction identifier
     * @param value The new reputation value
     */
    public setReputation(factionId: string, value: number): void {
        const clamped = Math.max(-100, Math.min(100, value));
        const oldValue = this.getReputation(factionId);
        this.gameState.setFactionReputation(factionId, clamped);

        this.scene.events.emit('faction:repChanged', {
            factionId,
            oldValue,
            newValue: clamped,
            change: clamped - oldValue,
            oldRelation: this.getRelationFromValue(oldValue),
            newRelation: this.getRelation(factionId),
        });
    }

    // ─── Relation Level ────────────────────────────────────────────────

    /**
     * Get the relation level for a faction based on current reputation.
     * @param factionId The faction identifier
     * @returns The relation level string
     */
    public getRelation(factionId: string): TFactionRelation {
        const rep = this.getReputation(factionId);
        return this.getRelationFromValue(rep);
    }

    /**
     * Calculate the relation level from a raw reputation value.
     */
    private getRelationFromValue(rep: number): TFactionRelation {
        if (rep >= this.thresholds.devoted) return 'devoted';
        if (rep >= this.thresholds.allied) return 'allied';
        if (rep >= this.thresholds.friendly) return 'friendly';
        if (rep >= this.thresholds.neutral) return 'neutral';
        if (rep >= this.thresholds.unfriendly) return 'unfriendly';
        return 'hostile';
    }

    // ─── Effects Query ─────────────────────────────────────────────────

    /**
     * Get the effects for the current relation with a faction.
     * @param factionId The faction identifier
     * @returns The effects object, or a neutral default
     */
    public getEffects(factionId: string): IFactionEffects {
        const relation = this.getRelation(factionId);
        return (
            this.reputationEffects.get(relation) ?? {
                shopDiscount: 0,
                npcReaction: 'normal',
                areaAccess: 'public',
            }
        );
    }

    /**
     * Get the shop discount percentage for a faction.
     * Positive means cheaper, negative means markup.
     * @param factionId The faction identifier
     * @returns Discount as a fraction (e.g., 0.1 for 10% off)
     */
    public getShopDiscount(factionId: string): number {
        return this.getEffects(factionId).shopDiscount;
    }

    /**
     * Get the area access level for a faction.
     * @param factionId The faction identifier
     * @returns Access level string
     */
    public getAreaAccess(factionId: string): string {
        return this.getEffects(factionId).areaAccess;
    }

    /**
     * Check if the player can access a faction-controlled area.
     * @param factionId The controlling faction
     * @param requiredAccess The minimum access level needed
     * @returns True if access is granted
     */
    public canAccessArea(factionId: string, requiredAccess: string): boolean {
        const accessLevels = ['restricted', 'limited', 'public', 'extended', 'full'];
        const currentAccess = this.getAreaAccess(factionId);
        const currentIndex = accessLevels.indexOf(currentAccess);
        const requiredIndex = accessLevels.indexOf(requiredAccess);

        if (currentIndex === -1 || requiredIndex === -1) return false;
        return currentIndex >= requiredIndex;
    }

    /**
     * Check if bounty hunters are active for a faction (hostile relation).
     * @param factionId The faction identifier
     */
    public areBountyHuntersActive(factionId: string): boolean {
        return this.getEffects(factionId).bountyHunters === true;
    }

    /**
     * Check if special quests are available for a faction.
     * @param factionId The faction identifier
     */
    public areSpecialQuestsAvailable(factionId: string): boolean {
        return this.getEffects(factionId).specialQuests === true;
    }

    /**
     * Check if a faction ending is unlockable.
     * @param factionId The faction identifier
     */
    public isEndingUnlocked(factionId: string): boolean {
        return this.getEffects(factionId).endingUnlock === true;
    }

    // ─── Cross-faction Effects ─────────────────────────────────────────

    /**
     * When reputation changes with one faction, rival factions
     * may be affected based on their mutual relations.
     */
    private applyCrossFactionEffects(factionId: string, amount: number): void {
        const faction = this.factions.get(factionId);
        if (!faction || !faction.relations) return;

        // Cross-faction spillover is a fraction of the primary change
        const spilloverFactor = 0.15;

        for (const [rivalId, relationScore] of Object.entries(faction.relations)) {
            // Skip if the rival is one of the main playable factions only
            if (!this.gameState.getFactionReputation(rivalId) && rivalId !== FACTIONS.TAEBONG
                && rivalId !== FACTIONS.GORYEO && rivalId !== FACTIONS.HUBAEKJE) {
                continue;
            }

            // If factions are enemies (negative relation), gaining rep with one
            // slightly decreases rep with the other
            if (relationScore < 0 && amount > 0) {
                const spillover = Math.floor(amount * spilloverFactor * (Math.abs(relationScore) / 50));
                if (spillover > 0) {
                    const oldRival = this.getReputation(rivalId);
                    const newRival = Math.max(-100, oldRival - spillover);
                    this.gameState.setFactionReputation(rivalId, newRival);

                    Logger.debug(
                        'FactionSystem',
                        `Cross-faction: ${rivalId} reputation -${spillover} (spillover from ${factionId})`,
                    );
                }
            }
        }
    }

    // ─── Faction Data Query ────────────────────────────────────────────

    /**
     * Get the display name for a faction.
     * @param factionId The faction identifier
     * @returns The localized faction name
     */
    public getFactionName(factionId: string): string {
        const faction = this.factions.get(factionId);
        return faction?.name ?? factionId;
    }

    /**
     * Get the full faction data.
     * @param factionId The faction identifier
     */
    public getFaction(factionId: string): IFaction | undefined {
        return this.factions.get(factionId);
    }

    /**
     * Get all faction IDs.
     */
    public getAllFactionIds(): string[] {
        return Array.from(this.factions.keys());
    }

    /**
     * Get a summary of all faction reputations for display.
     * @returns Array of faction status objects
     */
    public getReputationSummary(): {
        factionId: string;
        name: string;
        reputation: number;
        relation: TFactionRelation;
    }[] {
        return this.getAllFactionIds().map((id) => ({
            factionId: id,
            name: this.getFactionName(id),
            reputation: this.getReputation(id),
            relation: this.getRelation(id),
        }));
    }

    // ─── Cleanup ───────────────────────────────────────────────────────

    /**
     * Clean up faction system state.
     */
    public destroy(): void {
        this.factions.clear();
        this.reputationEffects.clear();
        Logger.info('FactionSystem', 'Faction system destroyed');
    }
}
