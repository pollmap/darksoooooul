/** Game-wide constants - Top-down Pixel RPG Version */

/** Game resolution */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Tile and map constants */
export const TILE_SIZE = 16;
export const CAMERA_ZOOM = 3;
export const PLAYER_SPEED = 2; // tiles per second for grid movement
export const MOVE_DURATION = 180; // ms to slide one tile

/** Scene keys */
export const SCENES = {
    BOOT: 'BootScene',
    PRELOADER: 'PreloaderScene',
    MAIN_MENU: 'MainMenuScene',
    GAME: 'GameScene',
    UI: 'UIScene',
    DIALOGUE: 'DialogueScene',
    BATTLE: 'BattleScene',
    HUB: 'HubScene',
    SONGAK: 'SongakScene',
    WANSANJU: 'WansanjuScene',
    GEUMSEONG: 'GeumseongScene',
    CHEOLWON: 'CheolwonScene',
    PAEGANG: 'PaegangScene',
    SANGJU: 'SangjuScene',
} as const;

/** Faction identifiers */
export const FACTIONS = {
    TAEBONG: 'taebong',
    GORYEO: 'goryeo',
    HUBAEKJE: 'hubaekje',
    SILLA: 'silla',
    BALHAE: 'balhae',
} as const;

/** Color palette */
export const COLORS = {
    BACKGROUND: 0x1a1a2e,
    GRASS: 0x5b8c3e,
    GRASS_DARK: 0x4a7a30,
    PATH: 0xc8b478,
    PATH_DARK: 0xb5a068,
    WATER: 0x3a7ecf,
    WATER_LIGHT: 0x5a9eef,
    TALL_GRASS: 0x3d6e28,
    TREE_TRUNK: 0x6b4226,
    TREE_LEAVES: 0x2d6e1e,
    FENCE: 0x5a4a3a,
    BUILDING_WALL: 0x8a7a6a,
    BUILDING_ROOF: 0x4a3a2e,
    BUILDING_ROOF_RED: 0x8b3a3a,
    DOOR: 0x5a3a1a,
    PLAYER1_ACCENT: 0x1a237e,
    PLAYER2_ACCENT: 0x00897b,
    TAEBONG: 0x4a148c,
    GORYEO: 0x00695c,
    HUBAEKJE: 0xb71c1c,
    SILLA: 0xff8f00,
    BALHAE: 0x1565c0,
    HEALTH_BAR: 0xc62828,
    HEALTH_BAR_BG: 0x333333,
    ENERGY_BAR: 0x1565c0,
    EXP_BAR: 0x7cb342,
    GOLD: 0xffd700,
    WHITE: 0xffffff,
    BLACK: 0x000000,
} as const;

/** Color strings for text styling */
export const COLOR_STRINGS = {
    HEALTH: '#c62828',
    ENERGY: '#1565c0',
    EXP: '#7cb342',
    GOLD: '#ffd700',
    WHITE: '#ffffff',
    BLACK: '#000000',
    GREY: '#888888',
} as const;

/** Physics constants (no gravity for top-down) */
export const PHYSICS = {
    TILE_SIZE: 16,
    GRAVITY_Y: 0,
    MAX_VELOCITY_X: 200,
    MAX_VELOCITY_Y: 200,
} as const;

/** Combat constants */
export const COMBAT = {
    ENCOUNTER_RATE: 0.08, // 8% chance per tall grass step
    CRIT_CHANCE: 0.05,
    CRIT_MULTIPLIER: 1.5,
    INVINCIBILITY_AFTER_HIT: 500,
    KNOCKBACK_FORCE: 100,
    COOP_BONUS_WINDOW: 300,
    COOP_BONUS_MULTIPLIER: 1.2,
    BACKSTAB_CRIT: true,
} as const;

/** Co-op constants */
export const COOP = {
    MAX_DISTANCE_MULTIPLIER: 1.2,
    TELEPORT_INVINCIBILITY: 5000,
    REVIVE_TIME: 1500,
    REVIVE_COUNTDOWN: 5000,
    REVIVE_HP_PERCENT: 0.3,
    ENEMY_HP_MULTIPLIER: 1.5,
    BOSS_HP_MULTIPLIER: 1.8,
    ITEM_DROP_MULTIPLIER: 1.3,
    EXP_MULTIPLIER: 1.2,
    CAMERA_ZOOM_MIN: 0.67,
    CAMERA_ZOOM_MAX: 1.0,
} as const;

/** Save system constants */
export const SAVE = {
    KEY_PREFIX: 'samhanjimong_save_',
    MAX_SLOTS: 3,
    CURRENT_VERSION: '2.0.0',
    AUTO_SAVE_SLOT: '0_auto',
} as const;

/** Reputation thresholds */
export const REPUTATION = {
    HOSTILE: -60,
    UNFRIENDLY: -30,
    NEUTRAL: 0,
    FRIENDLY: 30,
    ALLIED: 60,
    DEVOTED: 90,
} as const;

/** Layer depths for rendering order */
export const DEPTH = {
    BACKGROUND: 0,
    TILES: 10,
    TILES_ABOVE: 15,
    ITEMS: 20,
    ENEMIES: 30,
    PLAYER: 40,
    NPC: 35,
    PROJECTILES: 50,
    EFFECTS: 60,
    FOREGROUND: 70,
    TREE_TOP: 75,
    UI: 100,
} as const;

/** Audio keys */
export const AUDIO = {
    BGM: {
        HUB: 'bgm_hub',
        SONGAK: 'bgm_songak',
        WANSANJU: 'bgm_wansanju',
        GEUMSEONG: 'bgm_geumseong',
        CHEOLWON: 'bgm_cheolwon',
        PAEGANG: 'bgm_paegang',
        SANGJU: 'bgm_sangju',
        BATTLE: 'bgm_battle',
        BOSS: 'bgm_boss',
        BOSS_GUNGYE: 'bgm_boss_gungye',
        ENDING: 'bgm_ending',
    },
    SFX: {
        SWORD_SWING: 'sfx_sword_swing',
        SWORD_HIT: 'sfx_sword_hit',
        SWORD_CRIT: 'sfx_sword_crit',
        PLAYER_HURT: 'sfx_player_hurt',
        ENEMY_HURT: 'sfx_enemy_hurt',
        ENEMY_DEATH: 'sfx_enemy_death',
        FOOTSTEP: 'sfx_footstep',
        BUMP: 'sfx_bump',
        ENCOUNTER: 'sfx_encounter',
        DODGE: 'sfx_dodge',
        PARRY_NORMAL: 'sfx_parry_normal',
        PARRY_PERFECT: 'sfx_parry_perfect',
        HEAL: 'sfx_heal',
        LEVEL_UP: 'sfx_level_up',
        MENU_SELECT: 'sfx_menu_select',
        MENU_CONFIRM: 'sfx_menu_confirm',
        MENU_CANCEL: 'sfx_menu_cancel',
        QUEST_ACCEPT: 'sfx_quest_accept',
        QUEST_COMPLETE: 'sfx_quest_complete',
    },
} as const;

/** Tile type IDs for map data */
export const TILE = {
    GRASS: 0,
    PATH: 1,
    WATER: 2,
    TALL_GRASS: 3,
    TREE_TRUNK: 4,
    TREE_TOP: 5,
    FENCE: 6,
    BUILDING_WALL: 7,
    BUILDING_ROOF: 8,
    DOOR: 9,
    FLOWER: 10,
    SIGN: 11,
    BRIDGE: 12,
    STAIRS: 13,
    ROOF_RED: 14,
    EMPTY: 15,
} as const;

/** Which tiles block movement */
export const SOLID_TILES: Set<number> = new Set([
    TILE.WATER,
    TILE.TREE_TRUNK,
    TILE.TREE_TOP,
    TILE.FENCE,
    TILE.BUILDING_WALL,
    TILE.BUILDING_ROOF,
    TILE.SIGN,
    TILE.ROOF_RED,
]);

/** Which tiles trigger random encounters */
export const ENCOUNTER_TILES: Set<number> = new Set([
    TILE.TALL_GRASS,
]);

/** Direction constants */
export const DIR = {
    DOWN: 0,
    UP: 1,
    LEFT: 2,
    RIGHT: 3,
} as const;

export type TDirection = 0 | 1 | 2 | 3;
