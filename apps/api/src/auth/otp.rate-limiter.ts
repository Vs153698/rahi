import { Injectable } from '@nestjs/common';

/**
 * In-memory sliding-window rate limiter for OTP requests, keyed by phone.
 * Phase 0 implementation — single-instance only. Phase 1 moves this to Redis
 * (Upstash) so it holds across API replicas (rahi-docs/01 §3, /10).
 */
@Injectable()
export class OtpRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs = 60 * 60 * 1000; // 1 hour
  private readonly maxPerWindow = 5;
  private readonly minIntervalMs = 30 * 1000; // 30s between sends

  /** Returns true if a send is allowed now; records the attempt when allowed. */
  allow(phone: string, now: number = Date.now()): boolean {
    const recent = (this.hits.get(phone) ?? []).filter((t) => now - t < this.windowMs);

    const lastSent = recent[recent.length - 1];
    if (lastSent !== undefined && now - lastSent < this.minIntervalMs) return false;
    if (recent.length >= this.maxPerWindow) return false;

    recent.push(now);
    this.hits.set(phone, recent);
    return true;
  }
}
