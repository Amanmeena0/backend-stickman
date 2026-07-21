import {
  GameState,
  PlayerState,
  DeltaGameState,
  DeltaPlayerUpdate,
} from '../types/game';
import { PhysicsEngine } from './PhysicsEngine';
import { CombatEngine, HitResult } from './CombatEngine';
import { BotAI } from './BotAI';
import { CONFIG } from '../config';
import { Logger } from '../utils/logger';

export interface GameLoopCallbacks {
  onDeltaUpdate: (delta: DeltaGameState) => void;
  onPlayerHit: (hit: HitResult) => void;
  onHealthUpdate: (playerId: string, health: number, maxHealth: number) => void;
  onRoundOver: (winnerId: string | null, round: number, scores: Record<string, number>) => void;
  onMatchOver: (winnerId: string, scores: Record<string, number>) => void;
  onGameStart: (gameState: GameState) => void;
}

export class GameLoop {
  private gameState: GameState;
  private physicsEngine: PhysicsEngine;
  private combatEngine: CombatEngine;
  private botAI?: BotAI;

  private timerId: NodeJS.Timeout | null = null;
  private readonly targetFps = CONFIG.TICK_RATE;
  private readonly dt = 1 / CONFIG.TICK_RATE;
  private readonly dtMs = 1000 / CONFIG.TICK_RATE;

  // Pending inputs per player
  private pendingInputs: Map<string, { moveDirection: -1 | 0 | 1; jump: boolean; attack: boolean }> = new Map();

  private callbacks: GameLoopCallbacks;

  constructor(gameState: GameState, callbacks: GameLoopCallbacks) {
    this.gameState = gameState;
    this.physicsEngine = new PhysicsEngine();
    this.combatEngine = new CombatEngine();
    this.callbacks = callbacks;

    if (gameState.mode === 'bot') {
      this.botAI = new BotAI();
    }
  }

  public get state(): GameState {
    return this.gameState;
  }

  public start(): void {
    if (this.timerId) return;

    this.gameState.status = 'starting';
    this.gameState.roundTimer = 3; // 3-second countdown
    this.callbacks.onGameStart(this.gameState);

    Logger.info(`Game starting in room ${this.gameState.roomCode}`);

    let countdownInterval = setInterval(() => {
      if (this.gameState.status !== 'starting') {
        clearInterval(countdownInterval);
        return;
      }

      this.gameState.roundTimer -= 1;
      if (this.gameState.roundTimer <= 0) {
        clearInterval(countdownInterval);
        this.gameState.status = 'playing';
        this.gameState.roundTimer = CONFIG.GAME.ROUND_DURATION_SEC;
        this.gameState.lastTick = Date.now();
        
        // Start main 60 FPS tick loop
        this.timerId = setInterval(() => this.tick(), this.dtMs);
        Logger.info(`Game loop running at ${this.targetFps} Ticks/sec in room ${this.gameState.roomCode}`);
      }
    }, 1000);
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.gameState.status = 'paused';
  }

  public handlePlayerInput(playerId: string, input: { moveDirection?: -1 | 0 | 1; jump?: boolean; attack?: boolean }): void {
    const player = this.gameState.players[playerId];
    if (!player || player.health <= 0) return;

    let currentInput = this.pendingInputs.get(playerId) || { moveDirection: 0, jump: false, attack: false };

    if (input.moveDirection !== undefined) {
      currentInput.moveDirection = input.moveDirection;
    }
    if (input.jump) {
      currentInput.jump = true;
    }
    if (input.attack) {
      currentInput.attack = true;
    }

    this.pendingInputs.set(playerId, currentInput);
  }

  private tick(): void {
    if (this.gameState.status !== 'playing') return;

    this.gameState.tickCount += 1;
    const playersList = Object.values(this.gameState.players);

    // 1. Process Bot AI if in bot mode
    if (this.botAI) {
      const bot = playersList.find((p) => p.isBot);
      const human = playersList.find((p) => !p.isBot);
      if (bot && human) {
        const botDecision = this.botAI.update(bot, human);
        this.pendingInputs.set(bot.id, {
          moveDirection: botDecision.moveDirection,
          jump: botDecision.shouldJump,
          attack: botDecision.shouldAttack,
        });
      }
    }

    // 2. Process Attack & Movement Inputs
    for (const player of playersList) {
      const input = this.pendingInputs.get(player.id) || { moveDirection: 0, jump: false, attack: false };

      // Handle Jump input
      if (input.jump) {
        this.physicsEngine.jumpPlayer(player);
        input.jump = false; // consume jump trigger
      }

      // Update Physics Movement
      this.physicsEngine.updatePlayer(player, this.dt, input.moveDirection);

      // Handle Attack input
      if (input.attack) {
        const opponents = playersList.filter((p) => p.id !== player.id);
        const hits = this.combatEngine.executeAttack(player, opponents);

        for (const hit of hits) {
          this.callbacks.onPlayerHit(hit);
          this.callbacks.onHealthUpdate(hit.victimId, hit.remainingHealth, CONFIG.GAME.DEFAULT_HEALTH);
        }

        input.attack = false; // consume attack trigger
      }
    }

    // 3. Update combat cooldowns
    this.combatEngine.updateCooldowns(this.gameState.players, this.dtMs);

    // 4. Update Round Timer
    if (this.gameState.tickCount % this.targetFps === 0) {
      this.gameState.roundTimer = Math.max(0, this.gameState.roundTimer - 1);
    }

    // 5. Check Round End Condition (Time limit or Player KO)
    this.checkRoundStatus();

    // 6. Broadcast Delta Update
    this.callbacks.onDeltaUpdate(this.createDeltaUpdate());
  }

  private checkRoundStatus(): void {
    const players = Object.values(this.gameState.players);
    if (players.length < 2) return;

    const [p1, p2] = players;
    let roundEnded = false;
    let roundWinner: PlayerState | null = null;

    if (p1.health <= 0 || p2.health <= 0 || this.gameState.roundTimer <= 0) {
      roundEnded = true;
      if (p1.health > p2.health) {
        roundWinner = p1;
      } else if (p2.health > p1.health) {
        roundWinner = p2;
      } // else draw (null)
    }

    if (roundEnded) {
      if (roundWinner) {
        roundWinner.score += 1;
      }

      this.stop(); // Stop current tick loop
      this.gameState.status = 'round_over';

      const scores: Record<string, number> = {};
      players.forEach((p) => (scores[p.id] = p.score));

      this.callbacks.onRoundOver(roundWinner ? roundWinner.id : null, this.gameState.round, scores);

      // Check Match Winner (Best of MAX_ROUNDS or score >= 2)
      const matchWinner = players.find((p) => p.score >= 2 || (this.gameState.round >= this.gameState.maxRounds && p.score > (players.find((o) => o.id !== p.id)?.score || 0)));

      if (matchWinner || this.gameState.round >= this.gameState.maxRounds) {
        const finalWinnerId = matchWinner ? matchWinner.id : (roundWinner ? roundWinner.id : p1.id);
        this.gameState.status = 'game_over';
        this.gameState.winnerId = finalWinnerId;
        this.callbacks.onMatchOver(finalWinnerId, scores);
      } else {
        // Prepare Next Round after 4s delay
        setTimeout(() => {
          this.resetPlayersForNewRound();
          this.gameState.round += 1;
          this.start();
        }, 4000);
      }
    }
  }

  public resetPlayersForNewRound(): void {
    const players = Object.values(this.gameState.players);
    players.forEach((p, idx) => {
      p.health = CONFIG.GAME.DEFAULT_HEALTH;
      p.position = {
        x: idx === 0 ? 300 : 900,
        y: CONFIG.GAME.MAP_BOUNDS.GROUND_Y,
      };
      p.velocity = { x: 0, y: 0 };
      p.direction = idx === 0 ? 'right' : 'left';
      p.isGrounded = true;
      p.isAttacking = false;
      p.attackCooldown = 0;
      p.currentAnimation = 'idle';
    });
    this.pendingInputs.clear();
  }

  private createDeltaUpdate(): DeltaGameState {
    const deltaPlayers: Record<string, DeltaPlayerUpdate> = {};
    for (const [id, player] of Object.entries(this.gameState.players)) {
      deltaPlayers[id] = {
        id: player.id,
        position: { ...player.position },
        velocity: { ...player.velocity },
        direction: player.direction,
        health: player.health,
        currentAnimation: player.currentAnimation,
        isGrounded: player.isGrounded,
        isAttacking: player.isAttacking,
        connected: player.connected,
        ready: player.ready,
        score: player.score,
      };
    }

    return {
      roomId: this.gameState.roomId,
      status: this.gameState.status,
      round: this.gameState.round,
      roundTimer: this.gameState.roundTimer,
      players: deltaPlayers,
      winnerId: this.gameState.winnerId,
      tickCount: this.gameState.tickCount,
    };
  }
}
