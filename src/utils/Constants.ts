/** Game-wide constants */

/** Game resolution */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Scene keys */
export const SCENES = {
    BOOT: 'BootScene',
    PRELOADER: 'PreloaderScene',
    MAIN_MENU: 'MainMenuScene',
    GAME: 'GameScene',
    UI: 'UIScene',
    DIALOGUE: 'DialogueScene',
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
    PLAYER1_ACCENT: 0x1a237e,
    PLAYER2_ACCENT: 0x00897b,
    TAEBONG: 0x4a148c,
    GORYEO: 0x00695c,
    HUBAEKJE: 0xb71c1c,
    SILLA: 0xff8f00,
    BALHAE: 0x1565c0,
    HEALTH_BAR: 0xc62828,
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

/** Physics constants */
export const PHYSICS = {
    TILE_SIZE: 32,
    GRAVITY_Y: 800,
    MAX_VELOCITY_X: 400,
    MAX_VELOCITY_Y: 600,
} as const;

/** Combat constants */
export const COMBAT = {
    COOP_BONUS_WINDOW: 300,
    COOP_BONUS_MULTIPLIER: 1.2,
    CRIT_CHANCE: 0.05,
    CRIT_MULTIPLIER: 1.5,
    BACKSTAB_CRIT: true,
    INVINCIBILITY_AFTER_HIT: 500,
    KNOCKBACK_FORCE: 100,
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
    CURRENT_VERSION: '1.0.0',
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
    ITEMS: 20,
    ENEMIES: 30,
    PLAYER: 40,
    PROJECTILES: 50,
    EFFECTS: 60,
    FOREGROUND: 70,
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
        JUMP: 'sfx_jump',
        LAND: 'sfx_land',
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
