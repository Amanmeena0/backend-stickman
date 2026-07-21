import dotenv from 'dotenv';
dotenv.config();

export const parseClientUrls = (envVal?: string): string[] => {
  if (!envVal) return ['*'];

  let cleaned = envVal.trim();
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }

  const urls = cleaned
    .split(',')
    .map((url) => url.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .map((url) => {
      if (url === '*') return '*';
      try {
        return new URL(url).origin;
      } catch {
        return url;
      }
    });

  return urls.length > 0 ? urls : ['*'];
};

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: parseClientUrls(process.env.CLIENT_URL),
  TICK_RATE: parseInt(process.env.TICK_RATE || '60', 10),
  MAX_ROOMS: parseInt(process.env.MAX_ROOMS || '1000', 10),
  ROOM_INACTIVE_TIMEOUT_MS: parseInt(process.env.ROOM_INACTIVE_TIMEOUT_MS || '300000', 10), // 5 min
  RECONNECT_TIMEOUT_MS: parseInt(process.env.RECONNECT_TIMEOUT_MS || '15000', 10), // 15 sec
  RATE_LIMIT_MAX_PACKETS: parseInt(process.env.RATE_LIMIT_MAX_PACKETS || '30', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000', 10),
  GAME: {
    DEFAULT_HEALTH: 100,
    MAX_ROUNDS: 3,
    ROUND_DURATION_SEC: 60,
    MAP_BOUNDS: {
      MIN_X: 50,
      MAX_X: 1150,
      GROUND_Y: 500,
    },
    PHYSICS: {
      GRAVITY: 1200, // px / s^2
      MOVE_SPEED: 350, // px / s
      JUMP_FORCE: -650, // px / s
      FRICTION: 0.85,
    },
    COMBAT: {
      ATTACK_RANGE: 70, // px
      ATTACK_DAMAGE: 15,
      ATTACK_COOLDOWN_MS: 400,
      KNOCKBACK_FORCE: 250,
    },
    PLAYER_SIZE: {
      WIDTH: 40,
      HEIGHT: 90,
    }
  }
} as const;
