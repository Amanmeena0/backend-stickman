import { Room } from './Room.js';
import { RoomConfig, RoomInfo } from '../types/room.js';
import { CONFIG } from '../config/index.js';
import { Logger } from '../utils/logger.js';

export class RoomManager {
  private roomsByCode: Map<string, Room> = new Map();
  private roomsById: Map<string, Room> = new Map();
  private socketToRoomMap: Map<string, string> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  public createRoom(config: RoomConfig): Room {
    if (this.roomsById.size >= CONFIG.MAX_ROOMS) {
      throw new Error('Server capacity reached: maximum room limit reached');
    }

    const room = new Room(config);
    this.roomsByCode.set(room.roomCode, room);
    this.roomsById.set(room.roomId, room);

    Logger.info(`Room created: Code=${room.roomCode}, ID=${room.roomId}, Mode=${config.mode}`);

    return room;
  }

  public getRoomByCode(code: string): Room | undefined {
    return this.roomsByCode.get(code.toUpperCase());
  }

  public getRoomById(id: string): Room | undefined {
    return this.roomsById.get(id);
  }

  public getRoomBySocketId(socketId: string): Room | undefined {
    const roomId = this.socketToRoomMap.get(socketId);
    if (!roomId) return undefined;
    return this.getRoomById(roomId);
  }

  public associateSocket(socketId: string, roomId: string): void {
    this.socketToRoomMap.set(socketId, roomId);
  }

  public disassociateSocket(socketId: string): void {
    this.socketToRoomMap.delete(socketId);
  }

  public leaveRoomBySocket(socketId: string): { room: Room; playerId: string } | null {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return null;

    const player = room.getPlayerBySocketId(socketId);
    if (!player) return null;

    room.handlePlayerDisconnect(socketId);
    this.disassociateSocket(socketId);

    if (room.isEmpty()) {
      this.destroyRoom(room.roomId);
    }

    return { room, playerId: player.id };
  }

  public destroyRoom(roomId: string): boolean {
    const room = this.roomsById.get(roomId);
    if (!room) return false;

    // Disassociate sockets
    for (const [sId, rId] of this.socketToRoomMap.entries()) {
      if (rId === roomId) {
        this.socketToRoomMap.delete(sId);
      }
    }

    room.destroy();
    this.roomsByCode.delete(room.roomCode);
    this.roomsById.delete(room.roomId);

    Logger.info(`Room ${room.roomCode} destroyed and removed from RoomManager.`);
    return true;
  }

  public sweepInactiveRooms(): number {
    const now = Date.now();
    let count = 0;

    for (const room of Array.from(this.roomsById.values())) {
      const isExpired = now - room.lastActivity > CONFIG.ROOM_INACTIVE_TIMEOUT_MS;
      if (isExpired || room.isEmpty()) {
        Logger.warn(`Sweeping inactive/empty room: ${room.roomCode}`);
        this.destroyRoom(room.roomId);
        count++;
      }
    }

    return count;
  }

  public startCleanupTask(): void {
    if (this.cleanupInterval) return;
    // Sweep every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.sweepInactiveRooms();
    }, 60000);
  }

  public stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  public getStats(): { totalRooms: number; activePlayers: number } {
    let totalPlayers = 0;
    for (const room of this.roomsById.values()) {
      totalPlayers += room.getPlayerCount();
    }
    return {
      totalRooms: this.roomsById.size,
      activePlayers: totalPlayers,
    };
  }

  public getAllRoomSummaries(): RoomInfo[] {
    return Array.from(this.roomsById.values()).map((r) => r.getInfo());
  }
}
