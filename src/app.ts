import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { CONFIG } from './config/index.js';
import { RoomManager } from './rooms/RoomManager.js';
import { HealthController } from './controllers/healthController.js';
import { httpRateLimiter, errorHandler } from './middleware/security.js';

export function createApp(roomManager: RoomManager): Application {
  const app = express();

  // Security and performance middleware
  app.use(helmet());
  app.use(
    cors({
      origin: CONFIG.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json());
  app.use(morgan(CONFIG.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // Rate limiting for HTTP routes
  app.use(httpRateLimiter);

  // Controllers & Routes
  const healthController = new HealthController(roomManager);

  app.get('/health', healthController.getHealth);
  app.get('/metrics', healthController.getMetrics);
  app.get('/rooms', healthController.getRooms);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
