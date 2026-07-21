import { BotAI } from '../../src/game/BotAI';
import { PlayerState } from '../../src/types/game';
import { CONFIG } from '../../src/config';

describe('BotAI Unit Tests', () => {
  let botAI: BotAI;
  let bot: PlayerState;
  let target: PlayerState;

  beforeEach(() => {
    botAI = new BotAI();
    bot = {
      id: 'bot1',
      socketId: null,
      nickname: 'Bot',
      position: { x: 300, y: CONFIG.GAME.MAP_BOUNDS.GROUND_Y },
      velocity: { x: 0, y: 0 },
      direction: 'right',
      health: 100,
      maxHealth: 100,
      isGrounded: true,
      isAttacking: false,
      attackCooldown: 0,
      currentAnimation: 'idle',
      connected: true,
      ready: true,
      isBot: true,
      reconnectToken: 'botToken',
      score: 0,
      playerIndex: 2,
    };

    target = {
      id: 'human',
      socketId: 'sock1',
      nickname: 'Human',
      position: { x: 800, y: CONFIG.GAME.MAP_BOUNDS.GROUND_Y },
      velocity: { x: 0, y: 0 },
      direction: 'left',
      health: 100,
      maxHealth: 100,
      isGrounded: true,
      isAttacking: false,
      attackCooldown: 0,
      currentAnimation: 'idle',
      connected: true,
      ready: true,
      isBot: false,
      reconnectToken: 'humanToken',
      score: 0,
      playerIndex: 1,
    };
  });

  test('should move towards target if outside attack range', () => {
    const decision = botAI.update(bot, target);

    expect(decision.moveDirection).toBe(1); // Move right towards human at x=800
    expect(decision.shouldAttack).toBe(false);
  });

  test('should stop moving and attack if in range', () => {
    target.position.x = 340; // 40px away
    const decision = botAI.update(bot, target);

    expect(decision.moveDirection).toBe(0);
    expect(decision.shouldAttack).toBe(true);
  });

  test('should trigger jump if target is higher in air', () => {
    target.position.y = CONFIG.GAME.MAP_BOUNDS.GROUND_Y - 100; // Airborne target
    const decision = botAI.update(bot, target);

    expect(decision.shouldJump).toBe(true);
  });
});
