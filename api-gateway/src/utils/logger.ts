import pino from 'pino';
import type { LoggerObject } from '../models/index.models.js';

export class ApiGatewayLogger {
    private readonly _logger: pino.Logger;

    constructor() {
        this._logger = pino({
            level: process.env.LOG_LEVEL || "info",
            redact: {
                paths: [
                    "password",
                    "token",
                    "accessToken",
                    "refreshToken",
                    "authorization",
                    "req.headers.authorization",
                    "req.headers.cookie"
                ],
                censor: "[REDACTED]"
            },
            formatters: {
                level: (label) => {
                    return { level: label };
                }
            },
            timestamp: true,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        });
    }

    info = (message: string, data?: LoggerObject): void => {
        this._logger.info(data ?? {}, message);
    };

    error = (message: string, data?: LoggerObject): void => {
        this._logger.error(data ?? {}, message);
    };

    debug = (message: string, data?: LoggerObject): void => {
        this._logger.debug(data ?? {}, message);
    };
}

const apiGatewayLogger = new ApiGatewayLogger();
export default apiGatewayLogger;
