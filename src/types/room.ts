import { GameState } from './game';

export type RoomMode = 'pvp' | 'bot';

export interface RoomConfig {
  mode: RoomMode;
  botDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface RoomInfo {
  roomId: string;
  roomCode: string;
  playerCount: number;
  maxPlayers: number;
  createdTime: number;
  lastActivity: number;
  status: GameState['status'];
  mode: RoomMode;
}
