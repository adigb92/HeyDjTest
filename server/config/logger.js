const winston = require('winston');
const path = require('path');
const config = require('./index');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create transports based on environment
const transports = [
    // Console transport for all environments
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.printf(
                (info) => `${info.timestamp} ${info.level}: ${info.message}`
            )
        ),
    }),
];

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            format: logFormat,
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            format: logFormat,
        })
    );
}

// Create the logger
const logger = winston.createLogger({
    level: config.logging.level,
    levels,
    format: logFormat,
    transports,
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/exceptions.log') }),
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/rejections.log') }),
    ],
});

// Create a stream object for Morgan
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

module.exports = logger; 