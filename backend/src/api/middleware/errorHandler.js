/**
 * MOTORSYNC Backend — Central Error Middleware
 * 
 * Master Specification Section 54:
 * Catches all unhandled exceptions and returns clean, structured errors.
 * Never leaks raw stack traces to the client.
 */

import { logger } from '../../utils/logger.js';
import { sendError } from './responseHandler.js';

export function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error during ${req.method} ${req.originalUrl}:`, err);

  // Handle body-parser JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'INVALID_JSON_BODY', 'Malformed JSON in request body', 400);
  }

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.isOperational ? err.message : 'An unexpected internal server error occurred';

  return sendError(res, code, message, statusCode);
}
