/** Log levels */
type TLogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Centralized logging utility */
export class Logger {
    private static enabled = true;
    private static minLevel: TLogLevel = 'debug';

    private static readonly LEVELS: Record<TLogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    /** Enable or disable logging */
    public static setEnabled(enabled: boolean): void {
        Logger.enabled = enabled;
    }

    /** Set minimum log level */
    public static setMinLevel(level: TLogLevel): void {
        Logger.minLevel = level;
    }

    /** Debug level log */
    public static debug(tag: string, message: string, ...args: unknown[]): void {
        Logger.log('debug', tag, message, ...args);
    }

    /** Info level log */
    public static info(tag: string, message: string, ...args: unknown[]): void {
        Logger.log('info', tag, message, ...args);
    }

    /** Warning level log */
    public static warn(tag: string, message: string, ...args: unknown[]): void {
        Logger.log('warn', tag, message, ...args);
    }

    /** Error level log */
    public static error(tag: string, message: string, ...args: unknown[]): void {
        Logger.log('error', tag, message, ...args);
    }

    private static log(level: TLogLevel, tag: string, message: string, ...args: unknown[]): void {
        if (!Logger.enabled) return;
        if (Logger.LEVELS[level] < Logger.LEVELS[Logger.minLevel]) return;

        const timestamp = new Date().toISOString().substring(11, 23);
        const prefix = `[${timestamp}][${tag}]`;

        switch (level) {
            case 'debug':
                console.debug(prefix, message, ...args);
                break;
            case 'info':
                console.info(prefix, message, ...args);
                break;
            case 'warn':
                console.warn(prefix, message, ...args);
                break;
            case 'error':
                console.error(prefix, message, ...args);
                break;
        }
    }
}
