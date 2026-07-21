import { PhysicsEngine } from '../../src/game/PhysicsEngine';
import { PlayerState } from '../../src/types/game';
import { CONFIG } from '../../src/config';

describe('PhysicsEngine Unit Tests', () => {
  let physicsEngine: PhysicsEngine;
  let mockPlayer: PlayerState;

  beforeEach(() => {
    physicsEngine = new PhysicsEngine();
    mockPlayer = {
      id: 'p1',
      socketId: 'sock1',
      nickname: 'Stickman1',
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
      reconnectToken: 'token123',
      score: 0,
      playerIndex: 1,
    };
  });

  test('should update horizontal position when moving right', () => {
    const initialX = mockPlayer.position.x;
    physicsEngine.updatePlayer(mockPlayer, 0.1, 1);

    expect(mockPlayer.velocity.x).toBe(CONFIG.GAME.PHYSICS.MOVE_SPEED);
    expect(mockPlayer.position.x).toBeGreaterThan(initialX);
    expect(mockPlayer.direction).toBe('right');
    expect(mockPlayer.currentAnimation).toBe('walk');
  });

  test('should update horizontal position when moving left', () => {
    const initialX = mockPlayer.position.x;
    physicsEngine.updatePlayer(mockPlayer, 0.1, -1);

    expect(mockPlayer.velocity.x).toBe(-CONFIG.GAME.PHYSICS.MOVE_SPEED);
    expect(mockPlayer.position.x).toBeLessThan(initialX);
    expect(mockPlayer.direction).toBe('left');
  });

  test('should apply jump force when grounded', () => {
    const jumped = physicsEngine.jumpPlayer(mockPlayer);

    expect(jumped).toBe(true);
    expect(mockPlayer.velocity.y).toBe(CONFIG.GAME.PHYSICS.JUMP_FORCE);
    expect(mockPlayer.isGrounded).toBe(false);
    expect(mockPlayer.currentAnimation).toBe('jump');
  });

  test('should not jump if already in air', () => {
    mockPlayer.isGrounded = false;
    const jumped = physicsEngine.jumpPlayer(mockPlayer);

    expect(jumped).toBe(false);
  });

  test('should clamp player within map bounds', () => {
    mockPlayer.position.x = 0; // Far left past MIN_X
    physicsEngine.updatePlayer(mockPlayer, 0.1, -1);

    const minAllowed = CONFIG.GAME.MAP_BOUNDS.MIN_X + CONFIG.GAME.PLAYER_SIZE.WIDTH / 2;
    expect(mockPlayer.position.x).toBeGreaterThanOrEqual(minAllowed);
  });
});
