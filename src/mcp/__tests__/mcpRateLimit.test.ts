import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  McpRateLimitError,
  resetRateLimitBuckets,
} from '../middleware/mcpRateLimit.js';

describe('MCP Rate Limiting', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    process.env.MCP_RATE_LIMIT_PER_MINUTE = '5'; // Limite de teste: 5 req/min
  });

  it('1. Permite requisições dentro da cota configurada', () => {
    const r1 = checkRateLimit('chatgpt');
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit('chatgpt');
    expect(r2.remaining).toBe(3);
  });

  it('2. Bloqueia requisições excedentes com 429 Rate Limited', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('client-a');
    }

    expect(() => checkRateLimit('client-a')).toThrowError(McpRateLimitError);
    try {
      checkRateLimit('client-a');
    } catch (err: any) {
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMITED');
      expect(err.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    }
  });

  it('3. Contadores são isolados por cliente/token', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('client-a');
    }

    // client-b ainda tem cota cheia
    const rB = checkRateLimit('client-b');
    expect(rB.remaining).toBe(4);
  });
});
