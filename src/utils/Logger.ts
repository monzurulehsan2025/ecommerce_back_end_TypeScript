export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

export class Logger {
    private static formatMessage(level: LogLevel, message: string, context?: string): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` [${context}]` : '';
        return `[${timestamp}] ${level}${contextStr}: ${message}`;
    }

    public static info(message: string, context?: string) {
        console.log(this.formatMessage(LogLevel.INFO, message, context));
    }

    public static warn(message: string, context?: string) {
        console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }

    public static error(message: string, error?: any, context?: string) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        console.error(this.formatMessage(LogLevel.ERROR, `${message} - Error: ${errorMsg}`, context));
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }

    public static debug(message: string, context?: string) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
        }
    }
}
