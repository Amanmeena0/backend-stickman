import { z } from 'zod';

export const createRoomSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, { message: 'Nickname must be at least 2 characters' })
    .max(16, { message: 'Nickname must be at most 16 characters' }),
  mode: z.enum(['pvp', 'bot']).optional().default('pvp'),
});

export const joinRoomSchema = z.object({
  roomCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(6, { message: 'Room code must be exactly 6 characters' }),
  nickname: z
    .string()
    .trim()
    .min(2, { message: 'Nickname must be at least 2 characters' })
    .max(16, { message: 'Nickname must be at most 16 characters' }),
});

export const reconnectSchema = z.object({
  roomId: z.string().uuid({ message: 'Invalid room ID format' }),
  reconnectToken: z.string().uuid({ message: 'Invalid reconnect token' }),
  nickname: z.string().trim().min(2).max(16),
});

export const moveSchema = z.object({
  direction: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

export const pingSchema = z.object({
  clientTimestamp: z.number().positive(),
});
