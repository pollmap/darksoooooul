/** General helper functions */

/** Format play time from milliseconds to HH:MM:SS */
export function formatPlayTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Format gold amount with Korean currency */
export function formatGold(amount: number): string {
    return `${amount.toLocaleString()} 전`;
}

/** Format a timestamp to Korean date string */
export function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Deep clone an object */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/** Generate a simple unique ID */
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** Check if two rectangles overlap */
export function rectsOverlap(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
