/**
 * utils/logger.js
 *
 * Application-wide Winston logger.
 *
 * Log levels:
 *   error   — unhandled exceptions, fatal errors
 *   warn    — recoverable issues, deprecations
 *   info    — significant lifecycle events (server start, cycle transitions)
 *   debug   — verbose request/response details (dev only)
 *
 * In production:  JSON format → stdout (consumed by log aggregator)
 * In development: colourised human-readable format
 */

import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Human-readable format for local development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  })
);

// Structured JSON format for production log aggregators
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],

  // Catch unhandled exceptions and rejections
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});
