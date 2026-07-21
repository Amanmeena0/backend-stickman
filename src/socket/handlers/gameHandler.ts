import { Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/socket';
import { RoomManager } from '../../rooms/RoomManager';
import { moveSchema } from '../validators';

export function registerGameHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  roomManager: RoomManager
): void {
  // 1. Move Handler
  socket.on('move', (rawPayload) => {
    try {
      const payload = moveSchema.parse(rawPayload);
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room || !socket.data.playerId) return;

      const gameLoop = room.getGameLoop();
      if (gameLoop) {
        gameLoop.handlePlayerInput(socket.data.playerId, { moveDirection: payload.direction });
      }
    } catch {
      // Ignore invalid packet
    }
  });

  // 2. Jump Handler
  socket.on('jump', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room || !socket.data.playerId) return;

    const gameLoop = room.getGameLoop();
    if (gameLoop) {
      gameLoop.handlePlayerInput(socket.data.playerId, { jump: true });
    }
  });

  // 3. Attack Handler
  socket.on('attack', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room || !socket.data.playerId) return;

    const gameLoop = room.getGameLoop();
    if (gameLoop) {
      gameLoop.handlePlayerInput(socket.data.playerId, { attack: true });
    }
  });
}
