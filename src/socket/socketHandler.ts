import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { SocketRateLimiter } from '../utils/rateLimiter.js';
import { registerRoomHandlers } from './handlers/roomHandler.js';
import { registerGameHandlers } from './handlers/gameHandler.js';
import { registerHeartbeatHandlers } from './handlers/heartbeatHandler.js';
import { Logger } from '../utils/logger.js';

export function setupSocketIO(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  roomManager: RoomManager
): { rateLimiter: SocketRateLimiter } {
  const rateLimiter = new SocketRateLimiter();

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) => {
    Logger.info(`Client connected: socketId=${socket.id}, IP=${socket.handshake.address}`);

    // Rate Limiting Middleware for incoming socket packets
    socket.use(([event, ..._args], next) => {
      if (!rateLimiter.allow(socket.id)) {
        Logger.warn(`Rate limit exceeded for socket ${socket.id} on event '${event}'`);
        socket.emit('error', {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.',
        });
        return; // Block packet
      }
      next();
    });

    // Register modular feature handlers
    registerRoomHandlers(io, socket, roomManager);
    registerGameHandlers(socket, roomManager);
    registerHeartbeatHandlers(socket);

    // Handle Socket Disconnect
    socket.on('disconnect', (reason) => {
      Logger.info(`Client disconnected: socketId=${socket.id}, reason=${reason}`);
      rateLimiter.reset(socket.id);

      const result = roomManager.leaveRoomBySocket(socket.id);
      if (result) {
        const { room, playerId } = result;
        socket.to(room.roomCode).emit('player-left', {
          playerId,
          nickname: 'Player',
          reason,
        });
      }
    });
  });

  return { rateLimiter };
}
