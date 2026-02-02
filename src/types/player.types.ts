/** Player abilities that can be unlocked through gameplay */
export interface IPlayerAbilities {
    doubleJump: boolean;
    wallClimb: boolean;
    dashEnhanced: boolean;
    waterFlow: boolean;
    poisonImmune: boolean;
    glide: boolean;
}

/** Player combat stats */
export interface IPlayerStats {
    maxHealth: number;
    maxEnergy: number;
    attackPower: number;
    defense: number;
    speed: number;
    jumpForce: number;
}

/** Player state for runtime tracking */
export interface IPlayerState {
    health: number;
    maxHealth: number;
    energy: number;
    maxEnergy: number;
    attackPower: number;
    defense: number;
    speed: number;
    jumpForce: number;
    abilities: IPlayerAbilities;
    level: number;
    exp: number;
    gold: number;
    position: { x: number; y: number };
    currentArea: string;
    facingRight: boolean;
}

/** Attack frame data */
export interface IAttackFrames {
    light1: number;
    light2: number;
    light3: number;
}

/** Damage multipliers for different attack types */
export interface IDamageMultipliers {
    light1: number;
    light2: number;
    light3: number;
    aerial: number;
    downward: number;
}

/** Dodge configuration */
export interface IDodgeConfig {
    iFrames: number;
    distance: number;
    cooldown: number;
}

/** Parry configuration */
export interface IParryConfig {
    windowPerfect: number;
    windowNormal: number;
    stunDuration: number;
}

/** Heal configuration */
export interface IHealConfig {
    energyCost: number;
    castTime: number;
    healAmount: number;
}

/** Player combat configuration */
export interface IPlayerCombat {
    attackFrames: IAttackFrames;
    damageMultipliers: IDamageMultipliers;
    dodge: IDodgeConfig;
    parry: IParryConfig;
    heal: IHealConfig;
}

/** Skill data */
export interface ISkill {
    id: string;
    name: string;
    type: 'sword' | 'magic' | 'shadow';
    energyCost: number;
    damage: number;
    cooldown: number;
    description: string;
}

/** Inventory item reference */
export interface IInventoryItem {
    itemId: string;
    count: number;
}

/** Equipped items */
export interface IEquipment {
    weapon: string | null;
    accessory1: string | null;
    accessory2: string | null;
}

/** Player input action names */
export type TPlayerAction =
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'jump'
    | 'attack'
    | 'skill'
    | 'dodge'
    | 'parry'
    | 'heal'
    | 'interact'
    | 'map'
    | 'menu'
    | 'inventory';
