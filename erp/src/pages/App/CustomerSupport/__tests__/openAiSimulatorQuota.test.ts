import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reserve: vi.fn(), release: vi.fn(), record: vi.fn() }));
vi.mock('../../../../../api/_lib/authenticatedErpRequest.js', () => ({
  authenticateErpRequest: vi.fn(async () => ({ userDb: {} })),
}));
vi.mock('../../../../../api/_lib/secureIntegrations/aiQuotaBridge.js', () => ({
  checkAiQuotaOrReject: mocks.reserve, releaseAiReservationSafe: mocks.release,
  recordAiUsageTokensSafe: mocks.record,
}));
import { handleOpenAi } from '../../../../../api/_lib/secureIntegrations/handlers/openAiHandler.js';

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
  mocks.reserve.mockReset().mockResolvedValue({ allowed: true, reservationId: 'reservation' });
  mocks.record.mockReset().mockResolvedValue(true);
  mocks.release.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const request = () => ({ method: 'POST', body: { action: 'responses', moduleSource: 'whatsapp_ai_simulator',
  request: { model: 'gpt-6-luna', input: 'oi', max_output_tokens: 5000 } } }) as any;
const response = () => {
  const res: any = { status: vi.fn(() => res), json: vi.fn((data) => data) };
  return res;
};

it('mantém a reserva quando a rede cai sem confirmar se a OpenAI processou o pedido', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede indisponível')));
  const res = response();
  await handleOpenAi(request(), res);
  expect(res.status).toHaveBeenCalledWith(502);
  expect(mocks.reserve).toHaveBeenCalledOnce();
  expect(mocks.release).not.toHaveBeenCalled();
  expect(mocks.record).not.toHaveBeenCalled();
});

it('limita a saída e registra o consumo confirmado da simulação', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({
    output_text: 'Olá', usage: { input_tokens: 9, output_tokens: 5 },
  }) });
  vi.stubGlobal('fetch', fetchMock);
  const res = response();
  await handleOpenAi(request(), res);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.max_output_tokens).toBe(2048);
  expect(mocks.reserve.mock.calls[0][3]).toBeGreaterThanOrEqual(3072);
  expect(mocks.record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    promptTokens: 9, completionTokens: 5, reservationId: 'reservation',
  }));
  expect(res.status).toHaveBeenCalledWith(200);
});
