import { ISaveData } from '../types/save.types';
import { IPlayerAbilities } from '../types/player.types';
import { Logger } from '../utils/Logger';
import { REPUTATION } from '../utils/Constants';
import { TFactionRelation } from '../types/quest.types';

/**
 * Singleton class managing all persistent game state.
 * Handles player data, quests, factions, world progress, and flags.
 */
export class GameState {
    private static instance: GameState;

    // Player data
    private playerPosition: { x: number; y: number } = { x: 640, y: 500 };
    private currentArea: string = 'hub';
    private health: number = 100;
    private maxHealth: number = 100;
    private energy: number = 100;
    private maxEnergy: number = 100;
    private attackPower: number = 10;
    private defense: number = 5;
    private abilities: IPlayerAbilities = {
        doubleJump: false,
        wallClimb: false,
        dashEnhanced: false,
        waterFlow: false,
        poisonImmune: false,
        glide: false,
    };
    private level: number = 1;
    private exp: number = 0;
    private gold: number = 0;
    private inventory: Map<string, number> = new Map();
    private equipment: { weapon: string | null; accessory1: string | null; accessory2: string | null } = {
        weapon: 'basic_sword',
        accessory1: null,
        accessory2: null,
    };
    private skills: string[] = [];

    // Quest data
    private activeQuests: Set<string> = new Set();
    private completedQuests: Set<string> = new Set();
    private questObjectives: Map<string, Map<string, number>> = new Map();

    // Faction data
    private factionReputation: Map<string, number> = new Map([
        ['taebong', 0],
        ['goryeo', 0],
        ['hubaekje', 0],
    ]);

    // World data
    private unlockedAreas: Set<string> = new Set(['hub']);
    private discoveredSecrets: Set<string> = new Set();
    private defeatedBosses: Set<string> = new Set();
    private npcStates: Map<string, string> = new Map();

    // Flags
    private flags: Map<string, boolean | number | string> = new Map();

    // Personality
    private personality = { cold: 0, warm: 0, aggressive: 0, diplomatic: 0 };
    private morality: number = 50;

    // Play time tracking
    private playTimeMs: number = 0;
    private lastTimeUpdate: number = Date.now();

    // Co-op state
    private isCoopActive: boolean = false;

    private constructor() {}

    /** Get the singleton instance */
    public static getInstance(): GameState {
        if (!GameState.instance) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }

    /** Reset all state for a new game */
    public reset(): void {
        this.playerPosition = { x: 640, y: 500 };
        this.currentArea = 'hub';
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.attackPower = 10;
        this.defense = 5;
        this.abilities = {
            doubleJump: false, wallClimb: false, dashEnhanced: false,
            waterFlow: false, poisonImmune: false, glide: false,
        };
        this.level = 1;
        this.exp = 0;
        this.gold = 0;
        this.inventory.clear();
        this.equipment = { weapon: 'basic_sword', accessory1: null, accessory2: null };
        this.skills = [];
        this.activeQuests.clear();
        this.completedQuests.clear();
        this.questObjectives.clear();
        this.factionReputation = new Map([['taebong', 0], ['goryeo', 0], ['hubaekje', 0]]);
        this.unlockedAreas = new Set(['hub']);
        this.discoveredSecrets.clear();
        this.defeatedBosses.clear();
        this.npcStates.clear();
        this.flags.clear();
        this.personality = { cold: 0, warm: 0, aggressive: 0, diplomatic: 0 };
        this.morality = 50;
        this.playTimeMs = 0;
        this.isCoopActive = false;
        Logger.info('GameState', 'State reset for new game');
    }

    // --- Player methods ---

    public getHealth(): number { return this.health; }
    public getMaxHealth(): number { return this.maxHealth; }
    public setHealth(value: number): void { this.health = Math.max(0, Math.min(value, this.maxHealth)); }
    public getEnergy(): number { return this.energy; }
    public getMaxEnergy(): number { return this.maxEnergy; }
    public setEnergy(value: number): void { this.energy = Math.max(0, Math.min(value, this.maxEnergy)); }
    public getAttackPower(): number { return this.attackPower; }
    public getDefense(): number { return this.defense; }
    public getGold(): number { return this.gold; }
    public getLevel(): number { return this.level; }
    public getExp(): number { return this.exp; }
    public getAbilities(): IPlayerAbilities { return { ...this.abilities }; }
    public getPosition(): { x: number; y: number } { return { ...this.playerPosition }; }
    public getCurrentArea(): string { return this.currentArea; }
    public getIsCoopActive(): boolean { return this.isCoopActive; }

    public setPosition(x: number, y: number): void {
        this.playerPosition = { x, y };
    }

    public setCurrentArea(area: string): void {
        this.currentArea = area;
    }

    public setCoopActive(active: boolean): void {
        this.isCoopActive = active;
    }

    public addGold(amount: number): void {
        this.gold += amount;
        Logger.debug('GameState', `Gold: ${this.gold} (+${amount})`);
    }

    public spendGold(amount: number): boolean {
        if (this.gold >= amount) {
            this.gold -= amount;
            return true;
        }
        return false;
    }

    public addExp(amount: number): void {
        this.exp += amount;
        const expNeeded = this.getExpForNextLevel();
        while (this.exp >= expNeeded) {
            this.exp -= expNeeded;
            this.level++;
            this.maxHealth += 10;
            this.health = this.maxHealth;
            this.attackPower += 2;
            this.defense += 1;
            Logger.info('GameState', `Level up! Now level ${this.level}`);
        }
    }

    private getExpForNextLevel(): number {
        return 100 + (this.level - 1) * 50;
    }

    public unlockAbility(ability: keyof IPlayerAbilities): void {
        this.abilities[ability] = true;
        Logger.info('GameState', `Ability unlocked: ${ability}`);
    }

    public hasAbility(ability: keyof IPlayerAbilities): boolean {
        return this.abilities[ability];
    }

    // --- Inventory methods ---

    public addItem(itemId: string, count: number = 1): void {
        const current = this.inventory.get(itemId) || 0;
        this.inventory.set(itemId, current + count);
    }

    public removeItem(itemId: string, count: number = 1): boolean {
        const current = this.inventory.get(itemId) || 0;
        if (current < count) return false;
        const newCount = current - count;
        if (newCount <= 0) {
            this.inventory.delete(itemId);
        } else {
            this.inventory.set(itemId, newCount);
        }
        return true;
    }

    public getItemCount(itemId: string): number {
        return this.inventory.get(itemId) || 0;
    }

    public getInventoryItems(): { item: string; count: number }[] {
        return Array.from(this.inventory.entries()).map(([item, count]) => ({ item, count }));
    }

    // --- Quest methods ---

    public activateQuest(questId: string): void {
        this.activeQuests.add(questId);
    }

    public completeQuest(questId: string): void {
        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);
    }

    public isQuestActive(questId: string): boolean {
        return this.activeQuests.has(questId);
    }

    public isQuestCompleted(questId: string): boolean {
        return this.completedQuests.has(questId);
    }

    public completeQuestObjective(questId: string, objectiveId: string): void {
        if (!this.questObjectives.has(questId)) {
            this.questObjectives.set(questId, new Map());
        }
        const objectives = this.questObjectives.get(questId)!;
        objectives.set(objectiveId, (objectives.get(objectiveId) || 0) + 1);
    }

    // --- Faction methods ---

    public getFactionReputation(faction: string): number {
        return this.factionReputation.get(faction) || 0;
    }

    public addFactionReputation(faction: string, amount: number): void {
        const current = this.factionReputation.get(faction) || 0;
        this.factionReputation.set(faction, current + amount);
        Logger.debug('GameState', `Faction ${faction}: ${current + amount} (${amount > 0 ? '+' : ''}${amount})`);
    }

    public setFactionReputation(faction: string, value: number): void {
        this.factionReputation.set(faction, value);
    }

    public getFactionRelation(faction: string): TFactionRelation {
        const rep = this.getFactionReputation(faction);
        if (rep >= REPUTATION.DEVOTED) return 'devoted';
        if (rep >= REPUTATION.ALLIED) return 'allied';
        if (rep >= REPUTATION.FRIENDLY) return 'friendly';
        if (rep >= REPUTATION.NEUTRAL) return 'neutral';
        if (rep >= REPUTATION.UNFRIENDLY) return 'unfriendly';
        return 'hostile';
    }

    // --- World methods ---

    public unlock(areaOrFeature: string): void {
        this.unlockedAreas.add(areaOrFeature);
    }

    public isUnlocked(areaOrFeature: string): boolean {
        return this.unlockedAreas.has(areaOrFeature);
    }

    public defeatBoss(bossId: string): void {
        this.defeatedBosses.add(bossId);
    }

    public isBossDefeated(bossId: string): boolean {
        return this.defeatedBosses.has(bossId);
    }

    public discoverSecret(secretId: string): void {
        this.discoveredSecrets.add(secretId);
    }

    public setNpcState(npcId: string, state: string): void {
        this.npcStates.set(npcId, state);
    }

    public getNpcState(npcId: string): string {
        return this.npcStates.get(npcId) || 'default';
    }

    // --- Flag methods ---

    public setFlag(key: string, value: boolean | number | string): void {
        this.flags.set(key, value);
    }

    public getFlag(key: string): boolean | number | string | undefined {
        return this.flags.get(key);
    }

    // --- Personality methods ---

    public addPersonalityTrait(trait: string, amount: number): void {
        if (trait in this.personality) {
            (this.personality as Record<string, number>)[trait] += amount;
        }
    }

    public addMorality(amount: number): void {
        this.morality = Math.max(0, Math.min(100, this.morality + amount));
    }

    public getMorality(): number { return this.morality; }

    // --- Time methods ---

    public updatePlayTime(): void {
        const now = Date.now();
        this.playTimeMs += now - this.lastTimeUpdate;
        this.lastTimeUpdate = now;
    }

    public getPlayTime(): number { return this.playTimeMs; }

    // --- Save/Load methods ---

    public getPlayerSaveData(): ISaveData['player'] {
        return {
            position: { ...this.playerPosition },
            currentArea: this.currentArea,
            health: this.health,
            maxHealth: this.maxHealth,
            abilities: { ...this.abilities },
            inventory: this.getInventoryItems(),
            equipment: { ...this.equipment },
            gold: this.gold,
            exp: this.exp,
            level: this.level,
            skills: [...this.skills],
        };
    }

    public getQuestSaveData(): ISaveData['quests'] {
        const objectives: { [questId: string]: { [objId: string]: number } } = {};
        this.questObjectives.forEach((objs, questId) => {
            objectives[questId] = {};
            objs.forEach((count, objId) => {
                objectives[questId][objId] = count;
            });
        });
        return {
            active: Array.from(this.activeQuests),
            completed: Array.from(this.completedQuests),
            objectives,
        };
    }

    public getFactionSaveData(): ISaveData['factions'] {
        const factions: { [faction: string]: number } = {};
        this.factionReputation.forEach((rep, faction) => {
            factions[faction] = rep;
        });
        return factions;
    }

    public getWorldSaveData(): ISaveData['world'] {
        const npcStates: { [npcId: string]: string } = {};
        this.npcStates.forEach((state, npcId) => {
            npcStates[npcId] = state;
        });
        return {
            unlockedAreas: Array.from(this.unlockedAreas),
            discoveredSecrets: Array.from(this.discoveredSecrets),
            defeatedBosses: Array.from(this.defeatedBosses),
            npcStates,
        };
    }

    public getFlagsSaveData(): ISaveData['flags'] {
        const flags: { [key: string]: boolean | number | string } = {};
        this.flags.forEach((value, key) => {
            flags[key] = value;
        });
        return flags;
    }

    public loadFromSave(data: ISaveData): void {
        this.playerPosition = { ...data.player.position };
        this.currentArea = data.player.currentArea;
        this.health = data.player.health;
        this.maxHealth = data.player.maxHealth;
        this.abilities = data.player.abilities as unknown as IPlayerAbilities;
        this.gold = data.player.gold;
        this.exp = data.player.exp;
        this.level = data.player.level;
        this.skills = [...data.player.skills];
        this.equipment = { ...data.player.equipment };

        this.inventory.clear();
        data.player.inventory.forEach(({ item, count }) => {
            this.inventory.set(item, count);
        });

        this.activeQuests = new Set(data.quests.active);
        this.completedQuests = new Set(data.quests.completed);
        this.questObjectives.clear();
        Object.entries(data.quests.objectives).forEach(([questId, objs]) => {
            const objMap = new Map<string, number>();
            Object.entries(objs).forEach(([objId, count]) => {
                objMap.set(objId, count);
            });
            this.questObjectives.set(questId, objMap);
        });

        this.factionReputation.clear();
        Object.entries(data.factions).forEach(([faction, rep]) => {
            this.factionReputation.set(faction, rep);
        });

        this.unlockedAreas = new Set(data.world.unlockedAreas);
        this.discoveredSecrets = new Set(data.world.discoveredSecrets);
        this.defeatedBosses = new Set(data.world.defeatedBosses);
        this.npcStates.clear();
        Object.entries(data.world.npcStates).forEach(([npcId, state]) => {
            this.npcStates.set(npcId, state);
        });

        this.flags.clear();
        Object.entries(data.flags).forEach(([key, value]) => {
            this.flags.set(key, value);
        });

        this.playTimeMs = data.playTime;
        if (data.personality) {
            this.personality = { ...data.personality };
        }
        if (data.morality !== undefined) {
            this.morality = data.morality;
        }
        this.lastTimeUpdate = Date.now();

        Logger.info('GameState', 'State loaded from save');
    }
}
