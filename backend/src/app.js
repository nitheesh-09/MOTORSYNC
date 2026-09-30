/**
 * MOTORSYNC Backend — Express Application
 * 
 * Configures middleware, versioned routing (/api/v1), and central error handling.
 */

import express from 'express';
import cors from 'cors';
import { v1Router } from './api/routes/v1Routes.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();

  // Enable CORS for frontend Vite dev server and clients
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parsers with 50MB payload limits for large offline waveform sets
  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logger middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  // Mount versioned API routes
  app.use('/api/v1', v1Router);

  // Fallback 404 for unmatched API routes
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
      }
    });
  });

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
