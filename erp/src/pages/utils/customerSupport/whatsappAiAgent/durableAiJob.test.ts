import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ trigger: vi.fn(), eligibility: vi.fn(), dispatch: vi.fn(), persist: vi.fn() }));
vi.mock('./orchestrator/inboundTriggerHandler.js', () => ({ maybeTriggerWhatsAppAiAgent: mocks.trigger }));
vi.mock('./orchestrator/turnEligibility.js', () => ({ evaluateTurnPreconditions: mocks.eligibility }));
vi.mock('./whatsappAiAgentDispatcher.js', () => ({ dispatchAiResponse: mocks.dispatch }));
vi.mock('./dispatcher/dispatchOutcomeRecorder.js', () => ({ persistOutboundMessageAndSyncConversation: mocks.persist }));
import { processDurableAiJob } from './durableAiJob.js';

const saved = { aiResponseText: 'Olá!', toolsUsed: [], situationKey: null, matchedKeywords: [],
  enforcedPhrases: [], relevantArticleIds: [], workflowKey: null, executionTimeMs: 1 };
const makeJob = (changes: Record<string, unknown> = {}) => ({ id: 'job', token: 'token', attempts: 1,
  phase: 'pending', response: null, dispatchStatus: null, dispatchMessageId: null, dispatchSentAt: null,
  inbound: { conversationId: 'conversation', messageId: 'message', from: 'phone', contactPhoneE164: 'phone',
    text: 'Olá', wamid: 'wamid.in', businessPhoneNumberId: 'business' }, ...changes });
const database = (jobs: unknown[]) => ({ rpc: vi.fn(async (name: string) => name === 'customer_support_claim_ai_job'
  ? { data: jobs.shift() ?? null, error: null } : { data: true, error: null }) });

describe('recuperação de mensagens do atendente', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.persist.mockResolvedValue(undefined); });

  it('reagenda uma falha e conclui a mesma mensagem quando a próxima tentativa funciona', async () => {
    const db = database([makeJob(), makeJob({ attempts: 2 })]);
    mocks.trigger.mockResolvedValueOnce({ executed: false, reason: 'exception' })
      .mockResolvedValueOnce({ executed: true, reason: 'automatic_sent' });
    await processDurableAiJob(db as any, 'job');
    await processDurableAiJob(db as any, 'job');
    const finishes = db.rpc.mock.calls.filter(([name]) => name === 'customer_support_finish_ai_job');
    expect(finishes.map(([, args]: any) => args.p_outcome)).toEqual(['retry', 'completed']);
  });

  it('não executa duas vezes quando outra instância já adquiriu o trabalho', async () => {
    const db = database([makeJob(), null]);
    mocks.trigger.mockResolvedValue({ executed: true, reason: 'automatic_sent' });
    await Promise.all([processDurableAiJob(db as any, 'job'), processDurableAiJob(db as any, 'job')]);
    expect(mocks.trigger).toHaveBeenCalledTimes(1);
  });

  it('recupera uma resposta aceita pela Meta sem reenviar ao cliente', async () => {
    const db = database([makeJob({ phase: 'sending', response: saved, dispatchStatus: 'sent', dispatchMessageId: 'wamid.out' })]);
    await processDurableAiJob(db as any, 'job');
    expect(mocks.persist).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      apiMessageId: 'wamid.out', idempotent: true,
    }));
    expect(mocks.trigger).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith('customer_support_finish_ai_job', expect.objectContaining({ p_outcome: 'completed' }));
  });

  it('encaminha o envio incerto à equipe sem tentar reenviar', async () => {
    const db = database([makeJob({ phase: 'sending', response: saved, dispatchStatus: 'dispatching' })]);
    await processDurableAiJob(db as any, 'job');
    expect(mocks.trigger).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith('customer_support_finish_ai_job', expect.objectContaining({ p_outcome: 'handoff' }));
  });

  it('retoma uma resposta salva antes do envio sem chamar o modelo novamente', async () => {
    const db = database([makeJob({ phase: 'ready', response: saved })]);
    mocks.eligibility.mockResolvedValue({ eligible: true, config: { supportMode: 'automatico' }, conv: {}, settings: {} });
    mocks.dispatch.mockResolvedValue({ executed: true, reason: 'automatic_sent' });
    await processDurableAiJob(db as any, 'job');
    expect(mocks.trigger).not.toHaveBeenCalled();
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ aiResponseText: 'Olá!' }));
  });
});
