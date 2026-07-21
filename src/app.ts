import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { CONFIG } from './config';
import { RoomManager } from './rooms/RoomManager';
import { HealthController } from './controllers/healthController';
import { httpRateLimiter, errorHandler } from './middleware/security';

export function createApp(roomManager: RoomManager): Application {
  const app = express();

  // Security and performance middleware
  app.use(helmet());

  const isWildcardCors = CONFIG.CLIENT_URL.includes('*');
  app.use(
    cors({
      origin: isWildcardCors
        ? '*'
        : (origin, callback) => {
            if (!origin || CONFIG.CLIENT_URL.includes(origin) || CONFIG.NODE_ENV === 'development') {
              return callback(null, true);
            }
            return callback(null, true);
          },
      credentials: !isWildcardCors,
    })
  );
  app.use(compression());
  app.use(express.json());
  app.use(morgan(CONFIG.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // Rate limiting for HTTP routes
  app.use(httpRateLimiter);

  // Controllers & Routes
  const healthController = new HealthController(roomManager);

  app.get('/', healthController.getHealth);
  app.get('/health', healthController.getHealth);
  app.get('/metrics', healthController.getMetrics);
  app.get('/rooms', healthController.getRooms);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
