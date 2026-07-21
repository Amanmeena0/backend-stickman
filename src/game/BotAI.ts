import { PlayerState } from '../types/game.js';
import { CONFIG } from '../config/index.js';

export interface BotAction {
  moveDirection: -1 | 0 | 1;
  shouldJump: boolean;
  shouldAttack: boolean;
}

export class BotAI {
  private lastJumpTime: number = 0;
  private jumpCooldownMs: number = 1500;

  /**
   * Decide action for the bot in the current game tick.
   */
  public update(bot: PlayerState, target: PlayerState): BotAction {
    if (bot.health <= 0 || !target || target.health <= 0) {
      return { moveDirection: 0, shouldJump: false, shouldAttack: false };
    }

    const dx = target.position.x - bot.position.x;
    const absDx = Math.abs(dx);
    const attackRange = CONFIG.GAME.COMBAT.ATTACK_RANGE * 0.85;

    let moveDirection: -1 | 0 | 1 = 0;
    let shouldAttack = false;
    let shouldJump = false;

    // 1. Movement logic: Approach opponent
    if (absDx > attackRange) {
      moveDirection = dx > 0 ? 1 : -1;
    } else {
      // In range: stop moving and prepare attack
      moveDirection = 0;
      bot.direction = dx > 0 ? 'right' : 'left';
      if (bot.attackCooldown === 0) {
        shouldAttack = true;
      }
    }

    // 2. Jump logic: Jump if opponent is jumping/higher, or random obstacle jump
    const now = Date.now();
    if (bot.isGrounded && now - this.lastJumpTime > this.jumpCooldownMs) {
      const targetIsHigher = target.position.y < bot.position.y - 40;
      const randomJump = Math.random() < 0.05 && absDx < 300;

      if (targetIsHigher || randomJump) {
        shouldJump = true;
        this.lastJumpTime = now;
      }
    }

    return { moveDirection, shouldJump, shouldAttack };
  }
}
