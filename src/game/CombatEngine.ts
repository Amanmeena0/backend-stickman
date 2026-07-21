import { PlayerState, Vector2D } from '../types/game';
import { CONFIG } from '../config';
import { VectorUtils } from '../utils/vector';

export interface HitResult {
  attackerId: string;
  victimId: string;
  damage: number;
  remainingHealth: number;
  position: Vector2D;
}

export class CombatEngine {
  private readonly attackRange = CONFIG.GAME.COMBAT.ATTACK_RANGE;
  private readonly attackDamage = CONFIG.GAME.COMBAT.ATTACK_DAMAGE;
  private readonly attackCooldownMs = CONFIG.GAME.COMBAT.ATTACK_COOLDOWN_MS;
  private readonly knockbackForce = CONFIG.GAME.COMBAT.KNOCKBACK_FORCE;

  /**
   * Process cooldown timers for all active players.
   */
  public updateCooldowns(players: Record<string, PlayerState>, dtMs: number): void {
    for (const player of Object.values(players)) {
      if (player.attackCooldown > 0) {
        player.attackCooldown = Math.max(0, player.attackCooldown - dtMs);
        if (player.attackCooldown === 0 && player.isAttacking) {
          player.isAttacking = false;
          if (player.health > 0) {
            player.currentAnimation = player.isGrounded ? 'idle' : 'jump';
          }
        }
      }
    }
  }

  /**
   * Attempt an attack for a player. Returns HitResult array if any targets were hit.
   */
  public executeAttack(
    attacker: PlayerState,
    opponents: PlayerState[]
  ): HitResult[] {
    if (attacker.health <= 0 || attacker.attackCooldown > 0) {
      return [];
    }

    // Trigger attack state
    attacker.isAttacking = true;
    attacker.attackCooldown = this.attackCooldownMs;
    attacker.currentAnimation = 'attack';

    const hits: HitResult[] = [];

    for (const victim of opponents) {
      if (victim.health <= 0 || victim.id === attacker.id) continue;

      // Check distance & facing direction
      const dx = victim.position.x - attacker.position.x;
      const dy = Math.abs(victim.position.y - attacker.position.y);

      const isFacingTarget =
        (attacker.direction === 'right' && dx > 0) ||
        (attacker.direction === 'left' && dx < 0);

      const horizontalDistance = Math.abs(dx);

      if (isFacingTarget && horizontalDistance <= this.attackRange && dy <= 60) {
        // Hit registered!
        victim.health = Math.max(0, victim.health - this.attackDamage);

        // Apply knockback
        const knockbackDir = attacker.direction === 'right' ? 1 : -1;
        victim.velocity.x += knockbackDir * this.knockbackForce;
        victim.velocity.y -= 100; // slight upward pop

        if (victim.health <= 0) {
          victim.currentAnimation = 'dead';
        } else {
          victim.currentAnimation = 'hit';
        }

        hits.push({
          attackerId: attacker.id,
          victimId: victim.id,
          damage: this.attackDamage,
          remainingHealth: victim.health,
          position: { ...victim.position },
        });
      }
    }

    return hits;
  }
}
