import { CombatEngine } from '../../src/game/CombatEngine';
import { PlayerState } from '../../src/types/game';
import { CONFIG } from '../../src/config';

describe('CombatEngine Unit Tests', () => {
  let combatEngine: CombatEngine;
  let attacker: PlayerState;
  let victim: PlayerState;

  beforeEach(() => {
    combatEngine = new CombatEngine();
    attacker = {
      id: 'p1',
      socketId: 'sock1',
      nickname: 'Attacker',
      position: { x: 500, y: CONFIG.GAME.MAP_BOUNDS.GROUND_Y },
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
      isBot: false,
      reconnectToken: 'token1',
      score: 0,
      playerIndex: 1,
    };

    victim = {
      id: 'p2',
      socketId: 'sock2',
      nickname: 'Victim',
      position: { x: 540, y: CONFIG.GAME.MAP_BOUNDS.GROUND_Y }, // within attack range (40px away)
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
      reconnectToken: 'token2',
      score: 0,
      playerIndex: 2,
    };
  });

  test('should deal damage and knockback on successful hit', () => {
    const hits = combatEngine.executeAttack(attacker, [victim]);

    expect(hits).toHaveLength(1);
    expect(hits[0].attackerId).toBe('p1');
    expect(hits[0].victimId).toBe('p2');
    expect(hits[0].damage).toBe(CONFIG.GAME.COMBAT.ATTACK_DAMAGE);

    expect(victim.health).toBe(100 - CONFIG.GAME.COMBAT.ATTACK_DAMAGE);
    expect(victim.velocity.x).toBeGreaterThan(0); // Knockback right
    expect(attacker.isAttacking).toBe(true);
    expect(attacker.attackCooldown).toBe(CONFIG.GAME.COMBAT.ATTACK_COOLDOWN_MS);
  });

  test('should not hit if victim is facing opposite direction out of range', () => {
    victim.position.x = 700; // Far away out of attack range
    const hits = combatEngine.executeAttack(attacker, [victim]);

    expect(hits).toHaveLength(0);
    expect(victim.health).toBe(100);
  });

  test('should respect attack cooldown', () => {
    combatEngine.executeAttack(attacker, [victim]);
    expect(attacker.attackCooldown).toBeGreaterThan(0);

    // Try attacking again immediately while in cooldown
    const secondHits = combatEngine.executeAttack(attacker, [victim]);
    expect(secondHits).toHaveLength(0);
  });
});
