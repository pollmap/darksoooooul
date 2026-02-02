/** Math utility functions for game calculations */
export class MathUtils {
    /** Clamp a value between min and max */
    public static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /** Linear interpolation */
    public static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * MathUtils.clamp(t, 0, 1);
    }

    /** Random integer between min (inclusive) and max (inclusive) */
    public static randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /** Random float between min and max */
    public static randomFloat(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    /** Check probability (0-1) */
    public static chance(probability: number): boolean {
        return Math.random() < probability;
    }

    /** Distance between two points */
    public static distance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** Direction from point 1 to point 2 (returns -1 or 1 for x) */
    public static directionX(x1: number, x2: number): number {
        return x2 > x1 ? 1 : -1;
    }

    /** Convert frames to milliseconds at 60fps */
    public static framesToMs(frames: number): number {
        return frames * (1000 / 60);
    }

    /** Convert milliseconds to frames at 60fps */
    public static msToFrames(ms: number): number {
        return Math.round(ms / (1000 / 60));
    }

    /** Smooth step for animations */
    public static smoothStep(t: number): number {
        t = MathUtils.clamp(t, 0, 1);
        return t * t * (3 - 2 * t);
    }
}
