import { CONFIG } from '../config/index.js';

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

export class SocketRateLimiter {
  private trackers: Map<string, RateLimitTracker> = new Map();
  private readonly maxPackets: number;
  private readonly windowMs: number;
  private timerId: NodeJS.Timeout | null = null;

  constructor(
    maxPackets: number = CONFIG.RATE_LIMIT_MAX_PACKETS,
    windowMs: number = CONFIG.RATE_LIMIT_WINDOW_MS
  ) {
    this.maxPackets = maxPackets;
    this.windowMs = windowMs;
    this.timerId = setInterval(() => this.cleanup(), 10000);
  }

  public allow(socketId: string): boolean {
    const now = Date.now();
    let tracker = this.trackers.get(socketId);

    if (!tracker || now > tracker.resetTime) {
      tracker = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.trackers.set(socketId, tracker);
      return true;
    }

    if (tracker.count >= this.maxPackets) {
      return false;
    }

    tracker.count += 1;
    return true;
  }

  public reset(socketId: string): void {
    this.trackers.delete(socketId);
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [id, tracker] of this.trackers.entries()) {
      if (now > tracker.resetTime) {
        this.trackers.delete(id);
      }
    }
  }

  public destroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.trackers.clear();
  }
}
