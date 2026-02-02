import { BaseScene } from './BaseScene';
import { SCENES } from '../utils/Constants';

/**
 * Placeholder dialogue scene for cutscene-style dialogue sequences.
 * Most dialogue is handled through the UIScene's DialogueBox component.
 */
export class DialogueScene extends BaseScene {
    constructor() {
        super(SCENES.DIALOGUE);
    }

    create(): void {
        // This scene is used for special full-screen dialogue sequences
        // like the prologue. Regular NPC dialogue uses UIScene.
    }
}
