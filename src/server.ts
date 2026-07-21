import http from 'http';
import { Server } from 'socket.io';
import { CONFIG } from './config/index.js';
import { RoomManager } from './rooms/RoomManager.js';
import { createApp } from './app.js';
import { setupSocketIO } from './socket/socketHandler.js';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socket.js';
import { Logger } from './utils/logger.js';

const roomManager = new RoomManager();
const app = createApp(roomManager);
const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(server, {
  cors: {
    origin: CONFIG.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
});

// Attach Socket.IO handlers
const { rateLimiter } = setupSocketIO(io, roomManager);

// Start HTTP & Socket server
const PORT = CONFIG.PORT;
server.listen(PORT, () => {
  Logger.info(`🚀 Stickman Battle Server running on port ${PORT}`);
  Logger.info(`Environment: ${CONFIG.NODE_ENV}`);
  Logger.info(`Tick Rate: ${CONFIG.TICK_RATE} FPS`);
});

// Graceful Shutdown Handling
const shutdown = (signal: string) => {
  Logger.info(`Received ${signal}. Starting graceful shutdown...`);

  rateLimiter.destroy();

  // Close HTTP & Socket server
  io.close(() => {
    Logger.info('Socket.IO server closed.');
  });

  roomManager.stopCleanupTask();

  server.close(() => {
    Logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force shutdown if taking too long
  setTimeout(() => {
    Logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server, io, roomManager, rateLimiter };
