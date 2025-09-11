const winston = require('winston');

const logger = winston.createLogger({
    level: 'info', // Log only info and above. Change to 'debug' or 'verbose' for more detailed logs.
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Log to the console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Log to a file
        new winston.transports.File({ filename: 'server-logs.log' })
    ]
});

module.exports = logger;

const winston = require('winston');

const logger = winston.createLogger({
    level: 'info', // Log only info and above. Change to 'debug' or 'verbose' for more detailed logs.
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Log to the console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Log to a file
        new winston.transports.File({ filename: 'server-logs.log' })
    ]
});

module.exports = logger;
