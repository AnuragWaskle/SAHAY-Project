import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(
          format.colorize(),
          format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? ' ' + JSON.stringify(meta)
              : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        )
  ),
  transports: [
    new transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [new transports.File({ filename: 'logs/error.log', level: 'error' }),
         new transports.File({ filename: 'logs/combined.log' })]
      : []),
  ],
});
