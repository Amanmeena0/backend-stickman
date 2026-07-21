import { PlayerState, BoundingBox } from '../types/game.js';
import { CONFIG } from '../config/index.js';
import { VectorUtils } from '../utils/vector.js';

export class PhysicsEngine {
  private readonly gravity = CONFIG.GAME.PHYSICS.GRAVITY;
  private readonly moveSpeed = CONFIG.GAME.PHYSICS.MOVE_SPEED;
  private readonly jumpForce = CONFIG.GAME.PHYSICS.JUMP_FORCE;
  private readonly friction = CONFIG.GAME.PHYSICS.FRICTION;

  private readonly minX = CONFIG.GAME.MAP_BOUNDS.MIN_X;
  private readonly maxX = CONFIG.GAME.MAP_BOUNDS.MAX_X;
  private readonly groundY = CONFIG.GAME.MAP_BOUNDS.GROUND_Y;

  private readonly playerWidth = CONFIG.GAME.PLAYER_SIZE.WIDTH;
  private readonly playerHeight = CONFIG.GAME.PLAYER_SIZE.HEIGHT;

  /**
   * Update physics position and velocity for a player over timestep dt (in seconds).
   */
  public updatePlayer(player: PlayerState, dt: number, moveInput: -1 | 0 | 1): void {
    if (player.health <= 0) {
      player.currentAnimation = 'dead';
      return;
    }

    // 1. Update horizontal velocity based on input
    if (moveInput !== 0) {
      player.velocity.x = moveInput * this.moveSpeed;
      player.direction = moveInput > 0 ? 'right' : 'left';
      if (player.isGrounded && !player.isAttacking) {
        player.currentAnimation = 'walk';
      }
    } else {
      player.velocity.x *= this.friction;
      if (Math.abs(player.velocity.x) < 5) {
        player.velocity.x = 0;
      }
      if (player.isGrounded && !player.isAttacking) {
        player.currentAnimation = 'idle';
      }
    }

    // 2. Apply gravity
    player.velocity.y += this.gravity * dt;

    // 3. Update positions
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    // 4. Ground collision
    if (player.position.y >= this.groundY) {
      player.position.y = this.groundY;
      player.velocity.y = 0;
      player.isGrounded = true;
    } else {
      player.isGrounded = false;
      if (!player.isAttacking) {
        player.currentAnimation = 'jump';
      }
    }

    // 5. Horizontal map boundary collision
    const halfWidth = this.playerWidth / 2;
    if (player.position.x - halfWidth < this.minX) {
      player.position.x = this.minX + halfWidth;
      player.velocity.x = 0;
    } else if (player.position.x + halfWidth > this.maxX) {
      player.position.x = this.maxX - halfWidth;
      player.velocity.x = 0;
    }
  }

  /**
   * Execute jump for a player if grounded.
   */
  public jumpPlayer(player: PlayerState): boolean {
    if (player.isGrounded && player.health > 0) {
      player.velocity.y = this.jumpForce;
      player.isGrounded = false;
      player.currentAnimation = 'jump';
      return true;
    }
    return false;
  }

  /**
   * Get bounding box for a player position.
   */
  public getPlayerBoundingBox(player: PlayerState): BoundingBox {
    return {
      x: player.position.x - this.playerWidth / 2,
      y: player.position.y - this.playerHeight,
      width: this.playerWidth,
      height: this.playerHeight,
    };
  }
}
