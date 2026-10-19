import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), fetch: vi.fn() }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../../api/supabaseSecretKey', () => ({ getSupabaseSecretKey: () => 'unit-test-key' }));

import handler from '../../../../../../api/nfe/automatic-return-transmission-worker';

const job = { job_id: 'job', lease_token: 'lease', return_order_id: 'own-return', attempt_count: 1 };
function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}
function request(secret = 'unit-worker-secret') {
  return { method: 'POST', headers: { 'x-nfe-return-worker-secret': secret } } as unknown as VercelRequest;
}
function waitForAbort(signal: AbortSignal | undefined) {
  return new Promise<never>((_, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('NFE_RETURN_AUTO_WORKER_SECRET', 'unit-worker-secret');
  vi.stubEnv('NFE_RETURN_AUTO_API_BASE_URL', 'https://worker.example.test');
  mocks.createClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockImplementation(async (name: string) => name === 'claim_return_fiscal_emission_job'
    ? { data: [job], error: null } : { data: true, error: null });
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('automatic return worker HTTP boundary', () => {
  it.each(['headers', 'body'])('finishes a job after the fiscal API stalls at %s, without another request', async stage => {
    mocks.fetch.mockImplementation(async (_url: URL, init: RequestInit) => {
      if (stage === 'headers') return waitForAbort(init.signal as AbortSignal | undefined);
      return { ok: true, status: 200, json: () => waitForAbort(init.signal as AbortSignal | undefined) };
    });
    const res = response();
    const execution = handler(request(), res as unknown as VercelResponse).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(45_001);
    expect(res.json).toHaveBeenCalledWith({ processed: 1, outcome: 'retryable' });
    expect(mocks.rpc).toHaveBeenCalledWith('complete_return_fiscal_emission_job', expect.objectContaining({
      p_job_id: job.job_id, p_lease_token: job.lease_token, p_status: 'retryable', p_error_code: 'fiscal_api_timeout',
    }));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await execution;
  });

  it('finishes a successful read and clears its timer', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ eligible: false, hasAuthorizedOriginal: false, sources: [] }) });
    const res = response();
    await handler(request(), res as unknown as VercelResponse);
    expect(res.json).toHaveBeenCalledWith({ processed: 1, outcome: 'not_required' });
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not repeat a transmission when its response times out', async () => {
    mocks.fetch.mockImplementation(async (url: URL, init: RequestInit) => {
      if (url.pathname === '/api/nfe/transmit-operation-draft') return waitForAbort(init.signal as AbortSignal | undefined);
      const payload = url.pathname === '/api/nfe/return-fiscal-eligibility'
        ? { eligible: true, hasAuthorizedOriginal: true, sources: [{ state: 'draft', draftId: 'draft', source: { id: 'source', ambiente: 2 } }] }
        : { draft: { status: 'ready', operation_kind: 'return', return_order_id: job.return_order_id, environment: 2 }, source: { id: 'source', ambiente: 2 }, returnOrder: { id: job.return_order_id } };
      return { ok: true, status: 200, json: async () => payload };
    });
    const res = response();
    const execution = handler(request(), res as unknown as VercelResponse).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(45_001);
    expect(res.json).toHaveBeenCalledWith({ processed: 1, outcome: 'retryable' });
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    const transmissions = mocks.fetch.mock.calls.filter(([url]) => (url as URL).pathname === '/api/nfe/transmit-operation-draft');
    expect(transmissions).toHaveLength(1);
    expect(JSON.parse(transmissions[0][1].body)).toEqual({ draftId: 'draft', productionConfirmed: false });
    expect(mocks.rpc).toHaveBeenCalledWith('complete_return_fiscal_emission_job', expect.objectContaining({ p_status: 'retryable', p_error_code: 'fiscal_api_timeout' }));
    await execution;
  });

  it('rejects an unauthorized caller before reserving a job or requesting fiscal data', async () => {
    const res = response();
    await handler(request('wrong-secret'), res as unknown as VercelResponse);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
