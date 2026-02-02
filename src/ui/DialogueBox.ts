import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_STRINGS } from '../utils/Constants';
import { IDialogueLine } from '../types/dialogue.types';

/**
 * Dialogue box UI with typewriter text, speaker name, and choice buttons.
 */
export class DialogueBox extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private nameBackground: Phaser.GameObjects.Graphics;
    private nameText: Phaser.GameObjects.Text;
    private dialogueText: Phaser.GameObjects.Text;
    private continueIndicator: Phaser.GameObjects.Text;
    private choiceButtons: Phaser.GameObjects.Container[] = [];

    private isTyping: boolean = false;
    private fullText: string = '';
    private currentCharIndex: number = 0;
    private typeTimer: Phaser.Time.TimerEvent | null = null;

    private readonly BOX_WIDTH = 1000;
    private readonly BOX_HEIGHT = 160;
    private readonly BOX_X = GAME_WIDTH / 2;
    private readonly BOX_Y = GAME_HEIGHT - 100;
    private readonly TYPE_SPEED = 30; // ms per character

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        // Dialogue box background
        this.background = scene.add.graphics();
        this.background.fillStyle(0x111111, 0.9);
        this.background.fillRoundedRect(
            this.BOX_X - this.BOX_WIDTH / 2,
            this.BOX_Y - this.BOX_HEIGHT / 2,
            this.BOX_WIDTH,
            this.BOX_HEIGHT,
            12
        );
        this.background.lineStyle(2, 0x444444);
        this.background.strokeRoundedRect(
            this.BOX_X - this.BOX_WIDTH / 2,
            this.BOX_Y - this.BOX_HEIGHT / 2,
            this.BOX_WIDTH,
            this.BOX_HEIGHT,
            12
        );
        this.add(this.background);

        // Name box
        this.nameBackground = scene.add.graphics();
        this.nameBackground.fillStyle(0x222222, 0.95);
        this.nameBackground.fillRoundedRect(
            this.BOX_X - this.BOX_WIDTH / 2 + 20,
            this.BOX_Y - this.BOX_HEIGHT / 2 - 20,
            180,
            30,
            6
        );
        this.add(this.nameBackground);

        // Name text
        this.nameText = scene.add.text(
            this.BOX_X - this.BOX_WIDTH / 2 + 110,
            this.BOX_Y - this.BOX_HEIGHT / 2 - 12,
            '',
            { fontSize: '16px', color: COLOR_STRINGS.GOLD, fontStyle: 'bold' }
        ).setOrigin(0.5, 0.5);
        this.add(this.nameText);

        // Dialogue text
        this.dialogueText = scene.add.text(
            this.BOX_X - this.BOX_WIDTH / 2 + 30,
            this.BOX_Y - this.BOX_HEIGHT / 2 + 20,
            '',
            {
                fontSize: '18px',
                color: COLOR_STRINGS.WHITE,
                wordWrap: { width: this.BOX_WIDTH - 60 },
                lineSpacing: 6,
            }
        );
        this.add(this.dialogueText);

        // Continue indicator
        this.continueIndicator = scene.add.text(
            this.BOX_X + this.BOX_WIDTH / 2 - 30,
            this.BOX_Y + this.BOX_HEIGHT / 2 - 25,
            '▼',
            { fontSize: '16px', color: '#aaaaaa' }
        ).setOrigin(0.5);
        this.add(this.continueIndicator);

        // Blinking animation for continue indicator
        scene.tweens.add({
            targets: this.continueIndicator,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1,
        });

        this.setVisible(false);
        this.setScrollFactor(0);
        this.setDepth(200);
    }

    /** Show a dialogue line */
    public show(line: IDialogueLine): void {
        this.setVisible(true);
        this.clearChoices();

        // Update speaker name
        if (line.speakerName) {
            this.nameText.setText(line.speakerName);
            this.nameBackground.setVisible(true);
            this.nameText.setVisible(true);
        } else {
            this.nameBackground.setVisible(false);
            this.nameText.setVisible(false);
        }

        // Start typewriter effect
        this.startTyping(line.text);
        this.continueIndicator.setVisible(false);

        // Show choices after typing completes (if any)
        if (line.choices && line.choices.length > 0) {
            const totalTime = line.text.length * this.TYPE_SPEED + 300;
            this.scene.time.delayedCall(totalTime, () => {
                if (this.visible) {
                    this.showChoices(line.choices!.map((c, i) => ({ text: c.text, index: i })));
                }
            });
        }
    }

    /** Start typewriter text effect */
    private startTyping(text: string): void {
        this.fullText = text;
        this.currentCharIndex = 0;
        this.dialogueText.setText('');
        this.isTyping = true;

        if (this.typeTimer) this.typeTimer.remove();

        this.typeTimer = this.scene.time.addEvent({
            delay: this.TYPE_SPEED,
            callback: () => {
                if (this.currentCharIndex < this.fullText.length) {
                    this.currentCharIndex++;
                    this.dialogueText.setText(this.fullText.substring(0, this.currentCharIndex));
                } else {
                    this.isTyping = false;
                    this.continueIndicator.setVisible(true);
                    if (this.typeTimer) this.typeTimer.remove();
                }
            },
            repeat: this.fullText.length - 1,
        });
    }

    /** Skip typewriter and show full text */
    public finishTyping(): void {
        if (this.typeTimer) this.typeTimer.remove();
        this.dialogueText.setText(this.fullText);
        this.isTyping = false;
        this.continueIndicator.setVisible(true);
    }

    /** Check if currently typing */
    public getIsTyping(): boolean {
        return this.isTyping;
    }

    /** Check if choices are being displayed */
    public hasChoices(): boolean {
        return this.choiceButtons.length > 0;
    }

    /** Show choice buttons */
    private showChoices(choices: { text: string; index: number }[]): void {
        this.continueIndicator.setVisible(false);
        const startY = this.BOX_Y + this.BOX_HEIGHT / 2 + 10;

        choices.forEach((choice, i) => {
            const container = this.scene.add.container(this.BOX_X, startY + i * 38);

            const bg = this.scene.add.graphics();
            bg.fillStyle(0x222222, 0.9);
            bg.fillRoundedRect(-300, -15, 600, 32, 6);
            bg.lineStyle(1, 0x555555);
            bg.strokeRoundedRect(-300, -15, 600, 32, 6);

            const text = this.scene.add.text(0, 0, choice.text, {
                fontSize: '16px',
                color: COLOR_STRINGS.WHITE,
            }).setOrigin(0.5);

            container.add([bg, text]);
            container.setScrollFactor(0);
            container.setDepth(201);

            // Interactive
            const hitArea = this.scene.add.zone(0, 0, 600, 32)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => { text.setColor(COLOR_STRINGS.GOLD); })
                .on('pointerout', () => { text.setColor(COLOR_STRINGS.WHITE); })
                .on('pointerdown', () => {
                    this.scene.events.emit('dialogue_choice_selected', choice.index);
                });
            container.add(hitArea);

            this.choiceButtons.push(container);
        });
    }

    /** Clear choice buttons */
    private clearChoices(): void {
        this.choiceButtons.forEach(btn => btn.destroy());
        this.choiceButtons = [];
    }

    /** Hide the dialogue box */
    public hide(): void {
        this.setVisible(false);
        this.clearChoices();
        if (this.typeTimer) this.typeTimer.remove();
        this.isTyping = false;
    }

    /** Handle input (advance or finish typing) */
    public onInput(): void {
        if (!this.visible) return;

        if (this.isTyping) {
            this.finishTyping();
        } else if (this.choiceButtons.length === 0) {
            this.scene.events.emit('dialogue_advance');
        }
    }
}
