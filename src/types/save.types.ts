/** Complete save data structure */
export interface ISaveData {
    version: string;
    timestamp: number;
    player: {
        position: { x: number; y: number };
        currentArea: string;
        health: number;
        maxHealth: number;
        abilities: { [key: string]: boolean };
        inventory: { item: string; count: number }[];
        equipment: {
            weapon: string | null;
            accessory1: string | null;
            accessory2: string | null;
        };
        gold: number;
        exp: number;
        level: number;
        skills: string[];
    };
    player2?: {
        active: boolean;
        health: number;
    };
    quests: {
        active: string[];
        completed: string[];
        objectives: { [questId: string]: { [objId: string]: number } };
    };
    factions: {
        [faction: string]: number;
    };
    world: {
        unlockedAreas: string[];
        discoveredSecrets: string[];
        defeatedBosses: string[];
        npcStates: { [npcId: string]: string };
    };
    flags: { [flag: string]: boolean | number | string };
    playTime: number;
    personality: {
        cold: number;
        warm: number;
        aggressive: number;
        diplomatic: number;
    };
    morality: number;
}

/** Save slot info for display */
export interface ISaveSlotInfo {
    exists: boolean;
    timestamp?: number;
    playTime?: number;
    area?: string;
    level?: number;
}
