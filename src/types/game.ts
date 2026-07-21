export interface Vector2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FacingDirection = 'left' | 'right';

export type AnimationState = 'idle' | 'walk' | 'jump' | 'attack' | 'hit' | 'block' | 'dead';

export interface PlayerState {
  id: string;
  socketId: string | null;
  nickname: string;
  position: Vector2D;
  velocity: Vector2D;
  direction: FacingDirection;
  health: number;
  maxHealth: number;
  isGrounded: boolean;
  isAttacking: boolean;
  attackCooldown: number;
  currentAnimation: AnimationState;
  connected: boolean;
  ready: boolean;
  isBot: boolean;
  reconnectToken: string;
  score: number;
  playerIndex: 1 | 2;
}

export type GameStatus = 'waiting' | 'starting' | 'playing' | 'paused' | 'round_over' | 'game_over';

export interface GameState {
  roomId: string;
  roomCode: string;
  status: GameStatus;
  round: number;
  maxRounds: number;
  roundTimer: number;
  players: Record<string, PlayerState>;
  winnerId: string | null;
  lastTick: number;
  tickCount: number;
  mode: 'pvp' | 'bot';
}

export interface DeltaPlayerUpdate {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  direction: FacingDirection;
  health: number;
  currentAnimation: AnimationState;
  isGrounded: boolean;
  isAttacking: boolean;
  connected: boolean;
  ready: boolean;
  score: number;
}

export interface DeltaGameState {
  roomId: string;
  status: GameStatus;
  round: number;
  roundTimer: number;
  players: Record<string, DeltaPlayerUpdate>;
  winnerId: string | null;
  tickCount: number;
}
