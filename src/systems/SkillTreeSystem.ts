import { Logger } from '../utils/Logger';
import { GameState } from '../state/GameState';

/** Skill categories */
type TSkillCategory = 'combat' | 'defense' | 'utility' | 'special';

/** Individual skill definition */
interface ISkillNode {
    id: string;
    name: string;
    nameKo: string;
    description: string;
    descriptionKo: string;
    category: TSkillCategory;
    cost: number;
    maxLevel: number;
    prerequisites: string[];
    effects: ISkillEffect[];
    icon: string; // Texture key
}

/** Skill effect applied per level */
interface ISkillEffect {
    type: 'stat_bonus' | 'ability_unlock' | 'combat_modifier' | 'passive';
    stat?: string;
    value: number;
    description: string;
}

/** Skill tree definition - all available skills */
const SKILL_TREE: ISkillNode[] = [
    // ─── Combat Skills ──────────────────────────────────────────────
    {
        id: 'swift_strike',
        name: 'Swift Strike',
        nameKo: '속삭임 검',
        description: 'Increase attack speed by 15% per level',
        descriptionKo: '공격 속도 15% 증가 (레벨당)',
        category: 'combat',
        cost: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [{ type: 'stat_bonus', stat: 'attackSpeed', value: 0.15, description: '+15% attack speed' }],
        icon: 'skill_swift',
    },
    {
        id: 'power_blow',
        name: 'Power Blow',
        nameKo: '강타',
        description: 'Increase attack power by 10% per level',
        descriptionKo: '공격력 10% 증가 (레벨당)',
        category: 'combat',
        cost: 1,
        maxLevel: 5,
        prerequisites: [],
        effects: [{ type: 'stat_bonus', stat: 'attackPower', value: 0.10, description: '+10% attack power' }],
        icon: 'skill_power',
    },
    {
        id: 'combo_master',
        name: 'Combo Master',
        nameKo: '연환격',
        description: 'Extend combo window and add 4th hit',
        descriptionKo: '콤보 윈도우 증가 및 4타 추가',
        category: 'combat',
        cost: 3,
        maxLevel: 1,
        prerequisites: ['swift_strike', 'power_blow'],
        effects: [{ type: 'combat_modifier', value: 1, description: '+1 combo hit, wider combo window' }],
        icon: 'skill_combo',
    },
    {
        id: 'crit_focus',
        name: 'Critical Focus',
        nameKo: '급소 공격',
        description: 'Increase critical hit chance by 5% per level',
        descriptionKo: '치명타 확률 5% 증가 (레벨당)',
        category: 'combat',
        cost: 2,
        maxLevel: 3,
        prerequisites: ['power_blow'],
        effects: [{ type: 'stat_bonus', stat: 'critChance', value: 0.05, description: '+5% crit chance' }],
        icon: 'skill_crit',
    },
    {
        id: 'aerial_master',
        name: 'Aerial Master',
        nameKo: '공중 달인',
        description: 'Increase aerial attack damage by 50%',
        descriptionKo: '공중 공격 데미지 50% 증가',
        category: 'combat',
        cost: 2,
        maxLevel: 1,
        prerequisites: ['swift_strike'],
        effects: [{ type: 'combat_modifier', value: 0.5, description: '+50% aerial damage' }],
        icon: 'skill_aerial',
    },
    // ─── Defense Skills ─────────────────────────────────────────────
    {
        id: 'iron_skin',
        name: 'Iron Skin',
        nameKo: '철갑피',
        description: 'Increase defense by 2 per level',
        descriptionKo: '방어력 2 증가 (레벨당)',
        category: 'defense',
        cost: 1,
        maxLevel: 5,
        prerequisites: [],
        effects: [{ type: 'stat_bonus', stat: 'defense', value: 2, description: '+2 defense' }],
        icon: 'skill_iron',
    },
    {
        id: 'vitality',
        name: 'Vitality',
        nameKo: '활력',
        description: 'Increase max health by 20 per level',
        descriptionKo: '최대 체력 20 증가 (레벨당)',
        category: 'defense',
        cost: 1,
        maxLevel: 5,
        prerequisites: [],
        effects: [{ type: 'stat_bonus', stat: 'maxHealth', value: 20, description: '+20 max health' }],
        icon: 'skill_health',
    },
    {
        id: 'parry_master',
        name: 'Parry Master',
        nameKo: '패링 달인',
        description: 'Widen perfect parry window by 50%',
        descriptionKo: '퍼펙트 패링 윈도우 50% 증가',
        category: 'defense',
        cost: 3,
        maxLevel: 1,
        prerequisites: ['iron_skin'],
        effects: [{ type: 'combat_modifier', value: 0.5, description: '+50% perfect parry window' }],
        icon: 'skill_parry',
    },
    {
        id: 'dodge_extend',
        name: 'Phantom Dodge',
        nameKo: '그림자 회피',
        description: 'Extend dodge i-frames by 30% per level',
        descriptionKo: '회피 무적 시간 30% 증가 (레벨당)',
        category: 'defense',
        cost: 2,
        maxLevel: 2,
        prerequisites: [],
        effects: [{ type: 'stat_bonus', stat: 'dodgeIFrames', value: 0.3, description: '+30% dodge i-frames' }],
        icon: 'skill_dodge',
    },
    // ─── Utility Skills ─────────────────────────────────────────────
    {
        id: 'energy_flow',
        name: 'Energy Flow',
        nameKo: '기 순환',
        description: 'Increase energy regen by 20% per level',
        descriptionKo: '기력 회복 20% 증가 (레벨당)',
        category: 'utility',
        cost: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [{ type: 'stat_bonus', stat: 'energyRegen', value: 0.20, description: '+20% energy regen' }],
        icon: 'skill_energy',
    },
    {
        id: 'swift_heal',
        name: 'Swift Heal',
        nameKo: '급속 치유',
        description: 'Reduce heal cast time by 20% per level',
        descriptionKo: '회복 시전 시간 20% 감소 (레벨당)',
        category: 'utility',
        cost: 2,
        maxLevel: 3,
        prerequisites: ['energy_flow'],
        effects: [{ type: 'stat_bonus', stat: 'healSpeed', value: 0.20, description: '-20% heal cast time' }],
        icon: 'skill_swift_heal',
    },
    {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        nameKo: '보물 사냥꾼',
        description: 'Increase gold and item drop rate by 15% per level',
        descriptionKo: '골드 및 아이템 드롭률 15% 증가 (레벨당)',
        category: 'utility',
        cost: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [{ type: 'stat_bonus', stat: 'dropRate', value: 0.15, description: '+15% drop rate' }],
        icon: 'skill_treasure',
    },
    // ─── Special Skills ─────────────────────────────────────────────
    {
        id: 'dash_attack',
        name: 'Dash Strike',
        nameKo: '질풍 참격',
        description: 'Unlock dash attack (attack during dodge)',
        descriptionKo: '회피 중 공격 가능 (질풍 참격)',
        category: 'special',
        cost: 3,
        maxLevel: 1,
        prerequisites: ['swift_strike', 'dodge_extend'],
        effects: [{ type: 'ability_unlock', value: 1, description: 'Unlock dash attack' }],
        icon: 'skill_dash_attack',
    },
    {
        id: 'counter_strike',
        name: 'Counter Strike',
        nameKo: '반격',
        description: 'Auto-counter after perfect parry for 200% damage',
        descriptionKo: '퍼펙트 패링 후 자동 반격 (200% 데미지)',
        category: 'special',
        cost: 4,
        maxLevel: 1,
        prerequisites: ['parry_master', 'crit_focus'],
        effects: [{ type: 'ability_unlock', value: 1, description: 'Auto-counter after perfect parry' }],
        icon: 'skill_counter',
    },
    {
        id: 'berserker',
        name: 'Berserker',
        nameKo: '광전사',
        description: 'Below 30% HP: +50% attack power, -20% defense',
        descriptionKo: '체력 30% 미만: 공격력 +50%, 방어력 -20%',
        category: 'special',
        cost: 3,
        maxLevel: 1,
        prerequisites: ['power_blow', 'vitality'],
        effects: [{ type: 'passive', value: 1, description: 'Low HP power boost' }],
        icon: 'skill_berserk',
    },
];

/**
 * Skill tree system managing skill points, upgrades, and effects.
 */
export class SkillTreeSystem {
    private static instance: SkillTreeSystem;
    private skillLevels: Map<string, number> = new Map();
    private skillPoints: number = 0;
    private gameState: GameState;

    private constructor() {
        this.gameState = GameState.getInstance();
        // Initialize all skills at level 0
        SKILL_TREE.forEach(skill => {
            this.skillLevels.set(skill.id, 0);
        });
    }

    /** Get the singleton instance */
    public static getInstance(): SkillTreeSystem {
        if (!SkillTreeSystem.instance) {
            SkillTreeSystem.instance = new SkillTreeSystem();
        }
        return SkillTreeSystem.instance;
    }

    /** Get all skill definitions */
    public getAllSkills(): ReadonlyArray<ISkillNode> {
        return SKILL_TREE;
    }

    /** Get skills by category */
    public getSkillsByCategory(category: TSkillCategory): ISkillNode[] {
        return SKILL_TREE.filter(s => s.category === category);
    }

    /** Get current level of a skill */
    public getSkillLevel(skillId: string): number {
        return this.skillLevels.get(skillId) || 0;
    }

    /** Get available skill points */
    public getSkillPoints(): number {
        return this.skillPoints;
    }

    /** Add skill points (on level up) */
    public addSkillPoints(amount: number): void {
        this.skillPoints += amount;
        Logger.info('SkillTree', `Gained ${amount} skill points. Total: ${this.skillPoints}`);
    }

    /** Check if a skill can be upgraded */
    public canUpgrade(skillId: string): boolean {
        const skill = SKILL_TREE.find(s => s.id === skillId);
        if (!skill) return false;

        const currentLevel = this.getSkillLevel(skillId);
        if (currentLevel >= skill.maxLevel) return false;
        if (this.skillPoints < skill.cost) return false;

        // Check prerequisites
        for (const prereqId of skill.prerequisites) {
            if (this.getSkillLevel(prereqId) <= 0) return false;
        }

        return true;
    }

    /** Upgrade a skill by one level */
    public upgrade(skillId: string): boolean {
        if (!this.canUpgrade(skillId)) return false;

        const skill = SKILL_TREE.find(s => s.id === skillId);
        if (!skill) return false;

        const newLevel = this.getSkillLevel(skillId) + 1;
        this.skillLevels.set(skillId, newLevel);
        this.skillPoints -= skill.cost;

        Logger.info('SkillTree', `Upgraded ${skill.nameKo} to level ${newLevel}`);
        return true;
    }

    /** Get total bonus for a stat from all skills */
    public getStatBonus(statName: string): number {
        let total = 0;
        for (const skill of SKILL_TREE) {
            const level = this.getSkillLevel(skill.id);
            if (level <= 0) continue;

            for (const effect of skill.effects) {
                if (effect.type === 'stat_bonus' && effect.stat === statName) {
                    total += effect.value * level;
                }
            }
        }
        return total;
    }

    /** Check if a special ability is unlocked */
    public hasSpecialAbility(skillId: string): boolean {
        return this.getSkillLevel(skillId) > 0;
    }

    /** Reset all skills (refund points) */
    public resetSkills(): void {
        let refundedPoints = 0;
        for (const skill of SKILL_TREE) {
            const level = this.getSkillLevel(skill.id);
            refundedPoints += level * skill.cost;
            this.skillLevels.set(skill.id, 0);
        }
        this.skillPoints += refundedPoints;
        Logger.info('SkillTree', `Skills reset. Refunded ${refundedPoints} points`);
    }

    /** Get total invested skill points */
    public getTotalInvestedPoints(): number {
        let total = 0;
        for (const skill of SKILL_TREE) {
            total += this.getSkillLevel(skill.id) * skill.cost;
        }
        return total;
    }
}
