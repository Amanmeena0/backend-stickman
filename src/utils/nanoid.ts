import { customAlphabet } from 'nanoid';

// Clean 6-character uppercase alphanumeric alphabet without confusing characters
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateNanoid = customAlphabet(ALPHABET, 6);

export function generateRoomCode(): string {
  return generateNanoid();
}
