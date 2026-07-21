import { Request, Response } from 'express';
import { RoomManager } from '../rooms/RoomManager.js';

export class HealthController {
  private roomManager: RoomManager;

  constructor(roomManager: RoomManager) {
    this.roomManager = roomManager;
  }

  public getHealth = (_req: Request, res: Response): void => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  public getMetrics = (_req: Request, res: Response): void => {
    const stats = this.roomManager.getStats();
    const memory = process.memoryUsage();

    res.status(200).json({
      status: 'ok',
      rooms: stats.totalRooms,
      activePlayers: stats.activePlayers,
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      },
      uptime: process.uptime(),
    });
  };

  public getRooms = (_req: Request, res: Response): void => {
    const rooms = this.roomManager.getAllRoomSummaries();
    res.status(200).json({
      count: rooms.length,
      rooms,
    });
  };
}
