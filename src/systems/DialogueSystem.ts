import Phaser from 'phaser';
import {
    IDialogueData,
    IDialogueLine,
    IDialogueChoice,
    IDialogueEffect,
} from '../types/dialogue.types';
import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';

/** State of an active dialogue session */
interface IDialogueSession {
    dialogueId: string;
    data: IDialogueData;
    currentLineIndex: number;
    currentLine: IDialogueLine;
    waitingForChoice: boolean;
}

/**
 * Dialogue system that loads dialogue trees from JSON data,
 * manages dialogue flow with sequential lines, branching choices,
 * and side-effects (faction reputation, personality traits,
 * quest objectives, items, gold, and minigame triggers).
 *
 * Emits Phaser events for the UI layer to render dialogue boxes,
 * speaker portraits, choice menus, and effect notifications.
 */
export class DialogueSystem {
    private scene: Phaser.Scene;
    private gameState: GameState;

    /** All loaded dialogue trees keyed by dialogue id */
    private dialogues: Map<string, IDialogueData> = new Map();

    /** Currently active dialogue session, or null if none */
    private session: IDialogueSession | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.gameState = GameState.getInstance();
        Logger.info('DialogueSystem', 'Dialogue system initialized');
    }

    // ─── Data Loading ──────────────────────────────────────────────────

    /**
     * Load dialogue data from a parsed JSON object.
     * The JSON should be a record of dialogue ID to IDialogueData.
     * @param json The raw dialogue JSON (Record<string, IDialogueData>)
     */
    public loadDialogues(json: Record<string, IDialogueData>): void {
        let count = 0;
        for (const [id, data] of Object.entries(json)) {
            this.dialogues.set(id, { ...data, id });
            count++;
        }
        Logger.info('DialogueSystem', `Loaded ${count} dialogue trees`);
    }

    /**
     * Add or replace a single dialogue tree at runtime.
     * @param data The dialogue data to register
     */
    public addDialogue(data: IDialogueData): void {
        this.dialogues.set(data.id, data);
    }

    // ─── Session Management ────────────────────────────────────────────

    /**
     * Start a dialogue by its identifier.
     * Emits 'dialogue:start' and immediately shows the first line.
     * @param dialogueId The ID of the dialogue tree to begin
     * @returns True if the dialogue was found and started
     */
    public startDialogue(dialogueId: string): boolean {
        const data = this.dialogues.get(dialogueId);
        if (!data) {
            Logger.warn('DialogueSystem', `Dialogue not found: ${dialogueId}`);
            return false;
        }

        if (data.lines.length === 0) {
            Logger.warn('DialogueSystem', `Dialogue has no lines: ${dialogueId}`);
            return false;
        }

        this.session = {
            dialogueId,
            data,
            currentLineIndex: 0,
            currentLine: data.lines[0],
            waitingForChoice: false,
        };

        Logger.info('DialogueSystem', `Starting dialogue: ${dialogueId}`);
        this.scene.events.emit('dialogue:start', { dialogueId });
        this.presentCurrentLine();
        return true;
    }

    /**
     * Advance to the next line in the current dialogue.
     * If the current line has choices and no choice has been selected,
     * this call is ignored. If the dialogue reaches its end, it closes.
     */
    public advance(): void {
        if (!this.session) return;

        // If waiting for a choice, do nothing on plain advance
        if (this.session.waitingForChoice) {
            Logger.debug('DialogueSystem', 'Waiting for choice selection, advance ignored');
            return;
        }

        const currentLine = this.session.currentLine;

        // Apply effects for the current line before moving on
        if (currentLine.effects) {
            this.applyEffects(currentLine.effects);
        }

        // Determine the next line
        const nextId = currentLine.next;

        if (!nextId || nextId === 'end') {
            this.endDialogue();
            return;
        }

        const nextLine = this.findLineById(nextId);
        if (!nextLine) {
            Logger.warn('DialogueSystem', `Next line not found: ${nextId}, ending dialogue`);
            this.endDialogue();
            return;
        }

        this.session.currentLine = nextLine;
        this.session.currentLineIndex++;
        this.presentCurrentLine();
    }

    /**
     * Select a choice option from the current line's choices array.
     * @param choiceIndex Zero-based index of the chosen option
     */
    public selectChoice(choiceIndex: number): void {
        if (!this.session || !this.session.waitingForChoice) return;

        const choices = this.session.currentLine.choices;
        if (!choices || choiceIndex < 0 || choiceIndex >= choices.length) {
            Logger.warn('DialogueSystem', `Invalid choice index: ${choiceIndex}`);
            return;
        }

        const chosen = choices[choiceIndex];
        Logger.debug('DialogueSystem', `Choice selected: "${chosen.text}"`);

        this.session.waitingForChoice = false;

        // Apply choice effects
        if (chosen.effects) {
            this.applyEffects(chosen.effects);
        }

        this.scene.events.emit('dialogue:choiceSelected', {
            dialogueId: this.session.dialogueId,
            choiceIndex,
            choiceText: chosen.text,
        });

        // Navigate to the choice target
        const nextId = chosen.next;
        if (!nextId || nextId === 'end') {
            this.endDialogue();
            return;
        }

        const nextLine = this.findLineById(nextId);
        if (!nextLine) {
            Logger.warn('DialogueSystem', `Choice target line not found: ${nextId}, ending dialogue`);
            this.endDialogue();
            return;
        }

        this.session.currentLine = nextLine;
        this.session.currentLineIndex++;
        this.presentCurrentLine();
    }

    /**
     * Whether a dialogue session is currently active.
     */
    public isActive(): boolean {
        return this.session !== null;
    }

    /**
     * Whether the system is waiting for a player choice selection.
     */
    public isWaitingForChoice(): boolean {
        return this.session?.waitingForChoice ?? false;
    }

    /**
     * Get the available choices for the current line, if any.
     * Returns null if no dialogue is active or the line has no choices.
     */
    public getCurrentChoices(): IDialogueChoice[] | null {
        if (!this.session || !this.session.currentLine.choices) return null;
        return this.session.currentLine.choices.filter((c) => this.evaluateCondition(c.condition));
    }

    /**
     * Force-close the current dialogue session without further processing.
     */
    public forceClose(): void {
        if (this.session) {
            Logger.info('DialogueSystem', `Dialogue force-closed: ${this.session.dialogueId}`);
            this.session = null;
            this.scene.events.emit('dialogue:end', { forced: true });
        }
    }

    // ─── Internal Flow ─────────────────────────────────────────────────

    /**
     * Present the current line to the UI via events.
     */
    private presentCurrentLine(): void {
        if (!this.session) return;

        const line = this.session.currentLine;
        const data = this.session.data;

        // Determine speaker info (line can override dialogue-level defaults)
        const speaker = line.speaker ?? data.speaker;
        const speakerName = line.speakerName ?? data.speakerName;
        const portrait = line.portrait ?? data.portrait;

        // Check if this line has choices
        const availableChoices = line.choices
            ? line.choices.filter((c) => this.evaluateCondition(c.condition))
            : null;

        const hasChoices = availableChoices !== null && availableChoices.length > 0;
        this.session.waitingForChoice = hasChoices;

        this.scene.events.emit('dialogue:line', {
            dialogueId: this.session.dialogueId,
            speaker,
            speakerName,
            portrait,
            text: line.text,
            hasChoices,
            choices: hasChoices
                ? availableChoices!.map((c, i) => ({ index: i, text: c.text }))
                : undefined,
        });
    }

    /**
     * End the current dialogue session normally.
     */
    private endDialogue(): void {
        if (!this.session) return;

        const dialogueId = this.session.dialogueId;
        this.session = null;

        this.scene.events.emit('dialogue:end', { dialogueId, forced: false });
        Logger.info('DialogueSystem', `Dialogue ended: ${dialogueId}`);
    }

    /**
     * Find a line by its id within the current dialogue's lines array.
     */
    private findLineById(lineId: string): IDialogueLine | null {
        if (!this.session) return null;

        // Lines can be identified by their `id` field
        const found = this.session.data.lines.find((l) => l.id === lineId);
        return found ?? null;
    }

    // ─── Effects Processing ────────────────────────────────────────────

    /**
     * Apply an array of dialogue effects to the game state.
     * Supported effect types:
     * - factionRep: Change faction reputation
     * - personality: Adjust a personality trait
     * - objective: Advance a quest objective
     * - addItem: Grant an item
     * - removeItem: Remove an item
     * - gold: Grant or deduct gold
     * - startMinigame: Emit an event to start a minigame
     * - flag: Set a game state flag
     * - morality: Adjust morality score
     */
    private applyEffects(effects: IDialogueEffect[]): void {
        for (const effect of effects) {
            switch (effect.type) {
                case 'factionRep': {
                    if (effect.faction && effect.amount !== undefined) {
                        this.gameState.addFactionReputation(effect.faction, effect.amount);
                        this.scene.events.emit('dialogue:effect', {
                            type: 'factionRep',
                            faction: effect.faction,
                            amount: effect.amount,
                        });
                    }
                    break;
                }

                case 'personality': {
                    if (effect.value && effect.amount !== undefined) {
                        this.gameState.addPersonalityTrait(effect.value, effect.amount);
                        this.scene.events.emit('dialogue:effect', {
                            type: 'personality',
                            trait: effect.value,
                            amount: effect.amount,
                        });
                    }
                    break;
                }

                case 'objective': {
                    if (effect.quest && effect.objective) {
                        this.gameState.completeQuestObjective(effect.quest, effect.objective);
                        this.scene.events.emit('dialogue:effect', {
                            type: 'objective',
                            quest: effect.quest,
                            objective: effect.objective,
                        });
                        // Also emit a quest event for the QuestSystem to pick up
                        this.scene.events.emit('quest:objectiveProgress', {
                            type: 'talk',
                            target: effect.objective,
                            questId: effect.quest,
                            objectiveId: effect.objective,
                        });
                    }
                    break;
                }

                case 'addItem': {
                    if (effect.value) {
                        const count = effect.amount ?? 1;
                        this.gameState.addItem(effect.value, count);
                        this.scene.events.emit('dialogue:effect', {
                            type: 'addItem',
                            item: effect.value,
                            count,
                        });
                    }
                    break;
                }

                case 'removeItem': {
                    if (effect.value) {
                        const count = effect.amount ?? 1;
                        this.gameState.removeItem(effect.value, count);
                        this.scene.events.emit('dialogue:effect', {
                            type: 'removeItem',
                            item: effect.value,
                            count,
                        });
                    }
                    break;
                }

                case 'gold': {
                    if (effect.amount !== undefined) {
                        if (effect.amount >= 0) {
                            this.gameState.addGold(effect.amount);
                        } else {
                            this.gameState.spendGold(Math.abs(effect.amount));
                        }
                        this.scene.events.emit('dialogue:effect', {
                            type: 'gold',
                            amount: effect.amount,
                        });
                    }
                    break;
                }

                case 'startMinigame': {
                    if (effect.value) {
                        this.scene.events.emit('dialogue:startMinigame', {
                            minigameId: effect.value,
                        });
                        Logger.info('DialogueSystem', `Minigame triggered: ${effect.value}`);
                    }
                    break;
                }

                case 'flag': {
                    if (effect.value !== undefined) {
                        const flagValue = effect.amount ?? true;
                        this.gameState.setFlag(
                            effect.value,
                            typeof flagValue === 'number' ? flagValue : true,
                        );
                        this.scene.events.emit('dialogue:effect', {
                            type: 'flag',
                            key: effect.value,
                            value: flagValue,
                        });
                    }
                    break;
                }

                case 'morality': {
                    if (effect.amount !== undefined) {
                        this.gameState.addMorality(effect.amount);
                        this.scene.events.emit('dialogue:effect', {
                            type: 'morality',
                            amount: effect.amount,
                        });
                    }
                    break;
                }

                default:
                    Logger.warn('DialogueSystem', `Unknown effect type: ${effect.type}`);
            }
        }
    }

    // ─── Condition Evaluation ──────────────────────────────────────────

    /**
     * Evaluate an optional condition string.
     * Returns true if the condition is met or if no condition is specified.
     *
     * Supported condition formats:
     * - "flag:flagName" - checks if a flag is truthy
     * - "quest:questId:completed" - checks quest completion
     * - "quest:questId:active" - checks quest is active
     * - "faction:factionId:>=:value" - checks faction rep threshold
     * - "item:itemId" - checks player has the item
     * - undefined/null - always true
     */
    private evaluateCondition(condition?: string): boolean {
        if (!condition) return true;

        const parts = condition.split(':');

        switch (parts[0]) {
            case 'flag': {
                const flagVal = this.gameState.getFlag(parts[1]);
                return !!flagVal;
            }

            case 'quest': {
                const questId = parts[1];
                const status = parts[2];
                if (status === 'completed') return this.gameState.isQuestCompleted(questId);
                if (status === 'active') return this.gameState.isQuestActive(questId);
                return false;
            }

            case 'faction': {
                const factionId = parts[1];
                const op = parts[2];
                const threshold = parseInt(parts[3], 10);
                const rep = this.gameState.getFactionReputation(factionId);

                switch (op) {
                    case '>=': return rep >= threshold;
                    case '<=': return rep <= threshold;
                    case '>': return rep > threshold;
                    case '<': return rep < threshold;
                    case '==': return rep === threshold;
                    default: return false;
                }
            }

            case 'item': {
                return this.gameState.getItemCount(parts[1]) > 0;
            }

            default:
                Logger.warn('DialogueSystem', `Unknown condition type: ${parts[0]}`);
                return true;
        }
    }

    // ─── Cleanup ───────────────────────────────────────────────────────

    /**
     * Clean up dialogue system state.
     */
    public destroy(): void {
        this.forceClose();
        this.dialogues.clear();
        Logger.info('DialogueSystem', 'Dialogue system destroyed');
    }
}
