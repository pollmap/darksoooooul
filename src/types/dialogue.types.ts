/** A single dialogue effect */
export interface IDialogueEffect {
    type: string;
    value?: string;
    amount?: number;
    quest?: string;
    objective?: string;
    faction?: string;
}

/** A dialogue choice option */
export interface IDialogueChoice {
    text: string;
    next: string;
    effects?: IDialogueEffect[];
    condition?: string;
}

/** A single line of dialogue */
export interface IDialogueLine {
    id?: string;
    text: string;
    speaker?: string;
    speakerName?: string;
    portrait?: string;
    next?: string;
    choices?: IDialogueChoice[];
    effects?: IDialogueEffect[];
}

/** A complete dialogue tree */
export interface IDialogueData {
    id: string;
    speaker: string;
    speakerName: string;
    portrait?: string;
    lines: IDialogueLine[];
}

/** NPC dialogue trigger conditions */
export interface IDialogueTrigger {
    npcId: string;
    dialogueId: string;
    conditions?: {
        questStatus?: { questId: string; status: string };
        factionRep?: { faction: string; min?: number; max?: number };
        flag?: { key: string; value: boolean | number | string };
    };
    priority: number;
}
