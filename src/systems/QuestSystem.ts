import Phaser from 'phaser';
import {
    IQuest,
    IQuestObjective,
    IQuestRewards,
    TQuestStatus,
    TQuestObjectiveType,
} from '../types/quest.types';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';

/** Raw quest data as it comes from JSON (without runtime fields) */
interface IRawQuestData {
    id: string;
    title: string;
    description: string;
    chapter?: number;
    faction?: string;
    type?: 'mandatory' | 'optional';
    prerequisites: string[];
    objectives: {
        id: string;
        type: TQuestObjectiveType;
        target: string | string[];
        count?: number;
        description: string;
    }[];
    choices?: { text: string; effects: { type: string; value?: string; amount?: number; faction?: string }[]; next: string }[];
    rewards: IQuestRewards;
    dialogueOnComplete?: string;
}

/** JSON structure: { main: {...}, faction: {...}, side: {...} } */
interface IRawQuestJSON {
    main?: Record<string, IRawQuestData>;
    faction?: Record<string, IRawQuestData>;
    side?: Record<string, IRawQuestData>;
}

/** Event payload when a quest-relevant action occurs */
export interface IQuestEvent {
    type: TQuestObjectiveType;
    target: string;
    count?: number;
}

/**
 * Quest system that loads quest definitions from JSON, tracks
 * active/completed/locked quests, checks objective progress
 * against gameplay events, grants rewards on completion, and
 * manages prerequisite-based quest unlocking.
 *
 * Listens for scene events to update objectives automatically
 * and emits events for UI notifications.
 */
export class QuestSystem {
    private scene: Phaser.Scene;
    private gameState: GameState;

    /** All quest definitions keyed by quest ID */
    private quests: Map<string, IQuest> = new Map();

    /** Runtime objective progress: questId -> objectiveId -> current count */
    private objectiveProgress: Map<string, Map<string, number>> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.gameState = GameState.getInstance();
        this.registerEventListeners();
        Logger.info('QuestSystem', 'Quest system initialized');
    }

    // ─── Data Loading ──────────────────────────────────────────────────

    /**
     * Load quest definitions from the parsed quests JSON.
     * Initializes all quests as 'locked' with runtime tracking fields.
     * @param json The raw quest JSON with main/faction/side categories
     */
    public loadQuests(json: IRawQuestJSON): void {
        let count = 0;
        const categories: (keyof IRawQuestJSON)[] = ['main', 'faction', 'side'];

        for (const category of categories) {
            const group = json[category];
            if (!group) continue;

            for (const [id, raw] of Object.entries(group)) {
                const quest = this.buildQuest(raw, id);
                this.quests.set(id, quest);
                count++;
            }
        }

        Logger.info('QuestSystem', `Loaded ${count} quests`);

        // Evaluate initial availability
        this.evaluateQuestAvailability();
    }

    /**
     * Build a runtime IQuest from raw JSON data.
     */
    private buildQuest(raw: IRawQuestData, id: string): IQuest {
        const objectives: IQuestObjective[] = raw.objectives.map((obj) => ({
            id: obj.id,
            type: obj.type,
            target: obj.target,
            count: obj.count ?? 1,
            current: 0,
            description: obj.description,
            completed: false,
        }));

        return {
            id,
            title: raw.title,
            description: raw.description ?? '',
            chapter: raw.chapter ?? 1,
            faction: raw.faction,
            type: raw.type,
            prerequisites: raw.prerequisites ?? [],
            objectives,
            choices: raw.choices as IQuest['choices'],
            rewards: raw.rewards,
            dialogueOnComplete: raw.dialogueOnComplete,
            status: 'locked',
            currentObjectiveIndex: 0,
        };
    }

    // ─── Quest Lifecycle ───────────────────────────────────────────────

    /**
     * Activate a quest if it is currently available.
     * @param questId The quest to activate
     * @returns True if the quest was successfully activated
     */
    public activateQuest(questId: string): boolean {
        const quest = this.quests.get(questId);
        if (!quest) {
            Logger.warn('QuestSystem', `Quest not found: ${questId}`);
            return false;
        }

        if (quest.status !== 'available') {
            Logger.warn('QuestSystem', `Quest ${questId} is not available (status: ${quest.status})`);
            return false;
        }

        quest.status = 'active';
        quest.currentObjectiveIndex = 0;

        // Initialize progress tracking
        const progressMap = new Map<string, number>();
        for (const obj of quest.objectives) {
            obj.current = 0;
            obj.completed = false;
            progressMap.set(obj.id, 0);
        }
        this.objectiveProgress.set(questId, progressMap);

        // Sync with GameState
        this.gameState.activateQuest(questId);

        this.scene.events.emit('quest:activated', {
            questId,
            title: quest.title,
            description: quest.description,
        });

        Logger.info('QuestSystem', `Quest activated: ${questId} (${quest.title})`);
        return true;
    }

    /**
     * Complete a quest, granting its rewards.
     * @param questId The quest to complete
     */
    public completeQuest(questId: string): void {
        const quest = this.quests.get(questId);
        if (!quest || quest.status !== 'active') return;

        quest.status = 'completed';
        this.gameState.completeQuest(questId);
        this.objectiveProgress.delete(questId);

        // Grant rewards
        this.grantRewards(quest.rewards, questId);

        this.scene.events.emit('quest:completed', {
            questId,
            title: quest.title,
            rewards: quest.rewards,
        });

        Logger.info('QuestSystem', `Quest completed: ${questId} (${quest.title})`);

        // Trigger completion dialogue if specified
        if (quest.dialogueOnComplete) {
            this.scene.events.emit('quest:triggerDialogue', {
                dialogueId: quest.dialogueOnComplete,
            });
        }

        // Re-evaluate quest availability (other quests may depend on this one)
        this.evaluateQuestAvailability();
    }

    // ─── Objective Checking ────────────────────────────────────────────

    /**
     * Process a gameplay event and update matching quest objectives.
     * @param event The event describing what happened
     */
    public onEvent(event: IQuestEvent): void {
        this.quests.forEach((quest) => {
            if (quest.status !== 'active') return;

            for (const objective of quest.objectives) {
                if (objective.completed) continue;
                if (objective.type !== event.type) continue;

                if (!this.targetMatches(objective.target, event.target)) continue;

                // Update progress
                const increment = event.count ?? 1;
                objective.current = (objective.current ?? 0) + increment;

                // Update progress map
                const progressMap = this.objectiveProgress.get(quest.id);
                if (progressMap) {
                    progressMap.set(objective.id, objective.current);
                }

                // Sync with GameState
                this.gameState.completeQuestObjective(quest.id, objective.id);

                const required = objective.count ?? 1;

                this.scene.events.emit('quest:objectiveUpdated', {
                    questId: quest.id,
                    objectiveId: objective.id,
                    current: objective.current,
                    required,
                    description: objective.description,
                });

                // Check if objective is now complete
                if (objective.current >= required) {
                    objective.completed = true;

                    this.scene.events.emit('quest:objectiveComplete', {
                        questId: quest.id,
                        objectiveId: objective.id,
                        description: objective.description,
                    });

                    Logger.info(
                        'QuestSystem',
                        `Objective completed: ${quest.id}/${objective.id} (${objective.description})`,
                    );
                }
            }

            // Check if all objectives are complete
            if (quest.objectives.every((obj) => obj.completed)) {
                this.completeQuest(quest.id);
            }
        });
    }

    /**
     * Check whether an event target matches an objective target.
     * Objectives can have a single string target or an array of valid targets.
     */
    private targetMatches(objectiveTarget: string | string[], eventTarget: string): boolean {
        if (Array.isArray(objectiveTarget)) {
            return objectiveTarget.includes(eventTarget);
        }
        return objectiveTarget === eventTarget;
    }

    // ─── Prerequisite Checking ─────────────────────────────────────────

    /**
     * Evaluate all locked quests and unlock those whose prerequisites
     * have been met.
     */
    private evaluateQuestAvailability(): void {
        this.quests.forEach((quest) => {
            if (quest.status !== 'locked') return;

            if (this.arePrerequisitesMet(quest)) {
                quest.status = 'available';

                this.scene.events.emit('quest:available', {
                    questId: quest.id,
                    title: quest.title,
                });

                Logger.info('QuestSystem', `Quest now available: ${quest.id} (${quest.title})`);
            }
        });
    }

    /**
     * Check if all prerequisites for a quest are satisfied.
     * Prerequisites are quest IDs that must be completed.
     */
    private arePrerequisitesMet(quest: IQuest): boolean {
        if (quest.prerequisites.length === 0) return true;

        return quest.prerequisites.every((prereqId) => {
            // Check if the prerequisite quest is completed
            const prereq = this.quests.get(prereqId);
            if (prereq && prereq.status === 'completed') return true;

            // Also check GameState in case the quest was completed in a previous session
            return this.gameState.isQuestCompleted(prereqId);
        });
    }

    // ─── Rewards ───────────────────────────────────────────────────────

    /**
     * Grant quest rewards to the player.
     */
    private grantRewards(rewards: IQuestRewards, questId: string): void {
        // Experience
        if (rewards.exp > 0) {
            this.gameState.addExp(rewards.exp);
            Logger.debug('QuestSystem', `Granted ${rewards.exp} EXP for quest ${questId}`);
        }

        // Gold
        if (rewards.gold > 0) {
            this.gameState.addGold(rewards.gold);
            Logger.debug('QuestSystem', `Granted ${rewards.gold} gold for quest ${questId}`);
        }

        // Items
        if (rewards.items) {
            for (const itemId of rewards.items) {
                this.gameState.addItem(itemId, 1);
                Logger.debug('QuestSystem', `Granted item '${itemId}' for quest ${questId}`);
            }
        }

        // Faction reputation
        if (rewards.factionRep) {
            for (const [faction, amount] of Object.entries(rewards.factionRep)) {
                this.gameState.addFactionReputation(faction, amount);
                Logger.debug(
                    'QuestSystem',
                    `Granted ${amount} rep with ${faction} for quest ${questId}`,
                );
            }
        }

        // Unlocks (areas, features, etc.)
        if (rewards.unlocks) {
            for (const unlock of rewards.unlocks) {
                this.gameState.unlock(unlock);
                Logger.debug('QuestSystem', `Unlocked '${unlock}' for quest ${questId}`);
            }
        }
    }

    // ─── Event Listeners ───────────────────────────────────────────────

    /**
     * Register scene event listeners for automatic objective tracking.
     */
    private registerEventListeners(): void {
        // Generic quest event
        this.scene.events.on('quest:event', (event: IQuestEvent) => {
            this.onEvent(event);
        });

        // Specific event shortcuts
        this.scene.events.on('npc:talked', (data: { npcId: string }) => {
            this.onEvent({ type: 'talk', target: data.npcId });
        });

        this.scene.events.on('combat:enemyDead', (data: { enemyId: string }) => {
            // Extract enemy type from the ID (e.g., "bandit_001" -> "bandit")
            const enemyType = data.enemyId.replace(/_\d+$/, '');
            this.onEvent({ type: 'kill', target: enemyType });
            this.onEvent({ type: 'kill', target: data.enemyId });
        });

        this.scene.events.on('item:collected', (data: { itemId: string; count?: number }) => {
            this.onEvent({ type: 'collect', target: data.itemId, count: data.count });
        });

        this.scene.events.on('area:entered', (data: { areaId: string }) => {
            this.onEvent({ type: 'travel', target: data.areaId });
        });

        this.scene.events.on('object:interacted', (data: { objectId: string }) => {
            this.onEvent({ type: 'interact', target: data.objectId });
        });

        this.scene.events.on('quest:completed', (data: { questId: string }) => {
            // Handle "complete_quest" type objectives
            this.onEvent({ type: 'complete_quest', target: data.questId });
        });

        this.scene.events.on('minigame:completed', (data: { minigameId: string }) => {
            this.onEvent({ type: 'minigame', target: data.minigameId });
        });
    }

    // ─── Query Methods ─────────────────────────────────────────────────

    /**
     * Get a quest by its ID.
     * @param questId The quest identifier
     */
    public getQuest(questId: string): IQuest | undefined {
        return this.quests.get(questId);
    }

    /**
     * Get all quests with a specific status.
     * @param status The status to filter by
     */
    public getQuestsByStatus(status: TQuestStatus): IQuest[] {
        const result: IQuest[] = [];
        this.quests.forEach((quest) => {
            if (quest.status === status) result.push(quest);
        });
        return result;
    }

    /**
     * Get all active quests.
     */
    public getActiveQuests(): IQuest[] {
        return this.getQuestsByStatus('active');
    }

    /**
     * Get all completed quests.
     */
    public getCompletedQuests(): IQuest[] {
        return this.getQuestsByStatus('completed');
    }

    /**
     * Get all available (unlocked but not yet started) quests.
     */
    public getAvailableQuests(): IQuest[] {
        return this.getQuestsByStatus('available');
    }

    /**
     * Get quests filtered by faction.
     * @param faction The faction identifier
     */
    public getQuestsByFaction(faction: string): IQuest[] {
        const result: IQuest[] = [];
        this.quests.forEach((quest) => {
            if (quest.faction === faction) result.push(quest);
        });
        return result;
    }

    /**
     * Get the current objective progress for an active quest.
     * @param questId The quest identifier
     * @returns Map of objectiveId to current count, or null if not active
     */
    public getProgress(questId: string): Map<string, number> | null {
        return this.objectiveProgress.get(questId) ?? null;
    }

    /**
     * Restore quest state from a save. Syncs status and progress
     * from GameState back into the quest system.
     */
    public restoreFromGameState(): void {
        this.quests.forEach((quest) => {
            if (this.gameState.isQuestCompleted(quest.id)) {
                quest.status = 'completed';
                quest.objectives.forEach((obj) => {
                    obj.completed = true;
                    obj.current = obj.count ?? 1;
                });
            } else if (this.gameState.isQuestActive(quest.id)) {
                quest.status = 'active';
                // Restore progress from GameState would need stored objective data
                const progressMap = new Map<string, number>();
                for (const obj of quest.objectives) {
                    progressMap.set(obj.id, obj.current ?? 0);
                }
                this.objectiveProgress.set(quest.id, progressMap);
            }
        });

        // Re-evaluate availability after restoring
        this.evaluateQuestAvailability();

        Logger.info('QuestSystem', 'Quest state restored from GameState');
    }

    // ─── Cleanup ───────────────────────────────────────────────────────

    /**
     * Clean up event listeners and internal state.
     */
    public destroy(): void {
        this.scene.events.off('quest:event');
        this.scene.events.off('npc:talked');
        this.scene.events.off('combat:enemyDead');
        this.scene.events.off('item:collected');
        this.scene.events.off('area:entered');
        this.scene.events.off('object:interacted');
        this.scene.events.off('quest:completed');
        this.scene.events.off('minigame:completed');

        this.quests.clear();
        this.objectiveProgress.clear();
        Logger.info('QuestSystem', 'Quest system destroyed');
    }
}
