import { RoomManager } from '../../src/rooms/RoomManager';

describe('RoomManager Unit Tests', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  afterEach(() => {
    roomManager.stopCleanupTask();
  });

  test('should create a room with unique 6-character room code', () => {
    const room = roomManager.createRoom({ mode: 'pvp' });

    expect(room).toBeDefined();
    expect(room.roomCode).toHaveLength(6);
    expect(room.mode).toBe('pvp');
    expect(roomManager.getRoomByCode(room.roomCode)).toBe(room);
  });

  test('should allow joining created room and enforce 2-player max limit', () => {
    const room = roomManager.createRoom({ mode: 'pvp' });

    const p1 = room.addPlayer('Player1', 'sock1');
    const p2 = room.addPlayer('Player2', 'sock2');

    expect(p1.playerIndex).toBe(1);
    expect(p2.playerIndex).toBe(2);
    expect(room.isFull()).toBe(true);

    expect(() => room.addPlayer('Player3', 'sock3')).toThrow('Room is full');
  });

  test('should initialize bot player in bot mode', () => {
    const room = roomManager.createRoom({ mode: 'bot' });
    const p1 = room.addPlayer('HumanPlayer', 'sock1');
    const bot = room.initBotOpponent();

    expect(room.isFull()).toBe(true);
    expect(bot.isBot).toBe(true);
    expect(bot.ready).toBe(true);
    expect(p1.isBot).toBe(false);
  });

  test('should sweep empty and inactive rooms', () => {
    const room = roomManager.createRoom({ mode: 'pvp' });
    room.lastActivity = Date.now() - 400000; // Fake old activity

    const sweptCount = roomManager.sweepInactiveRooms();
    expect(sweptCount).toBeGreaterThanOrEqual(1);
    expect(roomManager.getRoomByCode(room.roomCode)).toBeUndefined();
  });
});
