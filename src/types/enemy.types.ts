/** Enemy drop item */
export interface IEnemyDrop {
    item: string;
    chance: number;
}

/** Base enemy data from JSON */
export interface IEnemyData {
    name: string;
    spriteKey: string;
    health: number;
    attack: number;
    defense: number;
    speed: number;
    exp: number;
    gold: [number, number];
    patterns: TEnemyPattern[];
    attackTelegraph: number;
    drops: IEnemyDrop[];
}

/** Enemy AI states */
export type TEnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead';

/** Enemy behavior patterns */
export type TEnemyPattern = 'patrol' | 'chase' | 'attack' | 'block' | 'ranged' | 'summon';

/** Boss phase configuration */
export interface IBossPhase {
    threshold: number;
    patterns: string[];
}

/** Boss data from JSON */
export interface IBossData {
    name: string;
    nameEn: string;
    title: string;
    location: string;
    health: number;
    phases: IBossPhase[];
    rewards: {
        exp: number;
        gold: number;
        item: string;
        achievement: string;
    };
}

/** Enemy spawn point data */
export interface IEnemySpawn {
    type: string;
    x: number;
    y: number;
    patrolRange?: number;
    respawn?: boolean;
}
