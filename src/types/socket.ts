import { GameState, DeltaGameState, Vector2D } from './game';

export interface CreateRoomPayload {
  nickname: string;
  mode?: 'pvp' | 'bot';
}

export interface JoinRoomPayload {
  roomCode: string;
  nickname: string;
}

export interface ReconnectPayload {
  roomId: string;
  reconnectToken: string;
  nickname: string;
}

export interface MovePayload {
  direction: -1 | 0 | 1;
}

export interface PingPayload {
  clientTimestamp: number;
}

export interface ServerToClientEvents {
  'room-created': (data: { roomId: string; roomCode: string; playerId: string; reconnectToken: string; playerIndex: number; gameState: GameState }) => void;
  'room-joined': (data: { roomId: string; roomCode: string; playerId: string; reconnectToken: string; playerIndex: number; gameState: GameState }) => void;
  'room-full': (data: { message: string }) => void;
  'room-not-found': (data: { message: string }) => void;
  'room-error': (data: { code: string; message: string }) => void;
  'player-joined': (data: { playerId: string; nickname: string; playerIndex: number; ready: boolean }) => void;
  'player-left': (data: { playerId: string; nickname: string; reason?: string }) => void;
  'game-start': (data: { gameState: GameState }) => void;
  'state-update': (data: { gameState: DeltaGameState }) => void;
  'player-hit': (data: { attackerId: string; victimId: string; damage: number; remainingHealth: number; position: Vector2D }) => void;
  'health-update': (data: { playerId: string; health: number; maxHealth: number }) => void;
  'round-over': (data: { winnerId: string | null; round: number; scores: Record<string, number> }) => void;
  'match-over': (data: { winnerId: string; scores: Record<string, number> }) => void;
  'pong': (data: { clientTimestamp: number; serverTimestamp: number; latency: number }) => void;
  'error': (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'create-room': (payload: CreateRoomPayload) => void;
  'join-room': (payload: JoinRoomPayload) => void;
  'reconnect-player': (payload: ReconnectPayload) => void;
  'leave-room': () => void;
  'move': (payload: MovePayload) => void;
  'jump': () => void;
  'attack': () => void;
  'ready': () => void;
  'pause': () => void;
  'resume': () => void;
  'ping': (payload: PingPayload) => void;
}

export interface SocketData {
  playerId?: string;
  roomId?: string;
  reconnectToken?: string;
}
