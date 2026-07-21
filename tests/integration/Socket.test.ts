import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { RoomManager } from '../../src/rooms/RoomManager';
import { createApp } from '../../src/app';
import { setupSocketIO } from '../../src/socket/socketHandler';
import { SocketRateLimiter } from '../../src/utils/rateLimiter';
import { ClientToServerEvents, ServerToClientEvents } from '../../src/types/socket';

describe('Socket Integration Tests', () => {
  let httpServer: http.Server;
  let ioServer: SocketIOServer;
  let roomManager: RoomManager;
  let rateLimiter: SocketRateLimiter;
  let port: number;
  let clientSocket1: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let clientSocket2: ClientSocket<ServerToClientEvents, ClientToServerEvents>;

  beforeAll((done) => {
    roomManager = new RoomManager();
    const app = createApp(roomManager);
    httpServer = http.createServer(app);
    ioServer = new SocketIOServer(httpServer);
    const result = setupSocketIO(ioServer as any, roomManager);
    rateLimiter = result.rateLimiter;

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 3000;
      done();
    });
  });

  afterAll((done) => {
    rateLimiter.destroy();
    roomManager.stopCleanupTask();
    ioServer.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    clientSocket1 = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    clientSocket1.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket1 && clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.disconnect();
  });

  test('should ping-pong latency measurement', (done) => {
    const clientTs = Date.now();
    clientSocket1.emit('ping', { clientTimestamp: clientTs });

    clientSocket1.on('pong', (data) => {
      expect(data.clientTimestamp).toBe(clientTs);
      expect(data.serverTimestamp).toBeGreaterThanOrEqual(clientTs);
      expect(typeof data.latency).toBe('number');
      done();
    });
  });

  test('should create room and emit room-created', (done) => {
    clientSocket1.emit('create-room', { nickname: 'Fighter1', mode: 'pvp' });

    clientSocket1.on('room-created', (data) => {
      expect(data.roomCode).toHaveLength(6);
      expect(data.playerId).toBeDefined();
      expect(data.reconnectToken).toBeDefined();
      expect(data.playerIndex).toBe(1);
      done();
    });
  });

  test('should join existing room with player2', (done) => {
    clientSocket1.emit('create-room', { nickname: 'Fighter1', mode: 'pvp' });

    clientSocket1.on('room-created', (data) => {
      const roomCode = data.roomCode;

      clientSocket2 = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-room', { roomCode, nickname: 'Fighter2' });
      });

      clientSocket2.on('room-joined', (joinData) => {
        expect(joinData.roomCode).toBe(roomCode);
        expect(joinData.playerIndex).toBe(2);
        done();
      });
    });
  });

  test('should reject room join with non-existent 6-char room code', (done) => {
    clientSocket1.emit('join-room', { roomCode: 'NOC404', nickname: 'Intruder' });

    clientSocket1.on('room-not-found', (data) => {
      expect(data.message).toContain('NOC404');
      done();
    });
  });
});
