/** Quest objective types */
export type TQuestObjectiveType =
    | 'talk'
    | 'kill'
    | 'collect'
    | 'travel'
    | 'interact'
    | 'complete_quest'
    | 'minigame';

/** Quest status */
export type TQuestStatus = 'locked' | 'available' | 'active' | 'completed';

/** A single quest objective */
export interface IQuestObjective {
    id: string;
    type: TQuestObjectiveType;
    target: string | string[];
    count?: number;
    current?: number;
    description: string;
    completed: boolean;
}

/** Quest reward structure */
export interface IQuestRewards {
    exp: number;
    gold: number;
    items?: string[];
    factionRep?: { [faction: string]: number };
    unlocks?: string[];
}

/** A quest definition */
export interface IQuest {
    id: string;
    title: string;
    description: string;
    chapter: number;
    faction?: string;
    type?: 'mandatory' | 'optional';
    prerequisites: string[];
    objectives: IQuestObjective[];
    choices?: IQuestChoice[];
    rewards: IQuestRewards;
    dialogueOnComplete?: string;
    status: TQuestStatus;
    currentObjectiveIndex: number;
}

/** Quest dialogue choice */
export interface IQuestChoice {
    text: string;
    effects: IQuestEffect[];
    next: string;
}

/** Effect from quest choices */
export interface IQuestEffect {
    type: string;
    value?: string;
    amount?: number;
    faction?: string;
}

/** Faction reputation thresholds */
export type TFactionRelation =
    | 'hostile'
    | 'unfriendly'
    | 'neutral'
    | 'friendly'
    | 'allied'
    | 'devoted';

/** Faction data */
export interface IFaction {
    id: string;
    name: string;
    nameEn: string;
    leader: string;
    color: string;
    description: string;
    headquarters: string;
    relations: { [factionId: string]: number };
}

/** Faction reputation effects */
export interface IFactionEffects {
    shopDiscount: number;
    npcReaction: string;
    areaAccess: string;
    bountyHunters?: boolean;
    specialQuests?: boolean;
    endingUnlock?: boolean;
}
