const winston = require("winston");
require("winston-daily-rotate-file");
const DiscordTransport = require("winston-discord-transport").default;

const env = process.env.NODE_ENV || "development";
const logLevel = env === "production" ? "warn" : "debug";

const defaultMeta = { service: "user-service" };

const formats = {
  timestamp: winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors: winston.format.errors({ stack: true }),
  json: winston.format.json(),
  console: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level}] : ${message}`;
    })
  ),
  discord: winston.format.printf(({ level, message, timestamp }) => {
    return `**[${level.toUpperCase()}]** ${timestamp}: ${message}`;
  }),
};

const createTransport = (type, options) => {
  const transportMap = {
    dailyRotateFile: () =>
      new winston.transports.DailyRotateFile({
        filename: "logs/application-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "14d",
      }),
    errorFile: () =>
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
    discord: (level) =>
      new DiscordTransport({
        webhook: process.env.DISCORD_WEBHOOK_URL,
        level,
        defaultMeta,
        format: winston.format.combine(formats.timestamp, formats.discord),
      }),
    console: () =>
      new winston.transports.Console({
        format: formats.console,
      }),
  };

  return transportMap[type](options);
};

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    formats.timestamp,
    formats.errors,
    winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] })
  ),
  defaultMeta,
  transports: [
    createTransport("console"),
    createTransport("dailyRotateFile"),
    createTransport("errorFile"),
    createTransport("discord", "error"),
    createTransport("discord", "warn"),
    createTransport("discord", "info"),
  ],
});

module.exports = logger;
