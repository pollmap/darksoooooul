import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import {
    SCENES,
    GAME_WIDTH,
    GAME_HEIGHT,
    DEPTH,
    COLORS,
    COLOR_STRINGS,
    COMBAT,
} from '../utils/Constants';
import { GameState } from '../state/GameState';
import { Logger } from '../utils/Logger';

/**
 * Data passed to BattleScene when initiating a battle encounter.
 */
interface IBattleData {
    /** English enemy name identifier */
    enemyName: string;
    /** Korean display name for the enemy */
    enemyNameKo: string;
    /** Enemy maximum hit points */
    enemyHp: number;
    /** Enemy attack power */
    enemyAtk: number;
    /** Enemy defense stat */
    enemyDef: number;
    /** Experience points awarded on defeat */
    enemyExp: number;
    /** Gold reward range [min, max] */
    enemyGold: [number, number];
    /** Scene key to return to after battle ends */
    returnScene: string;
}

/** Heal amount from a single potion use */
const POTION_HEAL_AMOUNT = 30;

/** Probability of successfully escaping battle (0-1) */
const RUN_CHANCE = 0.5;

/** Energy cost for using a martial arts skill */
const SKILL_ENERGY_COST = 20;

/** Damage multiplier applied when using a skill */
const SKILL_DAMAGE_MULTIPLIER = 2;

/** Maximum number of lines visible in the battle log */
const MAX_LOG_LINES = 5;

/** Delay in ms before the enemy takes their turn */
const ENEMY_TURN_DELAY = 800;

/** Delay in ms after victory/defeat before transitioning scenes */
const END_BATTLE_DELAY = 2500;

/** Display name for the player character */
const PLAYER_NAME = '주인공';

/** Korean labels for the four battle menu actions */
const MENU_LABELS = ['공격', '무공', '약초', '도주'];

/** Number of columns in the battle menu grid */
const MENU_COLS = 2;

/** Duration of HP bar animation tween in ms */
const HP_BAR_TWEEN_DURATION = 400;

/** Duration of the sprite flash animation in ms per cycle */
const FLASH_DURATION = 100;

/** Number of flash repetitions for hit animation */
const FLASH_REPEAT_COUNT = 2;

// --- Layout constants ---

/** Enemy panel position and dimensions */
const ENEMY_PANEL_X = 30;
const ENEMY_PANEL_Y = 25;
const ENEMY_PANEL_W = 400;
const ENEMY_PANEL_H = 85;

/** Enemy HP bar position and dimensions */
const ENEMY_HP_BAR_X = 80;
const ENEMY_HP_BAR_Y = 68;
const ENEMY_HP_BAR_W = 290;
const ENEMY_HP_BAR_H = 14;

/** Player panel position and dimensions */
const PLAYER_PANEL_X = 700;
const PLAYER_PANEL_Y = 320;
const PLAYER_PANEL_W = 420;
const PLAYER_PANEL_H = 110;

/** Player HP bar position and dimensions */
const PLAYER_HP_BAR_X = 760;
const PLAYER_HP_BAR_Y = 363;
const PLAYER_HP_BAR_W = 290;
const PLAYER_HP_BAR_H = 14;

/** Player energy bar position and dimensions */
const PLAYER_ENERGY_BAR_X = 760;
const PLAYER_ENERGY_BAR_Y = 393;
const PLAYER_ENERGY_BAR_W = 290;
const PLAYER_ENERGY_BAR_H = 10;

/** Y-coordinate of the divider between battle field and UI */
const DIVIDER_Y = 450;

/** Battle log panel position and dimensions */
const LOG_PANEL_X = 20;
const LOG_PANEL_Y = 460;
const LOG_PANEL_W = 620;
const LOG_PANEL_H = 240;

/** Battle menu panel position and dimensions */
const MENU_PANEL_X = 660;
const MENU_PANEL_Y = 460;
const MENU_PANEL_W = 600;
const MENU_PANEL_H = 240;

/** Starting position of menu item text */
const MENU_ITEM_START_X = 730;
const MENU_ITEM_START_Y = 510;
const MENU_COL_GAP = 250;
const MENU_ROW_GAP = 70;

/**
 * Turn-based battle scene inspired by Pokemon-style encounters.
 *
 * All UI is rendered procedurally using Phaser Graphics and Text objects
 * without any external sprite assets. The scene handles player menu input,
 * damage calculation with critical hit support, smooth HP bar animations,
 * and battle resolution through victory, defeat, or escape.
 *
 * @example
 * ```typescript
 * this.scene.start(SCENES.BATTLE, {
 *     enemyName: 'bandit',
 *     enemyNameKo: '산적',
 *     enemyHp: 50,
 *     enemyAtk: 8,
 *     enemyDef: 3,
 *     enemyExp: 25,
 *     enemyGold: [10, 30],
 *     returnScene: SCENES.SONGAK,
 * });
 * ```
 */
export class BattleScene extends BaseScene {
    /** Incoming battle configuration data */
    private battleData!: IBattleData;

    /** Scene key to return to when the battle ends */
    private returnScene!: string;

    /** Enemy's current hit points */
    private enemyCurrentHp!: number;

    /** Enemy's maximum hit points (snapshot from battle data) */
    private enemyMaxHp!: number;

    /** Whether it is currently the player's turn to act */
    private isPlayerTurn!: boolean;

    /** Whether the battle has been resolved (win, lose, or flee) */
    private isBattleOver!: boolean;

    /** Currently highlighted menu item index (0-3) */
    private menuIndex!: number;

    /** Whether an animation or action sequence is currently playing */
    private isAnimating!: boolean;

    /** Smoothly interpolated enemy HP value for bar animation */
    private displayedEnemyHp!: number;

    /** Smoothly interpolated player HP value for bar animation */
    private displayedPlayerHp!: number;

    // --- UI element references ---

    /** Graphics object for drawing the enemy HP bar */
    private enemyHpBarGfx!: Phaser.GameObjects.Graphics;

    /** Graphics object for drawing the player HP bar */
    private playerHpBarGfx!: Phaser.GameObjects.Graphics;

    /** Graphics object for drawing the player energy bar */
    private playerEnergyBarGfx!: Phaser.GameObjects.Graphics;

    /** Text objects for the four menu options */
    private menuTexts!: Phaser.GameObjects.Text[];

    /** Text object displaying the battle log messages */
    private battleLogText!: Phaser.GameObjects.Text;

    /** Text object showing the enemy name */
    private enemyNameText!: Phaser.GameObjects.Text;

    /** Text object showing enemy HP numbers */
    private enemyHpValueText!: Phaser.GameObjects.Text;

    /** Text object showing the player name */
    private playerNameText!: Phaser.GameObjects.Text;

    /** Text object showing player HP numbers */
    private playerHpValueText!: Phaser.GameObjects.Text;

    /** Text object showing player energy numbers */
    private playerEnergyValueText!: Phaser.GameObjects.Text;

    /** Placeholder rectangle representing the enemy */
    private enemySprite!: Phaser.GameObjects.Rectangle;

    /** Placeholder rectangle representing the player */
    private playerSprite!: Phaser.GameObjects.Rectangle;

    /** Ordered history of battle log messages */
    private logMessages: string[] = [];

    // --- Input key references ---

    /** Cursor (arrow) keys for menu navigation */
    private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

    /** Z key for confirming menu selection */
    private keyZ!: Phaser.Input.Keyboard.Key;

    /** Enter key for confirming menu selection */
    private keyEnter!: Phaser.Input.Keyboard.Key;

    constructor() {
        super(SCENES.BATTLE);
    }

    // ========================================================================
    // Phaser Lifecycle
    // ========================================================================

    /**
     * Initialize battle state from the data passed by the calling scene.
     * Resets all battle-local variables and stores enemy configuration.
     * @param data - Battle encounter configuration
     */
    public init(data: IBattleData): void {
        super.init(data);

        this.battleData = data;
        this.returnScene = data.returnScene;
        this.enemyCurrentHp = data.enemyHp;
        this.enemyMaxHp = data.enemyHp;
        this.displayedEnemyHp = data.enemyHp;
        this.displayedPlayerHp = this.gameState.getHealth();
        this.isPlayerTurn = true;
        this.isBattleOver = false;
        this.menuIndex = 0;
        this.isAnimating = false;
        this.logMessages = [];

        Logger.info(
            'BattleScene',
            `Battle initiated vs ${data.enemyName} (${data.enemyNameKo}) ` +
            `HP:${data.enemyHp} ATK:${data.enemyAtk} DEF:${data.enemyDef}`
        );
    }

    /**
     * Build the entire battle UI and begin the encounter.
     * All visuals are procedurally generated - no external assets required.
     */
    public create(): void {
        this.createBackground();
        this.createEnemyPanel();
        this.createPlayerPanel();
        this.createBattleSprites();
        this.createBattleLog();
        this.createBattleMenu();
        this.setupInput();

        this.addLogMessage(`야생의 ${this.battleData.enemyNameKo}(이)가 나타났다!`);
        this.fadeIn(300);
    }

    /**
     * Per-frame update. Processes menu input only when the player
     * has control (not animating, not enemy turn, battle not over).
     */
    public update(): void {
        if (this.isBattleOver || this.isAnimating || !this.isPlayerTurn) {
            return;
        }
        this.handleMenuInput();
    }

    // ========================================================================
    // UI Creation
    // ========================================================================

    /**
     * Draw the procedural battle background with a gradient sky,
     * ground section, and lower UI panel area.
     */
    private createBackground(): void {
        const gfx = this.add.graphics();

        // Sky gradient (upper battle field)
        const gradientSteps = 8;
        const fieldHeight = DIVIDER_Y;
        for (let i = 0; i < gradientSteps; i++) {
            const t = i / gradientSteps;
            const r = Math.floor(0x1a + t * 0x10);
            const g = Math.floor(0x1a + t * 0x15);
            const b = Math.floor(0x2e + t * 0x12);
            const color = (r << 16) | (g << 8) | b;
            gfx.fillStyle(color, 1);
            const sliceY = (fieldHeight / gradientSteps) * i;
            const sliceH = fieldHeight / gradientSteps + 1;
            gfx.fillRect(0, sliceY, GAME_WIDTH, sliceH);
        }

        // Ground area beneath sprites
        gfx.fillStyle(0x2a3a1e, 1);
        gfx.fillRect(0, 320, GAME_WIDTH, 130);

        // Bottom UI panel area
        gfx.fillStyle(0x111122, 1);
        gfx.fillRect(0, DIVIDER_Y, GAME_WIDTH, GAME_HEIGHT - DIVIDER_Y);

        // Horizontal divider line
        gfx.lineStyle(2, COLORS.WHITE, 0.3);
        gfx.lineBetween(0, DIVIDER_Y, GAME_WIDTH, DIVIDER_Y);

        gfx.setDepth(DEPTH.BACKGROUND);
    }

    /**
     * Create the enemy information panel at the top-left of the battle field.
     * Includes the enemy name label and an animated HP bar.
     */
    private createEnemyPanel(): void {
        const panel = this.add.graphics();
        panel.fillStyle(0x222233, 0.85);
        panel.fillRoundedRect(ENEMY_PANEL_X, ENEMY_PANEL_Y, ENEMY_PANEL_W, ENEMY_PANEL_H, 8);
        panel.lineStyle(2, COLORS.WHITE, 0.4);
        panel.strokeRoundedRect(ENEMY_PANEL_X, ENEMY_PANEL_Y, ENEMY_PANEL_W, ENEMY_PANEL_H, 8);
        panel.setDepth(DEPTH.UI);

        this.enemyNameText = this.add.text(
            ENEMY_PANEL_X + 20,
            ENEMY_PANEL_Y + 10,
            this.battleData.enemyNameKo,
            { fontSize: '22px', color: COLOR_STRINGS.WHITE, fontStyle: 'bold' }
        ).setDepth(DEPTH.UI);

        // HP label
        this.add.text(
            ENEMY_PANEL_X + 20,
            ENEMY_HP_BAR_Y - 2,
            'HP',
            { fontSize: '14px', color: COLOR_STRINGS.HEALTH, fontStyle: 'bold' }
        ).setDepth(DEPTH.UI);

        this.enemyHpBarGfx = this.add.graphics().setDepth(DEPTH.UI);
        this.drawEnemyHpBar();

        this.enemyHpValueText = this.add.text(
            ENEMY_HP_BAR_X + ENEMY_HP_BAR_W,
            ENEMY_HP_BAR_Y - 2,
            `${this.enemyCurrentHp}/${this.enemyMaxHp}`,
            { fontSize: '13px', color: COLOR_STRINGS.WHITE }
        ).setOrigin(1, 0).setDepth(DEPTH.UI);
    }

    /**
     * Create the player information panel at the bottom-right of the battle field.
     * Includes player name, level, HP bar, and energy (inner power) bar.
     */
    private createPlayerPanel(): void {
        const panel = this.add.graphics();
        panel.fillStyle(0x222233, 0.85);
        panel.fillRoundedRect(PLAYER_PANEL_X, PLAYER_PANEL_Y, PLAYER_PANEL_W, PLAYER_PANEL_H, 8);
        panel.lineStyle(2, COLORS.WHITE, 0.4);
        panel.strokeRoundedRect(PLAYER_PANEL_X, PLAYER_PANEL_Y, PLAYER_PANEL_W, PLAYER_PANEL_H, 8);
        panel.setDepth(DEPTH.UI);

        const level = this.gameState.getLevel();

        this.playerNameText = this.add.text(
            PLAYER_PANEL_X + 20,
            PLAYER_PANEL_Y + 10,
            PLAYER_NAME,
            { fontSize: '22px', color: COLOR_STRINGS.WHITE, fontStyle: 'bold' }
        ).setDepth(DEPTH.UI);

        this.add.text(
            PLAYER_PANEL_X + PLAYER_PANEL_W - 60,
            PLAYER_PANEL_Y + 12,
            `Lv.${level}`,
            { fontSize: '16px', color: COLOR_STRINGS.GREY }
        ).setDepth(DEPTH.UI);

        // HP section
        this.add.text(
            PLAYER_PANEL_X + 20,
            PLAYER_HP_BAR_Y - 2,
            'HP',
            { fontSize: '14px', color: COLOR_STRINGS.HEALTH, fontStyle: 'bold' }
        ).setDepth(DEPTH.UI);

        this.playerHpBarGfx = this.add.graphics().setDepth(DEPTH.UI);
        this.drawPlayerHpBar();

        this.playerHpValueText = this.add.text(
            PLAYER_HP_BAR_X + PLAYER_HP_BAR_W,
            PLAYER_HP_BAR_Y - 2,
            this.formatPlayerHp(),
            { fontSize: '13px', color: COLOR_STRINGS.WHITE }
        ).setOrigin(1, 0).setDepth(DEPTH.UI);

        // Energy (inner power) section
        this.add.text(
            PLAYER_PANEL_X + 20,
            PLAYER_ENERGY_BAR_Y - 2,
            '내공',
            { fontSize: '14px', color: COLOR_STRINGS.ENERGY, fontStyle: 'bold' }
        ).setDepth(DEPTH.UI);

        this.playerEnergyBarGfx = this.add.graphics().setDepth(DEPTH.UI);
        this.drawPlayerEnergyBar();

        this.playerEnergyValueText = this.add.text(
            PLAYER_ENERGY_BAR_X + PLAYER_ENERGY_BAR_W,
            PLAYER_ENERGY_BAR_Y - 2,
            this.formatPlayerEnergy(),
            { fontSize: '13px', color: COLOR_STRINGS.WHITE }
        ).setOrigin(1, 0).setDepth(DEPTH.UI);
    }

    /**
     * Create placeholder colored rectangles for the enemy and player.
     * Each rectangle displays the first character of their name as a label.
     */
    private createBattleSprites(): void {
        // Enemy sprite: positioned at the right side of the battle field
        this.enemySprite = this.add.rectangle(880, 170, 140, 140, COLORS.HUBAEKJE, 1);
        this.enemySprite.setStrokeStyle(3, COLORS.WHITE, 0.6);
        this.enemySprite.setDepth(DEPTH.ENEMIES);

        this.add.text(880, 170, this.battleData.enemyNameKo.charAt(0), {
            fontSize: '48px',
            color: COLOR_STRINGS.WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.ENEMIES + 1);

        // Player sprite: positioned at the left side of the battle field
        this.playerSprite = this.add.rectangle(300, 310, 120, 120, COLORS.PLAYER1_ACCENT, 1);
        this.playerSprite.setStrokeStyle(3, COLORS.WHITE, 0.6);
        this.playerSprite.setDepth(DEPTH.PLAYER);

        this.add.text(300, 310, PLAYER_NAME.charAt(0), {
            fontSize: '42px',
            color: COLOR_STRINGS.WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH.PLAYER + 1);
    }

    /**
     * Create the battle log panel in the bottom-left area.
     * Displays the most recent battle action messages.
     */
    private createBattleLog(): void {
        const bg = this.add.graphics();
        bg.fillStyle(0x0a0a1a, 0.9);
        bg.fillRoundedRect(LOG_PANEL_X, LOG_PANEL_Y, LOG_PANEL_W, LOG_PANEL_H, 8);
        bg.lineStyle(2, COLORS.WHITE, 0.3);
        bg.strokeRoundedRect(LOG_PANEL_X, LOG_PANEL_Y, LOG_PANEL_W, LOG_PANEL_H, 8);
        bg.setDepth(DEPTH.UI);

        this.battleLogText = this.add.text(
            LOG_PANEL_X + 20,
            LOG_PANEL_Y + 15,
            '',
            {
                fontSize: '18px',
                color: COLOR_STRINGS.WHITE,
                lineSpacing: 8,
                wordWrap: { width: LOG_PANEL_W - 40 },
            }
        ).setDepth(DEPTH.UI);
    }

    /**
     * Create the battle action menu in the bottom-right area.
     * Menu items are arranged in a 2x2 grid:
     *   - 공격 (Attack)  |  무공 (Skill)
     *   - 약초 (Item)    |  도주 (Run)
     */
    private createBattleMenu(): void {
        const bg = this.add.graphics();
        bg.fillStyle(0x0a0a1a, 0.9);
        bg.fillRoundedRect(MENU_PANEL_X, MENU_PANEL_Y, MENU_PANEL_W, MENU_PANEL_H, 8);
        bg.lineStyle(2, COLORS.WHITE, 0.3);
        bg.strokeRoundedRect(MENU_PANEL_X, MENU_PANEL_Y, MENU_PANEL_W, MENU_PANEL_H, 8);
        bg.setDepth(DEPTH.UI);

        this.add.text(MENU_PANEL_X + 20, MENU_PANEL_Y + 10, '행동 선택', {
            fontSize: '16px',
            color: COLOR_STRINGS.GREY,
        }).setDepth(DEPTH.UI);

        this.menuTexts = [];
        for (let i = 0; i < MENU_LABELS.length; i++) {
            const col = i % MENU_COLS;
            const row = Math.floor(i / MENU_COLS);
            const x = MENU_ITEM_START_X + col * MENU_COL_GAP;
            const y = MENU_ITEM_START_Y + row * MENU_ROW_GAP;

            const text = this.add.text(x, y, MENU_LABELS[i], {
                fontSize: '28px',
                color: COLOR_STRINGS.WHITE,
                fontStyle: 'bold',
            }).setDepth(DEPTH.UI);

            this.menuTexts.push(text);
        }

        this.highlightMenuItem(0);
    }

    /**
     * Register keyboard keys for battle menu navigation and confirmation.
     */
    private setupInput(): void {
        if (!this.input.keyboard) {
            Logger.error('BattleScene', 'Keyboard input not available');
            return;
        }

        this.cursorKeys = this.input.keyboard.createCursorKeys();
        this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    // ========================================================================
    // HP / Energy Bar Drawing
    // ========================================================================

    /**
     * Redraw the enemy HP bar based on the current displayed HP value.
     * The bar smoothly transitions via the displayedEnemyHp tween target.
     */
    private drawEnemyHpBar(): void {
        const gfx = this.enemyHpBarGfx;
        gfx.clear();

        // Background track
        gfx.fillStyle(COLORS.HEALTH_BAR_BG, 1);
        gfx.fillRoundedRect(ENEMY_HP_BAR_X, ENEMY_HP_BAR_Y, ENEMY_HP_BAR_W, ENEMY_HP_BAR_H, 4);

        // Filled portion
        const ratio = Math.max(0, this.displayedEnemyHp / this.enemyMaxHp);
        const fillW = Math.floor(ENEMY_HP_BAR_W * ratio);
        if (fillW > 0) {
            const barColor = this.getHpBarColor(ratio);
            gfx.fillStyle(barColor, 1);
            gfx.fillRoundedRect(ENEMY_HP_BAR_X, ENEMY_HP_BAR_Y, fillW, ENEMY_HP_BAR_H, 4);
        }
    }

    /**
     * Redraw the player HP bar based on the current displayed HP value.
     */
    private drawPlayerHpBar(): void {
        const gfx = this.playerHpBarGfx;
        gfx.clear();

        const maxHp = this.gameState.getMaxHealth();

        // Background track
        gfx.fillStyle(COLORS.HEALTH_BAR_BG, 1);
        gfx.fillRoundedRect(PLAYER_HP_BAR_X, PLAYER_HP_BAR_Y, PLAYER_HP_BAR_W, PLAYER_HP_BAR_H, 4);

        // Filled portion
        const ratio = Math.max(0, this.displayedPlayerHp / maxHp);
        const fillW = Math.floor(PLAYER_HP_BAR_W * ratio);
        if (fillW > 0) {
            const barColor = this.getHpBarColor(ratio);
            gfx.fillStyle(barColor, 1);
            gfx.fillRoundedRect(PLAYER_HP_BAR_X, PLAYER_HP_BAR_Y, fillW, PLAYER_HP_BAR_H, 4);
        }
    }

    /**
     * Redraw the player energy bar based on current energy values.
     */
    private drawPlayerEnergyBar(): void {
        const gfx = this.playerEnergyBarGfx;
        gfx.clear();

        const energy = this.gameState.getEnergy();
        const maxEnergy = this.gameState.getMaxEnergy();

        // Background track
        gfx.fillStyle(COLORS.HEALTH_BAR_BG, 1);
        gfx.fillRoundedRect(
            PLAYER_ENERGY_BAR_X, PLAYER_ENERGY_BAR_Y,
            PLAYER_ENERGY_BAR_W, PLAYER_ENERGY_BAR_H, 3
        );

        // Filled portion
        const ratio = maxEnergy > 0 ? energy / maxEnergy : 0;
        const fillW = Math.floor(PLAYER_ENERGY_BAR_W * ratio);
        if (fillW > 0) {
            gfx.fillStyle(COLORS.ENERGY_BAR, 1);
            gfx.fillRoundedRect(
                PLAYER_ENERGY_BAR_X, PLAYER_ENERGY_BAR_Y,
                fillW, PLAYER_ENERGY_BAR_H, 3
            );
        }
    }

    /**
     * Determine HP bar color based on the remaining ratio.
     * Green when healthy, yellow at half, red when critical.
     * @param ratio - Current HP ratio (0 to 1)
     * @returns Numeric color value for the bar fill
     */
    private getHpBarColor(ratio: number): number {
        if (ratio > 0.5) {
            return 0x4caf50; // green
        } else if (ratio > 0.2) {
            return 0xffb300; // yellow/amber
        }
        return COLORS.HEALTH_BAR; // red (critical)
    }

    // ========================================================================
    // Input Handling
    // ========================================================================

    /**
     * Process arrow key navigation and confirm key presses for the battle menu.
     * Uses JustDown checks to prevent repeated inputs from held keys.
     */
    private handleMenuInput(): void {
        const oldIndex = this.menuIndex;
        const col = this.menuIndex % MENU_COLS;
        const row = Math.floor(this.menuIndex / MENU_COLS);

        if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.left) && col > 0) {
            this.menuIndex -= 1;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.right) && col < MENU_COLS - 1) {
            this.menuIndex += 1;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.up) && row > 0) {
            this.menuIndex -= MENU_COLS;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.down) && row < 1) {
            this.menuIndex += MENU_COLS;
        }

        if (this.menuIndex !== oldIndex) {
            this.highlightMenuItem(this.menuIndex);
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.keyZ) ||
            Phaser.Input.Keyboard.JustDown(this.keyEnter)
        ) {
            this.executeAction(this.menuIndex);
        }
    }

    /**
     * Update menu text styles to highlight the selected item with a cursor
     * indicator and gold color, resetting all other items to default.
     * @param index - The menu index to highlight (0-3)
     */
    private highlightMenuItem(index: number): void {
        for (let i = 0; i < this.menuTexts.length; i++) {
            if (i === index) {
                this.menuTexts[i].setColor(COLOR_STRINGS.GOLD);
                this.menuTexts[i].setText(`▶ ${MENU_LABELS[i]}`);
            } else {
                this.menuTexts[i].setColor(COLOR_STRINGS.WHITE);
                this.menuTexts[i].setText(`   ${MENU_LABELS[i]}`);
            }
        }
    }

    // ========================================================================
    // Battle Actions
    // ========================================================================

    /**
     * Route the selected menu index to the corresponding battle action.
     * @param index - 0: Attack, 1: Skill, 2: Item, 3: Run
     */
    private executeAction(index: number): void {
        this.isAnimating = true;
        this.isPlayerTurn = false;

        switch (index) {
            case 0:
                this.performAttack();
                break;
            case 1:
                this.performSkill();
                break;
            case 2:
                this.performItem();
                break;
            case 3:
                this.performRun();
                break;
            default:
                Logger.warn('BattleScene', `Unknown menu action index: ${index}`);
                this.isAnimating = false;
                this.isPlayerTurn = true;
                break;
        }
    }

    /**
     * Execute a standard physical attack against the enemy.
     * Damage = max(1, playerAttack - enemyDefense), with critical hit chance.
     */
    private performAttack(): void {
        const playerAtk = this.gameState.getAttackPower();
        const enemyDef = this.battleData.enemyDef;
        const { damage, isCrit } = this.calculateDamage(playerAtk, enemyDef);

        const critText = isCrit ? ' 회심의 일격!' : '';
        this.addLogMessage(
            `${PLAYER_NAME}의 공격!${critText} ${this.battleData.enemyNameKo}에게 ${damage}의 피해!`
        );

        this.flashSprite(this.enemySprite, () => {
            this.applyDamageToEnemy(damage);
        });
    }

    /**
     * Execute a martial arts skill attack dealing double damage.
     * Costs SKILL_ENERGY_COST energy. Fails gracefully if energy is insufficient.
     */
    private performSkill(): void {
        const currentEnergy = this.gameState.getEnergy();

        if (currentEnergy < SKILL_ENERGY_COST) {
            this.addLogMessage('내공이 부족하다!');
            this.isAnimating = false;
            this.isPlayerTurn = true;
            return;
        }

        // Consume energy
        this.gameState.setEnergy(currentEnergy - SKILL_ENERGY_COST);
        this.drawPlayerEnergyBar();
        this.playerEnergyValueText.setText(this.formatPlayerEnergy());

        const playerAtk = this.gameState.getAttackPower();
        const enemyDef = this.battleData.enemyDef;
        const { damage, isCrit } = this.calculateDamage(
            playerAtk * SKILL_DAMAGE_MULTIPLIER,
            enemyDef
        );

        const critText = isCrit ? ' 회심의 일격!' : '';
        this.addLogMessage(
            `${PLAYER_NAME}의 무공 발동!${critText} ${this.battleData.enemyNameKo}에게 ${damage}의 피해!`
        );

        this.flashSprite(this.enemySprite, () => {
            this.applyDamageToEnemy(damage);
        });
    }

    /**
     * Use a potion (약초) from the inventory to restore HP.
     * Heals POTION_HEAL_AMOUNT HP. Fails if no potions are available.
     */
    private performItem(): void {
        const potionCount = this.gameState.getItemCount('potion');

        if (potionCount <= 0) {
            this.addLogMessage('약초가 없다!');
            this.isAnimating = false;
            this.isPlayerTurn = true;
            return;
        }

        this.gameState.removeItem('potion', 1);

        const previousHp = this.gameState.getHealth();
        const maxHp = this.gameState.getMaxHealth();
        const healAmount = Math.min(POTION_HEAL_AMOUNT, maxHp - previousHp);
        this.gameState.setHealth(previousHp + healAmount);

        this.addLogMessage(`약초를 사용했다! HP가 ${healAmount} 회복되었다!`);

        this.animatePlayerHpBar(this.gameState.getHealth(), () => {
            this.startEnemyTurn();
        });
    }

    /**
     * Attempt to flee from the battle.
     * RUN_CHANCE probability of success. On failure, the enemy gets a turn.
     */
    private performRun(): void {
        const escaped = Math.random() < RUN_CHANCE;

        if (escaped) {
            this.addLogMessage('성공적으로 도주했다!');
            this.isBattleOver = true;

            this.time.delayedCall(END_BATTLE_DELAY, () => {
                this.endBattle(this.returnScene);
            });
        } else {
            this.addLogMessage('도주에 실패했다!');
            this.startEnemyTurn();
        }
    }

    // ========================================================================
    // Damage Calculation
    // ========================================================================

    /**
     * Calculate final damage with base formula and critical hit check.
     * @param attackPower - Attacker's attack stat
     * @param defensePower - Defender's defense stat
     * @returns Object containing the final damage amount and whether it was a critical hit
     */
    private calculateDamage(
        attackPower: number,
        defensePower: number
    ): { damage: number; isCrit: boolean } {
        const baseDamage = Math.max(1, attackPower - defensePower);
        const isCrit = Math.random() < COMBAT.CRIT_CHANCE;
        const damage = isCrit
            ? Math.floor(baseDamage * COMBAT.CRIT_MULTIPLIER)
            : baseDamage;

        return { damage, isCrit };
    }

    // ========================================================================
    // Damage Application & Turn Flow
    // ========================================================================

    /**
     * Apply damage to the enemy, animate the HP bar, and check for defeat.
     * If the enemy survives, proceed to the enemy's turn.
     * @param damage - Amount of HP to subtract from the enemy
     */
    private applyDamageToEnemy(damage: number): void {
        this.enemyCurrentHp = Math.max(0, this.enemyCurrentHp - damage);

        this.animateEnemyHpBar(this.enemyCurrentHp, () => {
            if (this.enemyCurrentHp <= 0) {
                this.showVictory();
            } else {
                this.startEnemyTurn();
            }
        });
    }

    /**
     * Apply damage to the player, animate the HP bar, and check for defeat.
     * If the player survives, control returns to the player's turn.
     * @param damage - Amount of HP to subtract from the player
     */
    private applyDamageToPlayer(damage: number): void {
        const currentHp = this.gameState.getHealth();
        const newHp = Math.max(0, currentHp - damage);
        this.gameState.setHealth(newHp);

        this.animatePlayerHpBar(newHp, () => {
            if (newHp <= 0) {
                this.showDefeat();
            } else {
                this.isAnimating = false;
                this.isPlayerTurn = true;
            }
        });
    }

    /**
     * Begin the enemy's turn after a brief delay.
     * The enemy performs a standard attack against the player.
     */
    private startEnemyTurn(): void {
        this.time.delayedCall(ENEMY_TURN_DELAY, () => {
            this.performEnemyAttack();
        });
    }

    /**
     * Execute the enemy's attack against the player.
     * Damage = max(1, enemyAtk - playerDefense), with critical hit chance.
     */
    private performEnemyAttack(): void {
        const enemyAtk = this.battleData.enemyAtk;
        const playerDef = this.gameState.getDefense();
        const { damage, isCrit } = this.calculateDamage(enemyAtk, playerDef);

        const critText = isCrit ? ' 회심의 일격!' : '';
        this.addLogMessage(
            `${this.battleData.enemyNameKo}의 공격!${critText} ${PLAYER_NAME}에게 ${damage}의 피해!`
        );

        this.flashSprite(this.playerSprite, () => {
            this.applyDamageToPlayer(damage);
        });
    }

    // ========================================================================
    // Animations
    // ========================================================================

    /**
     * Flash a sprite by rapidly toggling its alpha to indicate a hit.
     * Calls the provided callback when the animation completes.
     * @param sprite - The rectangle sprite to flash
     * @param onComplete - Callback invoked after the flash finishes
     */
    private flashSprite(
        sprite: Phaser.GameObjects.Rectangle,
        onComplete: () => void
    ): void {
        this.tweens.add({
            targets: sprite,
            alpha: 0.2,
            duration: FLASH_DURATION,
            yoyo: true,
            repeat: FLASH_REPEAT_COUNT,
            onComplete: () => {
                sprite.setAlpha(1);
                onComplete();
            },
        });
    }

    /**
     * Smoothly animate the enemy HP bar from its current displayed value
     * to the target HP, then invoke a callback.
     * @param targetHp - The HP value to animate toward
     * @param onComplete - Callback invoked after the animation finishes
     */
    private animateEnemyHpBar(targetHp: number, onComplete: () => void): void {
        const tweenTarget = { value: this.displayedEnemyHp };

        this.tweens.add({
            targets: tweenTarget,
            value: targetHp,
            duration: HP_BAR_TWEEN_DURATION,
            ease: 'Power2',
            onUpdate: () => {
                this.displayedEnemyHp = tweenTarget.value;
                this.drawEnemyHpBar();
                this.enemyHpValueText.setText(
                    `${Math.ceil(this.displayedEnemyHp)}/${this.enemyMaxHp}`
                );
            },
            onComplete: () => {
                this.displayedEnemyHp = targetHp;
                this.drawEnemyHpBar();
                this.enemyHpValueText.setText(
                    `${Math.max(0, targetHp)}/${this.enemyMaxHp}`
                );
                onComplete();
            },
        });
    }

    /**
     * Smoothly animate the player HP bar from its current displayed value
     * to the target HP, then invoke a callback.
     * @param targetHp - The HP value to animate toward
     * @param onComplete - Callback invoked after the animation finishes
     */
    private animatePlayerHpBar(targetHp: number, onComplete: () => void): void {
        const tweenTarget = { value: this.displayedPlayerHp };

        this.tweens.add({
            targets: tweenTarget,
            value: targetHp,
            duration: HP_BAR_TWEEN_DURATION,
            ease: 'Power2',
            onUpdate: () => {
                this.displayedPlayerHp = tweenTarget.value;
                this.drawPlayerHpBar();
                this.playerHpValueText.setText(
                    `${Math.ceil(this.displayedPlayerHp)}/${this.gameState.getMaxHealth()}`
                );
            },
            onComplete: () => {
                this.displayedPlayerHp = targetHp;
                this.drawPlayerHpBar();
                this.playerHpValueText.setText(this.formatPlayerHp());
                onComplete();
            },
        });
    }

    // ========================================================================
    // Battle Resolution
    // ========================================================================

    /**
     * Handle victory when the enemy's HP reaches zero.
     * Awards experience and gold, displays results, and transitions back
     * to the previous scene after a delay.
     */
    private showVictory(): void {
        this.isBattleOver = true;

        // Calculate gold reward within the specified range
        const [minGold, maxGold] = this.battleData.enemyGold;
        const goldReward = Math.floor(
            Math.random() * (maxGold - minGold + 1)
        ) + minGold;

        const expReward = this.battleData.enemyExp;

        this.addLogMessage(`${this.battleData.enemyNameKo}을(를) 쓰러뜨렸다!`);

        this.time.delayedCall(600, () => {
            this.addLogMessage(`${expReward} 경험치와 ${goldReward} 금을 획득했다!`);

            this.gameState.addExp(expReward);
            this.gameState.addGold(goldReward);

            // Fade out the enemy sprite
            this.tweens.add({
                targets: this.enemySprite,
                alpha: 0,
                y: this.enemySprite.y - 30,
                duration: 800,
                ease: 'Power2',
            });

            this.time.delayedCall(END_BATTLE_DELAY, () => {
                this.endBattle(this.returnScene);
            });
        });
    }

    /**
     * Handle defeat when the player's HP reaches zero.
     * Shows a defeat message and transitions to the main menu.
     */
    private showDefeat(): void {
        this.isBattleOver = true;

        this.addLogMessage('쓰러졌다...');

        // Fade the player sprite
        this.tweens.add({
            targets: this.playerSprite,
            alpha: 0,
            y: this.playerSprite.y + 20,
            duration: 800,
            ease: 'Power2',
        });

        this.time.delayedCall(1200, () => {
            this.addLogMessage('눈앞이 어두워진다...');

            this.time.delayedCall(END_BATTLE_DELAY, () => {
                this.endBattle(SCENES.MAIN_MENU);
            });
        });
    }

    /**
     * Clean up and transition to the specified scene with a fade-out effect.
     * @param targetScene - The scene key to transition to
     */
    private async endBattle(targetScene: string): Promise<void> {
        Logger.info('BattleScene', `Battle ended, transitioning to ${targetScene}`);
        await this.transitionTo(targetScene);
    }

    // ========================================================================
    // Battle Log
    // ========================================================================

    /**
     * Append a message to the battle log and update the displayed text.
     * Keeps only the most recent MAX_LOG_LINES messages visible.
     * @param message - The text to display in the battle log
     */
    private addLogMessage(message: string): void {
        this.logMessages.push(message);

        // Keep only the most recent messages
        if (this.logMessages.length > MAX_LOG_LINES) {
            this.logMessages.shift();
        }

        this.battleLogText.setText(this.logMessages.join('\n'));
        Logger.debug('BattleScene', `Log: ${message}`);
    }

    // ========================================================================
    // Formatting Helpers
    // ========================================================================

    /**
     * Format the player's current and maximum HP as a display string.
     * @returns Formatted HP string (e.g. "85/100")
     */
    private formatPlayerHp(): string {
        return `${this.gameState.getHealth()}/${this.gameState.getMaxHealth()}`;
    }

    /**
     * Format the player's current and maximum energy as a display string.
     * @returns Formatted energy string (e.g. "60/100")
     */
    private formatPlayerEnergy(): string {
        return `${this.gameState.getEnergy()}/${this.gameState.getMaxEnergy()}`;
    }
}
