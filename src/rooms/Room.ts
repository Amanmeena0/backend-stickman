import { v4 as uuidv4 } from 'uuid';
import { PlayerState, GameState, Vector2D } from '../types/game.js';
import { RoomConfig, RoomInfo } from '../types/room.js';
import { GameLoop, GameLoopCallbacks } from '../game/GameLoop.js';
import { CONFIG } from '../config/index.js';
import { generateRoomCode } from '../utils/nanoid.js';
import { Logger } from '../utils/logger.js';

export class Room {
  public readonly roomId: string;
  public readonly roomCode: string;
  public readonly createdTime: number;
  public lastActivity: number;
  public readonly maxPlayers: number = 2;
  public readonly mode: 'pvp' | 'bot';

  private players: Map<string, PlayerState> = new Map();
  private gameLoop?: GameLoop;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: RoomConfig) {
    this.roomId = uuidv4();
    this.roomCode = generateRoomCode();
    this.createdTime = Date.now();
    this.lastActivity = Date.now();
    this.mode = config.mode;
  }

  public touch(): void {
    this.lastActivity = Date.now();
  }

  public isFull(): boolean {
    return this.players.size >= this.maxPlayers;
  }

  public isEmpty(): boolean {
    const activePlayers = Array.from(this.players.values()).filter((p) => p.connected || p.isBot);
    return activePlayers.length === 0;
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public getPlayer(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }

  public getPlayerBySocketId(socketId: string): PlayerState | undefined {
    return Array.from(this.players.values()).find((p) => p.socketId === socketId);
  }

  public getPlayerByReconnectToken(token: string): PlayerState | undefined {
    return Array.from(this.players.values()).find((p) => p.reconnectToken === token);
  }

  public addPlayer(nickname: string, socketId: string | null = null, isBot: boolean = false): PlayerState {
    this.touch();

    if (this.isFull()) {
      throw new Error('Room is full');
    }

    const playerIndex = (this.players.size + 1) as 1 | 2;
    const playerId = isBot ? `bot_${uuidv4().substring(0, 8)}` : uuidv4();
    const reconnectToken = uuidv4();

    const initialPosition: Vector2D = {
      x: playerIndex === 1 ? 300 : 900,
      y: CONFIG.GAME.MAP_BOUNDS.GROUND_Y,
    };

    const player: PlayerState = {
      id: playerId,
      socketId,
      nickname,
      position: initialPosition,
      velocity: { x: 0, y: 0 },
      direction: playerIndex === 1 ? 'right' : 'left',
      health: CONFIG.GAME.DEFAULT_HEALTH,
      maxHealth: CONFIG.GAME.DEFAULT_HEALTH,
      isGrounded: true,
      isAttacking: false,
      attackCooldown: 0,
      currentAnimation: 'idle',
      connected: !isBot,
      ready: isBot, // Bots are auto-ready
      isBot,
      reconnectToken,
      score: 0,
      playerIndex,
    };

    this.players.set(playerId, player);
    Logger.info(`Player ${nickname} (${playerId}) joined room ${this.roomCode}`);

    return player;
  }

  public initBotOpponent(): PlayerState {
    if (this.mode !== 'bot') {
      throw new Error('Cannot add bot to non-bot room');
    }
    return this.addPlayer('Bot Alpha', null, true);
  }

  public setPlayerReady(playerId: string, callbacks: GameLoopCallbacks): boolean {
    this.touch();
    const player = this.players.get(playerId);
    if (!player) return false;

    player.ready = true;

    // If all players ready and 2 players present, initialize and start game loop!
    const allReady = Array.from(this.players.values()).every((p) => p.ready);
    if (allReady && this.players.size === 2 && !this.gameLoop) {
      const loop = this.initGameLoop(callbacks);
      loop.start();
      return true;
    }

    return false;
  }

  public handlePlayerDisconnect(socketId: string): PlayerState | null {
    this.touch();
    const player = this.getPlayerBySocketId(socketId);
    if (!player) return null;

    player.connected = false;
    player.socketId = null;

    Logger.warn(`Player ${player.nickname} disconnected from room ${this.roomCode}`);

    // Set reconnect grace timer
    const timer = setTimeout(() => {
      Logger.info(`Reconnect grace period expired for player ${player.nickname} in room ${this.roomCode}`);
      this.removePlayer(player.id);
    }, CONFIG.RECONNECT_TIMEOUT_MS);

    this.reconnectTimers.set(player.id, timer);

    return player;
  }

  public handlePlayerReconnect(reconnectToken: string, newSocketId: string): PlayerState | null {
    this.touch();
    const player = this.getPlayerByReconnectToken(reconnectToken);
    if (!player) return null;

    // Clear reconnect timer
    const timer = this.reconnectTimers.get(player.id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(player.id);
    }

    player.connected = true;
    player.socketId = newSocketId;
    Logger.info(`Player ${player.nickname} reconnected to room ${this.roomCode}`);

    return player;
  }

  public removePlayer(playerId: string): void {
    this.touch();
    const timer = this.reconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(playerId);
    }

    this.players.delete(playerId);

    if (this.gameLoop && this.players.size < 2) {
      this.gameLoop.stop();
    }
  }

  public initGameLoop(callbacks: GameLoopCallbacks): GameLoop {
    const playersObj: Record<string, PlayerState> = {};
    for (const [id, p] of this.players.entries()) {
      playersObj[id] = p;
    }

    const gameState: GameState = {
      roomId: this.roomId,
      roomCode: this.roomCode,
      status: 'waiting',
      round: 1,
      maxRounds: CONFIG.GAME.MAX_ROUNDS,
      roundTimer: CONFIG.GAME.ROUND_DURATION_SEC,
      players: playersObj,
      winnerId: null,
      lastTick: Date.now(),
      tickCount: 0,
      mode: this.mode,
    };

    this.gameLoop = new GameLoop(gameState, callbacks);
    return this.gameLoop;
  }

  public getGameLoop(): GameLoop | undefined {
    return this.gameLoop;
  }

  public getGameState(): GameState {
    if (this.gameLoop) {
      return this.gameLoop.state;
    }

    const playersObj: Record<string, PlayerState> = {};
    for (const [id, p] of this.players.entries()) {
      playersObj[id] = p;
    }

    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      status: 'waiting',
      round: 1,
      maxRounds: CONFIG.GAME.MAX_ROUNDS,
      roundTimer: CONFIG.GAME.ROUND_DURATION_SEC,
      players: playersObj,
      winnerId: null,
      lastTick: Date.now(),
      tickCount: 0,
      mode: this.mode,
    };
  }

  public getInfo(): RoomInfo {
    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      createdTime: this.createdTime,
      lastActivity: this.lastActivity,
      status: this.getGameState().status,
      mode: this.mode,
    };
  }

  public destroy(): void {
    if (this.gameLoop) {
      this.gameLoop.stop();
    }

    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();
    this.players.clear();
    Logger.info(`Room ${this.roomCode} (${this.roomId}) destroyed.`);
  }
}
