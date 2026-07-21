import { Socket, Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/socket';
import { RoomManager } from '../../rooms/RoomManager';
import { createRoomSchema, joinRoomSchema, reconnectSchema } from '../validators';
import { GameLoopCallbacks } from '../../game/GameLoop';
import { Logger } from '../../utils/logger';

export function registerRoomHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  roomManager: RoomManager
): void {
  // Setup GameLoop Callbacks helper
  const createCallbacks = (roomCode: string): GameLoopCallbacks => ({
    onDeltaUpdate: (delta) => {
      io.to(roomCode).emit('state-update', { gameState: delta });
    },
    onPlayerHit: (hit) => {
      io.to(roomCode).emit('player-hit', hit);
    },
    onHealthUpdate: (playerId, health, maxHealth) => {
      io.to(roomCode).emit('health-update', { playerId, health, maxHealth });
    },
    onRoundOver: (winnerId, round, scores) => {
      io.to(roomCode).emit('round-over', { winnerId, round, scores });
    },
    onMatchOver: (winnerId, scores) => {
      io.to(roomCode).emit('match-over', { winnerId, scores });
    },
    onGameStart: (gameState) => {
      io.to(roomCode).emit('game-start', { gameState });
    },
  });

  // 1. Create Room Handler
  socket.on('create-room', (rawPayload) => {
    try {
      const payload = createRoomSchema.parse(rawPayload);
      const room = roomManager.createRoom({ mode: payload.mode || 'pvp' });

      const player = room.addPlayer(payload.nickname, socket.id, false);
      roomManager.associateSocket(socket.id, room.roomId);

      socket.data.playerId = player.id;
      socket.data.roomId = room.roomId;
      socket.data.reconnectToken = player.reconnectToken;

      socket.join(room.roomCode);

      socket.emit('room-created', {
        roomId: room.roomId,
        roomCode: room.roomCode,
        playerId: player.id,
        reconnectToken: player.reconnectToken,
        playerIndex: player.playerIndex,
        gameState: room.getGameState(),
      });

      // Handle Bot Mode auto-creation of second player
      if (payload.mode === 'bot') {
        const botPlayer = room.initBotOpponent();
        io.to(room.roomCode).emit('player-joined', {
          playerId: botPlayer.id,
          nickname: botPlayer.nickname,
          playerIndex: botPlayer.playerIndex,
          ready: botPlayer.ready,
        });

        // Trigger player ready for creator to start game with bot
        const callbacks = createCallbacks(room.roomCode);
        room.setPlayerReady(player.id, callbacks);
      }
    } catch (err: any) {
      Logger.warn(`create-room error: ${err.message}`);
      socket.emit('room-error', { code: 'INVALID_CREATE_PAYLOAD', message: err.message || 'Failed to create room' });
      socket.emit('error', { code: 'INVALID_CREATE_PAYLOAD', message: err.message || 'Failed to create room' });
    }
  });

  // 2. Join Room Handler
  socket.on('join-room', (rawPayload) => {
    try {
      const payload = joinRoomSchema.parse(rawPayload);
      const room = roomManager.getRoomByCode(payload.roomCode);

      if (!room) {
        const message = `Room code ${payload.roomCode} not found`;
        socket.emit('room-not-found', { message });
        socket.emit('room-error', { code: 'INVALID_CODE', message });
        socket.emit('error', { code: 'INVALID_CODE', message });
        return;
      }

      if (room.isFull()) {
        const message = `Room ${payload.roomCode} is full`;
        socket.emit('room-full', { message });
        socket.emit('room-error', { code: 'ROOM_FULL', message });
        socket.emit('error', { code: 'ROOM_FULL', message });
        return;
      }

      const player = room.addPlayer(payload.nickname, socket.id, false);
      roomManager.associateSocket(socket.id, room.roomId);

      socket.data.playerId = player.id;
      socket.data.roomId = room.roomId;
      socket.data.reconnectToken = player.reconnectToken;

      socket.join(room.roomCode);

      // Notify joined player
      socket.emit('room-joined', {
        roomId: room.roomId,
        roomCode: room.roomCode,
        playerId: player.id,
        reconnectToken: player.reconnectToken,
        playerIndex: player.playerIndex,
        gameState: room.getGameState(),
      });

      // Notify other players in room
      socket.to(room.roomCode).emit('player-joined', {
        playerId: player.id,
        nickname: player.nickname,
        playerIndex: player.playerIndex,
        ready: player.ready,
      });
    } catch (err: any) {
      Logger.warn(`join-room error: ${err.message}`);
      socket.emit('room-error', { code: 'INVALID_CODE', message: err.message || 'Failed to join room' });
      socket.emit('error', { code: 'INVALID_CODE', message: err.message || 'Failed to join room' });
    }
  });

  // 3. Reconnect Player Handler
  socket.on('reconnect-player', (rawPayload) => {
    try {
      const payload = reconnectSchema.parse(rawPayload);
      const room = roomManager.getRoomById(payload.roomId);

      if (!room) {
        socket.emit('room-not-found', { message: 'Room no longer exists' });
        return;
      }

      const player = room.handlePlayerReconnect(payload.reconnectToken, socket.id);
      if (!player) {
        socket.emit('error', { code: 'RECONNECT_FAILED', message: 'Invalid or expired reconnect token' });
        return;
      }

      roomManager.associateSocket(socket.id, room.roomId);
      socket.data.playerId = player.id;
      socket.data.roomId = room.roomId;
      socket.data.reconnectToken = player.reconnectToken;

      socket.join(room.roomCode);

      socket.emit('room-joined', {
        roomId: room.roomId,
        roomCode: room.roomCode,
        playerId: player.id,
        reconnectToken: player.reconnectToken,
        playerIndex: player.playerIndex,
        gameState: room.getGameState(),
      });

      socket.to(room.roomCode).emit('player-joined', {
        playerId: player.id,
        nickname: player.nickname,
        playerIndex: player.playerIndex,
        ready: player.ready,
      });
    } catch (err: any) {
      socket.emit('error', { code: 'RECONNECT_ERROR', message: err.message });
    }
  });

  // 4. Ready Handler
  socket.on('ready', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room || !socket.data.playerId) return;

    const callbacks = createCallbacks(room.roomCode);
    const gameStarted = room.setPlayerReady(socket.data.playerId, callbacks);

    if (gameStarted) {
      Logger.info(`Game started in room ${room.roomCode}`);
    }
  });

  // 5. Leave Room Handler
  socket.on('leave-room', () => {
    const result = roomManager.leaveRoomBySocket(socket.id);
    if (result) {
      const { room, playerId } = result;
      socket.leave(room.roomCode);
      socket.to(room.roomCode).emit('player-left', { playerId, nickname: 'Player' });
    }
  });

  // 6. Pause / Resume Handlers
  socket.on('pause', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      const gameLoop = room.getGameLoop();
      if (gameLoop) gameLoop.stop();
    }
  });

  socket.on('resume', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      const gameLoop = room.getGameLoop();
      if (gameLoop) gameLoop.start();
    }
  });
}
