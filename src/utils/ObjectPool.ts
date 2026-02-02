/** Generic object pool for reusing game objects */
export class ObjectPool<T extends { reset(): void }> {
    private pool: T[] = [];
    private factory: () => T;

    constructor(factory: () => T, initialSize: number = 0) {
        this.factory = factory;
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    /** Get an object from the pool, or create a new one */
    public get(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }

    /** Return an object to the pool */
    public release(obj: T): void {
        obj.reset();
        this.pool.push(obj);
    }

    /** Get the current pool size */
    public get size(): number {
        return this.pool.length;
    }

    /** Clear the pool */
    public clear(): void {
        this.pool.length = 0;
    }
}
