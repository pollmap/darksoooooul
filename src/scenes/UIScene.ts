import { BaseScene } from './BaseScene';
import { SCENES } from '../utils/Constants';
import { HUD } from '../ui/HUD';
import { DialogueBox } from '../ui/DialogueBox';
import { InventoryUI } from '../ui/InventoryUI';
import { MenuUI } from '../ui/MenuUI';
import { QuestLogUI } from '../ui/QuestLogUI';
import { WorldMapUI } from '../ui/WorldMapUI';
import { Logger } from '../utils/Logger';

type TActiveUI = 'none' | 'dialogue' | 'inventory' | 'menu' | 'questlog' | 'map';

/**
 * UI scene running in parallel with the game, handling all UI overlays.
 */
export class UIScene extends BaseScene {
    private hud!: HUD;
    private dialogueBox!: DialogueBox;
    private inventoryUI!: InventoryUI;
    private menuUI!: MenuUI;
    private questLogUI!: QuestLogUI;
    private worldMapUI!: WorldMapUI;
    private activeUI: TActiveUI = 'none';

    constructor() {
        super(SCENES.UI);
    }

    create(): void {
        Logger.info('UIScene', 'Creating UI elements');

        this.hud = new HUD(this);
        this.dialogueBox = new DialogueBox(this);
        this.inventoryUI = new InventoryUI(this);
        this.menuUI = new MenuUI(this);
        this.questLogUI = new QuestLogUI(this);
        this.worldMapUI = new WorldMapUI(this);

        this.setupInputListeners();
        this.setupGameEventListeners();
    }

    private setupInputListeners(): void {
        if (!this.input.keyboard) return;

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.activeUI === 'none') {
                this.openMenu();
            } else {
                this.closeAllUI();
            }
        });

        this.input.keyboard.on('keydown-I', () => {
            if (this.activeUI === 'none') this.openInventory();
            else if (this.activeUI === 'inventory') this.closeAllUI();
        });

        this.input.keyboard.on('keydown-M', () => {
            if (this.activeUI === 'none') this.openMap();
            else if (this.activeUI === 'map') this.closeAllUI();
        });

        this.input.keyboard.on('keydown-J', () => {
            if (this.activeUI === 'none') this.openQuestLog();
            else if (this.activeUI === 'questlog') this.closeAllUI();
        });

        // Dialogue input
        this.input.keyboard.on('keydown-SPACE', () => this.dialogueBox.onInput());
        this.input.keyboard.on('keydown-Z', () => this.dialogueBox.onInput());
        this.input.keyboard.on('keydown-ENTER', () => this.dialogueBox.onInput());

        // Menu navigation
        this.input.keyboard.on('keydown-UP', () => {
            if (this.activeUI === 'menu') this.menuUI.moveSelection(-1);
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            if (this.activeUI === 'menu') this.menuUI.moveSelection(1);
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.activeUI === 'menu') this.menuUI.confirmSelection();
        });
    }

    private setupGameEventListeners(): void {
        const gameScene = this.scene.get(SCENES.GAME);

        // Dialogue events
        this.events.on('show_dialogue_line', (line: unknown) => {
            this.activeUI = 'dialogue';
            this.dialogueBox.show(line as import('../types/dialogue.types').IDialogueLine);
            gameScene.events.emit('pause_game');
        });

        this.events.on('hide_dialogue', () => {
            this.dialogueBox.hide();
            this.activeUI = 'none';
            gameScene.events.emit('resume_game');
        });

        this.events.on('dialogue_advance', () => {
            // Forward to dialogue system in world scene
            gameScene.events.emit('dialogue_advance');
        });

        this.events.on('dialogue_choice_selected', (index: number) => {
            gameScene.events.emit('dialogue_choice_selected', index);
        });

        // Forward game events
        gameScene.events.on('return_to_menu', () => {
            this.scene.stop();
        });

        gameScene.events.on('travel_to_area', (areaId: string) => {
            this.worldMapUI.hide();
            this.activeUI = 'none';
        });
    }

    private openMenu(): void {
        this.activeUI = 'menu';
        this.menuUI.show();
        this.scene.get(SCENES.GAME).events.emit('pause_game');
    }

    private openInventory(): void {
        this.activeUI = 'inventory';
        this.inventoryUI.show();
        this.scene.get(SCENES.GAME).events.emit('pause_game');
    }

    private openMap(): void {
        this.activeUI = 'map';
        this.worldMapUI.show();
        this.scene.get(SCENES.GAME).events.emit('pause_game');
    }

    private openQuestLog(): void {
        this.activeUI = 'questlog';
        this.questLogUI.show();
        this.scene.get(SCENES.GAME).events.emit('pause_game');
    }

    private closeAllUI(): void {
        this.menuUI.hide();
        this.inventoryUI.hide();
        this.worldMapUI.hide();
        this.questLogUI.hide();
        this.dialogueBox.hide();
        this.activeUI = 'none';
        this.scene.get(SCENES.GAME).events.emit('resume_game');
    }
}
