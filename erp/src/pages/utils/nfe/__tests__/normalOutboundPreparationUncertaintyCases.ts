import { expect, it, vi } from 'vitest';
import {
  OUTBOUND_ATTEMPT_STATUS_TIMEOUT_MS,
  readOutboundAttemptStatus,
} from '../../../../../../api/nfe/normal-sale/outboundStatus';
import { OUTBOUND_PREPARATION_TIMEOUT_MS } from '../../../../../../api/nfe/normal-sale/normalSalePreparation';
import { recoverNormalSale } from '../../../../../../api/nfe/normal-sale/outboundAttempt';
import {
  command,
  commandWithPreview,
  database,
  emit,
  emitFromPreview,
  preview,
  requestId,
} from './harness/normalOutboundTestHarness';

export function registerNormalOutboundPreparationUncertaintyCases({
  mocks,
}: {
  mocks: { send: ReturnType<typeof vi.fn> };
}): void {
  it.each([
    { code: '55P03', message: 'FISCAL_PREPARATION_BUSY' },
    { code: '55P03', message: 'canceling statement due to lock timeout' },
  ])('preserves a busy preparation for consultation without reserving or sending ($message)', async (error) => {
    const d = database();
    const rpc = d.rpc.getMockImplementation()!;
    d.rpc.mockImplementation(async (name, args) => name === 'prepare_nfe_outbound_attempt'
      ? { data: null, error }
      : rpc(name, args));
    const result = await emit(d);
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ code: 'FISCAL_PREPARATION_BUSY', pending: true, emissionRequestId: requestId, sefazContacted: false });
    expect(result.body.numberReserved).toBeUndefined();
    expect(d.counters.size).toBe(0);
    expect(d.rpc.mock.calls.filter(([name]) => name === 'prepare_nfe_outbound_attempt')).toHaveLength(1);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('returns before the browser deadline and never transmits if preparation commits late', async () => {
    const d = database();
    const c = command();
    const prepared = await preview(d, c);
    const rpc = d.rpc.getMockImplementation()!;
    let commitLate: (() => Promise<void>) | undefined;
    d.rpc.mockImplementation((name, args) => name === 'prepare_nfe_outbound_attempt'
      ? new Promise((resolve) => { commitLate = async () => { resolve(await rpc(name, args)); }; })
      : rpc(name, args));
    vi.useFakeTimers();
    const running = emitFromPreview(d, c, prepared);
    await vi.waitFor(() => expect(commitLate).toBeTypeOf('function'));
    await vi.advanceTimersByTimeAsync(OUTBOUND_PREPARATION_TIMEOUT_MS);
    const result = await running;
    expect(result.body).toMatchObject({ code: 'FISCAL_PREPARATION_UNCONFIRMED', databaseCode: 'FISCAL_PREPARATION_TIMEOUT', pending: true, sefazContacted: false, emissionRequestId: requestId });
    expect(result.body.numberReserved).toBeUndefined();
    expect(d.attempts).toHaveLength(0);
    await commitLate?.();
    expect(d.attempts).toHaveLength(1);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(d.rpc.mock.calls.some(([name]) => name === 'start_nfe_outbound_transmission')).toBe(false);
  });
  it('bounds a stalled read-only status query without starting a fiscal operation', async () => {
    const d = database();
    const from = vi.mocked(d.db.from).getMockImplementation()!;
    vi.spyOn(d.db, 'from').mockImplementation(((table: string) => {
      const query = from(table as any) as any;
      query.maybeSingle = () => new Promise(() => {});
      return query;
    }) as any);
    vi.useFakeTimers();
    const running = readOutboundAttemptStatus(d.db, command().orderId, 1, requestId);
    await vi.advanceTimersByTimeAsync(OUTBOUND_ATTEMPT_STATUS_TIMEOUT_MS);
    expect(await running).toMatchObject({ kind: 'unavailable' });
    expect(d.rpc).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('lost preparation response preserves the committed attempt without starting transmission', async () => {
    const d = database();
    const rpc = d.rpc.getMockImplementation()!;
    d.rpc.mockImplementation(async (name, args) => {
      const result = await rpc(name, args);
      if (name === 'prepare_nfe_outbound_attempt') throw new Error('TEST_UNIT_RESPONSE_LOST');
      return result;
    });
    const r = await emit(d);
    expect(r.body).toMatchObject({
      pending: true,
      numberReserved: true,
      emissionRequestId: requestId,
    });
    expect(d.attempts).toHaveLength(1);
    expect(mocks.send).not.toHaveBeenCalled();
    d.rpc.mockImplementation(rpc);
    d.attempts[0].attempt_token = null;
    const resumed = await recoverNormalSale(d.db, commandWithPreview(d));
    expect(resumed?.body).toMatchObject({ success: true, nfeNumber: 102 });
    expect(d.attempts).toHaveLength(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('unknown preparation failure keeps the intent pending without claiming no number was reserved', async () => {
    const d = database();
    const rpc = d.rpc.getMockImplementation()!;
    d.rpc.mockImplementation(async (name, args) => {
      if (name === 'prepare_nfe_outbound_attempt') throw new Error('TEST_UNIT_NETWORK_LOSS');
      return rpc(name, args);
    });
    const r = await emit(d);
    expect(r.body).toMatchObject({
      pending: true,
      code: 'FISCAL_PREPARATION_UNCONFIRMED',
      emissionRequestId: requestId,
      sefazContacted: false,
    });
    expect(r.body.numberReserved).toBeUndefined();
    expect(d.attempts).toHaveLength(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
}
