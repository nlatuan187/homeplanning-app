import { createLogger, format, transports } from "winston";

// Centralized Winston logger
// - Use JSON in production; pretty print during dev.
// - We keep the interface minimal so it can be swapped easily later.
const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    process.env.NODE_ENV === "production"
      ? format.json()
      : format.prettyPrint({ colorize: true })
  ),
  transports: [new transports.Console()],
});

export default logger;


