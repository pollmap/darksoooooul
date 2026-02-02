import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_STRINGS, COLORS } from '../utils/Constants';
import { GameState } from '../state/GameState';

interface MapNode {
    id: string;
    name: string;
    x: number;
    y: number;
    unlocked: boolean;
}

/**
 * World map UI showing unlocked regions and connections.
 */
export class WorldMapUI extends Phaser.GameObjects.Container {
    private nodes: MapNode[] = [];
    private nodeGraphics: Phaser.GameObjects.Container[] = [];

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        // Overlay
        const overlay = scene.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.add(overlay);

        // Title
        const title = scene.add.text(GAME_WIDTH / 2, 40, '천하도 (天下圖)', {
            fontSize: '32px',
            color: COLOR_STRINGS.WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add(title);

        // Map nodes layout
        this.nodes = [
            { id: 'paegang', name: '패강/서경', x: GAME_WIDTH / 2, y: 140, unlocked: false },
            { id: 'cheolwon', name: '철원경', x: GAME_WIDTH / 2 - 200, y: 250, unlocked: false },
            { id: 'songak', name: '송악', x: GAME_WIDTH / 2, y: 250, unlocked: false },
            { id: 'sangju', name: '상주/명주', x: GAME_WIDTH / 2 + 200, y: 250, unlocked: false },
            { id: 'hub', name: '저잣거리', x: GAME_WIDTH / 2, y: 400, unlocked: true },
            { id: 'wansanju', name: '완산주', x: GAME_WIDTH / 2 - 200, y: 530, unlocked: false },
            { id: 'geumseong', name: '금성/경주', x: GAME_WIDTH / 2 + 200, y: 530, unlocked: false },
        ];

        this.drawMap();

        this.setVisible(false);
        this.setScrollFactor(0);
        this.setDepth(300);
    }

    public show(): void {
        this.refreshUnlocks();
        this.setVisible(true);
    }

    public hide(): void {
        this.setVisible(false);
    }

    public toggle(): void {
        if (this.visible) this.hide();
        else this.show();
    }

    private refreshUnlocks(): void {
        const gs = GameState.getInstance();
        this.nodes.forEach(node => {
            node.unlocked = gs.isUnlocked(node.id) || node.id === 'hub';
        });
        this.drawMap();
    }

    private drawMap(): void {
        this.nodeGraphics.forEach(g => g.destroy());
        this.nodeGraphics = [];

        // Draw connections
        const connections = scene_drawConnections(this.scene, this.nodes, this);

        // Draw nodes
        this.nodes.forEach(node => {
            const container = this.scene.add.container(node.x, node.y);

            const circle = this.scene.add.graphics();
            if (node.unlocked) {
                circle.fillStyle(0x1a237e, 1);
                circle.fillCircle(0, 0, 18);
                circle.lineStyle(2, COLORS.GOLD);
                circle.strokeCircle(0, 0, 18);
            } else {
                circle.fillStyle(0x333333, 0.5);
                circle.fillCircle(0, 0, 18);
                circle.lineStyle(1, 0x555555);
                circle.strokeCircle(0, 0, 18);
            }

            const label = this.scene.add.text(0, 28, node.name, {
                fontSize: '13px',
                color: node.unlocked ? COLOR_STRINGS.WHITE : '#555555',
            }).setOrigin(0.5);

            container.add([circle, label]);
            this.add(container);
            this.nodeGraphics.push(container);

            if (node.unlocked) {
                const hitZone = this.scene.add.zone(0, 0, 40, 40)
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => {
                        this.scene.events.emit('travel_to_area', node.id);
                        this.hide();
                    });
                container.add(hitZone);
            }
        });
    }
}

/** Helper to draw connection lines between nodes */
function scene_drawConnections(
    scene: Phaser.Scene,
    nodes: MapNode[],
    container: Phaser.GameObjects.Container
): void {
    const connections = [
        ['paegang', 'cheolwon'],
        ['paegang', 'songak'],
        ['cheolwon', 'hub'],
        ['songak', 'hub'],
        ['sangju', 'hub'],
        ['hub', 'wansanju'],
        ['hub', 'geumseong'],
        ['wansanju', 'geumseong'],
    ];

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const lines = scene.add.graphics();
    lines.lineStyle(1, 0x444444, 0.5);

    connections.forEach(([a, b]) => {
        const nodeA = nodeMap.get(a);
        const nodeB = nodeMap.get(b);
        if (nodeA && nodeB) {
            lines.lineBetween(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
        }
    });

    container.add(lines);
}
