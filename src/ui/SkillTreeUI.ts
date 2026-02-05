import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH, COLOR_STRINGS } from '../utils/Constants';
import { SkillTreeSystem } from '../systems/SkillTreeSystem';
import { Logger } from '../utils/Logger';

/** Skill tree category tab definition */
interface ICategoryTab {
    key: string;
    nameKo: string;
    color: string;
}

const CATEGORIES: ICategoryTab[] = [
    { key: 'combat', nameKo: '전투', color: '#ff4444' },
    { key: 'defense', nameKo: '방어', color: '#4488ff' },
    { key: 'utility', nameKo: '보조', color: '#44ff88' },
    { key: 'special', nameKo: '특수', color: '#ffaa44' },
];

/**
 * Skill tree UI panel for allocating skill points.
 */
export class SkillTreeUI extends Phaser.GameObjects.Container {
    private skillTree: SkillTreeSystem;
    private container: Phaser.GameObjects.Container;
    private selectedCategory: string = 'combat';
    private selectedSkillIndex: number = 0;
    private isVisible: boolean = false;

    private panelBg!: Phaser.GameObjects.Rectangle;
    private titleText!: Phaser.GameObjects.Text;
    private pointsText!: Phaser.GameObjects.Text;
    private skillNodes: Phaser.GameObjects.Container[] = [];
    private descriptionText!: Phaser.GameObjects.Text;
    private categoryTabs: Phaser.GameObjects.Container[] = [];

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.skillTree = SkillTreeSystem.getInstance();
        this.container = scene.add.container(0, 0);
        this.add(this.container);

        this.createPanel();
        this.setVisible(false);
        this.setScrollFactor(0);
        this.setDepth(DEPTH.UI + 30);
    }

    /** Create the skill tree panel */
    private createPanel(): void {
        const panelW = 800;
        const panelH = 550;
        const px = GAME_WIDTH / 2;
        const py = GAME_HEIGHT / 2;

        // Dark background
        this.panelBg = this.scene.add.rectangle(px, py, panelW, panelH, 0x111122, 0.95);
        this.panelBg.setStrokeStyle(2, 0x445566);
        this.container.add(this.panelBg);

        // Title
        this.titleText = this.scene.add.text(px, py - panelH / 2 + 30, '무공 수련 (스킬 트리)', {
            fontSize: '24px',
            color: COLOR_STRINGS.GOLD,
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.container.add(this.titleText);

        // Skill points display
        this.pointsText = this.scene.add.text(px + panelW / 2 - 20, py - panelH / 2 + 30, '', {
            fontSize: '18px',
            color: '#88ccff',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(1, 0.5);
        this.container.add(this.pointsText);

        // Category tabs
        const tabStartX = px - panelW / 2 + 80;
        const tabY = py - panelH / 2 + 65;
        CATEGORIES.forEach((cat, i) => {
            const tabContainer = this.scene.add.container(tabStartX + i * 180, tabY);

            const tabBg = this.scene.add.rectangle(0, 0, 160, 30, 0x222244, 0.8);
            tabBg.setStrokeStyle(1, 0x334455);
            tabContainer.add(tabBg);

            const tabText = this.scene.add.text(0, 0, cat.nameKo, {
                fontSize: '16px',
                color: cat.color,
                stroke: '#000000',
                strokeThickness: 1,
            }).setOrigin(0.5);
            tabContainer.add(tabText);

            tabBg.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.selectedCategory = cat.key;
                    this.selectedSkillIndex = 0;
                    this.refreshSkills();
                });

            this.categoryTabs.push(tabContainer);
            this.container.add(tabContainer);
        });

        // Description area
        this.descriptionText = this.scene.add.text(
            px - panelW / 2 + 30,
            py + panelH / 2 - 100,
            '',
            {
                fontSize: '14px',
                color: '#cccccc',
                wordWrap: { width: panelW - 60 },
                stroke: '#000000',
                strokeThickness: 1,
            }
        );
        this.container.add(this.descriptionText);

        // Close hint
        const closeHint = this.scene.add.text(px, py + panelH / 2 - 20, 'ESC: 닫기  |  Z: 습득  |  ←→: 카테고리  |  ↑↓: 선택', {
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(0.5);
        this.container.add(closeHint);
    }

    /** Refresh the skill node display */
    private refreshSkills(): void {
        // Clear existing nodes
        this.skillNodes.forEach(n => n.destroy());
        this.skillNodes = [];

        const skills = this.skillTree.getSkillsByCategory(
            this.selectedCategory as 'combat' | 'defense' | 'utility' | 'special'
        );

        const panelW = 800;
        const startX = GAME_WIDTH / 2 - panelW / 2 + 60;
        const startY = GAME_HEIGHT / 2 - 550 / 2 + 110;

        skills.forEach((skill, i) => {
            const nodeContainer = this.scene.add.container(startX, startY + i * 65);

            const level = this.skillTree.getSkillLevel(skill.id);
            const canUpgrade = this.skillTree.canUpgrade(skill.id);
            const isSelected = i === this.selectedSkillIndex;

            // Node background
            const bgColor = isSelected ? 0x333366 : 0x1a1a33;
            const borderColor = canUpgrade ? 0xffd700 : (level > 0 ? 0x44ff88 : 0x445566);
            const bg = this.scene.add.rectangle(panelW / 2 - 60, 0, panelW - 120, 55, bgColor, 0.9);
            bg.setStrokeStyle(isSelected ? 2 : 1, borderColor);
            nodeContainer.add(bg);

            // Skill icon placeholder
            const iconColor = level > 0 ? 0xffd700 : 0x555555;
            const icon = this.scene.add.rectangle(30, 0, 40, 40, iconColor, 0.8);
            icon.setStrokeStyle(1, 0x888888);
            nodeContainer.add(icon);

            // Skill name
            const nameColor = level > 0 ? '#ffffff' : '#888888';
            const name = this.scene.add.text(60, -12, skill.nameKo, {
                fontSize: '16px',
                color: nameColor,
                fontStyle: level > 0 ? 'bold' : 'normal',
            });
            nodeContainer.add(name);

            // Level indicator
            const levelStr = `Lv.${level}/${skill.maxLevel}`;
            const levelColor = level >= skill.maxLevel ? '#44ff88' : '#aaaaaa';
            const levelText = this.scene.add.text(panelW - 180, -12, levelStr, {
                fontSize: '14px',
                color: levelColor,
            });
            nodeContainer.add(levelText);

            // Cost
            if (level < skill.maxLevel) {
                const costText = this.scene.add.text(panelW - 180, 8, `비용: ${skill.cost}`, {
                    fontSize: '12px',
                    color: canUpgrade ? '#ffdd44' : '#666666',
                });
                nodeContainer.add(costText);
            }

            // Short description
            const desc = this.scene.add.text(60, 8, skill.descriptionKo, {
                fontSize: '12px',
                color: '#999999',
            });
            nodeContainer.add(desc);

            // Level dots
            for (let j = 0; j < skill.maxLevel; j++) {
                const dotColor = j < level ? 0xffd700 : 0x333355;
                const dot = this.scene.add.circle(panelW - 140 + j * 14, 15, 4, dotColor);
                nodeContainer.add(dot);
            }

            bg.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.selectedSkillIndex = i;
                    this.refreshSkills();
                })
                .on('pointerdblclick', () => {
                    this.upgradeSelected();
                });

            this.skillNodes.push(nodeContainer);
            this.container.add(nodeContainer);
        });

        // Update points text
        this.pointsText.setText(`스킬 포인트: ${this.skillTree.getSkillPoints()}`);

        // Update tab highlights
        CATEGORIES.forEach((cat, i) => {
            const tabBg = this.categoryTabs[i].getAt(0) as Phaser.GameObjects.Rectangle;
            if (cat.key === this.selectedCategory) {
                tabBg.setFillStyle(0x334466, 1);
            } else {
                tabBg.setFillStyle(0x222244, 0.8);
            }
        });

        // Update description
        const currentSkills = this.skillTree.getSkillsByCategory(
            this.selectedCategory as 'combat' | 'defense' | 'utility' | 'special'
        );
        if (currentSkills[this.selectedSkillIndex]) {
            const skill = currentSkills[this.selectedSkillIndex];
            const prereqNames = skill.prerequisites.map(pId => {
                const ps = this.skillTree.getAllSkills().find(s => s.id === pId);
                return ps ? ps.nameKo : pId;
            });
            const prereqStr = prereqNames.length > 0 ? `선행: ${prereqNames.join(', ')}` : '선행: 없음';
            this.descriptionText.setText(`${skill.descriptionKo}\n${prereqStr}`);
        }
    }

    /** Upgrade the currently selected skill */
    public upgradeSelected(): boolean {
        const skills = this.skillTree.getSkillsByCategory(
            this.selectedCategory as 'combat' | 'defense' | 'utility' | 'special'
        );
        const skill = skills[this.selectedSkillIndex];
        if (!skill) return false;

        const result = this.skillTree.upgrade(skill.id);
        if (result) {
            Logger.info('SkillTreeUI', `Upgraded: ${skill.nameKo}`);
        }
        this.refreshSkills();
        return result;
    }

    /** Move selection up/down */
    public moveSelection(direction: number): void {
        const skills = this.skillTree.getSkillsByCategory(
            this.selectedCategory as 'combat' | 'defense' | 'utility' | 'special'
        );
        this.selectedSkillIndex = (this.selectedSkillIndex + direction + skills.length) % skills.length;
        this.refreshSkills();
    }

    /** Switch category */
    public switchCategory(direction: number): void {
        const idx = CATEGORIES.findIndex(c => c.key === this.selectedCategory);
        const newIdx = (idx + direction + CATEGORIES.length) % CATEGORIES.length;
        this.selectedCategory = CATEGORIES[newIdx].key;
        this.selectedSkillIndex = 0;
        this.refreshSkills();
    }

    /** Show the skill tree panel */
    public show(): void {
        this.isVisible = true;
        this.setVisible(true);
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 200,
        });
        this.refreshSkills();
    }

    /** Hide the skill tree panel */
    public hide(): void {
        this.isVisible = false;
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 150,
            onComplete: () => this.setVisible(false),
        });
    }

    /** Whether the panel is currently visible */
    public getIsVisible(): boolean {
        return this.isVisible;
    }
}
