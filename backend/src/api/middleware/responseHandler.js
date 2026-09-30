/**
 * MOTORSYNC Backend — API Response Helpers
 * 
 * Master Specification Section 6:
 * Consistent JSON response structure:
 * Success: { success: true, data: {}, metadata: {} }
 * Error:   { success: false, error: { code: string, message: string, details?: any } }
 */

export function sendSuccess(res, data = {}, metadata = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  });
}

export function sendError(res, code, message, statusCode = 400, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}
