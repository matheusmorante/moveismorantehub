import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handoff: vi.fn(), complete: vi.fn(), history: vi.fn(), model: vi.fn(), context: vi.fn(), recordHandoff: vi.fn(),
  dispatch: vi.fn(),
}));
vi.mock('./index.js', () => ({
  buildTurnContext: mocks.context,
  fetchAndFormatConversationHistory: mocks.history,
}));
vi.mock('./turnHandoffHandler.js', () => ({ handleImmediateSituationHandoff: mocks.handoff }));
vi.mock('../tools/handoffService.js', () => ({
  buildAiFailureHandoffReason: (error: Error, stage: string) => `Falha em ${stage}: ${error.message}`,
  recordHandoffToHuman: mocks.recordHandoff,
}));
vi.mock('../whatsappAiModelRunner.js', () => ({ runAiTurnWithFallback: mocks.model }));
vi.mock('../whatsappAiAgentDispatcher.js', () => ({ dispatchAiResponse: mocks.dispatch }));
vi.mock('../whatsappAiAgentSecurity.js', () => ({
  markMessageInFlight: vi.fn(), markMessageProcessed: vi.fn(), releaseMessageInFlight: vi.fn(),
  completeDistributedAiTurnLock: mocks.complete, releaseConversationInFlight: vi.fn(),
}));
import { executeWhatsAppAiTurn } from './turnExecutionPipeline.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockReturnValue({ situation: { action: 'reply', name: '', situationKey: null },
    matchedKeywords: [], relevantArticles: [], activeWorkflow: null, systemInstructionText: '' });
  mocks.handoff.mockResolvedValue(undefined);
  mocks.recordHandoff.mockResolvedValue({ success: true });
  mocks.dispatch.mockResolvedValue({ executed: true, reason: 'automatic_sent' });
});

it('finaliza o encaminhamento confirmado sem chamar a OpenAI nem enviar mensagem ao cliente', async () => {
  mocks.context.mockReturnValue({ situation: { action: 'handoff_human', name: 'Atendente', situationKey: 'humano' },
    matchedKeywords: [], relevantArticles: [], activeWorkflow: null, systemInstructionText: '' });
  mocks.complete.mockResolvedValue({ success: true });
  const result = await executeWhatsAppAiTurn({} as any,
    { conversationId: 'c', wamid: 'w', text: 'quero um atendente' } as any,
    {} as any, {} as any, {}, {}, { turnId: 't', lockToken: 'l' });
  expect(result.reason).toBe('silent_handoff_no_customer_message');
  expect(mocks.handoff).toHaveBeenCalledOnce();
  expect(mocks.model).not.toHaveBeenCalled();
  expect(mocks.history).not.toHaveBeenCalled();
});

it('encaminha para um humano sem expor erro quando a IA falha ao responder', async () => {
  mocks.history.mockResolvedValue({ historyForOpenAi: [{ role: 'user', content: 'qual o modelo disponível?' }] });
  mocks.model.mockRejectedValue(new Error('OpenAI indisponível (503)'));
  mocks.complete.mockResolvedValue({ success: true });
  const result = await executeWhatsAppAiTurn({} as any,
    { conversationId: 'c', wamid: 'w', text: 'qual o modelo disponível?' } as any,
    {} as any, {} as any, {}, { openAiApiKey: 'test-key' }, { turnId: 't', lockToken: 'l' });
  expect(result.executed).toBe(true);
  expect(result.reason).toBe('silent_handoff_no_customer_message');
  expect(result.error).toBeUndefined();
  expect(mocks.recordHandoff).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    conversationId: 'c', isSilent: true, reason: expect.stringContaining('OpenAI indisponível (503)'),
  }));
  expect(mocks.complete).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'completed' }));
});

it('solicita intervenção humana sem retornar erro quando o envio ao cliente falha', async () => {
  mocks.history.mockResolvedValue({ historyForOpenAi: [{ role: 'user', content: 'qual o modelo disponível?' }] });
  mocks.model.mockResolvedValue({ text: 'Temos alguns modelos disponíveis.', toolsCalled: [], modelEffective: 'gpt-6-luna' });
  mocks.dispatch.mockResolvedValue({ executed: false, reason: 'meta_api_rejected', error: 'HTTP 429' });
  mocks.complete.mockResolvedValue({ success: true });

  const result = await executeWhatsAppAiTurn({} as any,
    { conversationId: 'c', wamid: 'w', text: 'qual o modelo disponível?' } as any,
    {} as any, {} as any, {}, { openAiApiKey: 'test-key' }, { turnId: 't', lockToken: 'l' });

  expect(result.executed).toBe(true);
  expect(result.reason).toBe('silent_handoff_no_customer_message');
  expect(result.error).toBeUndefined();
  expect(mocks.recordHandoff).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    conversationId: 'c', isSilent: true,
    reason: expect.stringContaining('meta_api_rejected'),
  }));
});

it('não processa em cadeia outras mensagens depois de a IA pedir intervenção humana', async () => {
  mocks.history.mockResolvedValue({ historyForOpenAi: [{ role: 'user', content: 'não sei qual produto escolher' }] });
  mocks.model.mockResolvedValue({
    text: 'Atendimento encaminhado à equipe.',
    toolsCalled: ['encaminharParaAtendimentoHumano'],
    modelEffective: 'gpt-6-luna',
    handoffConfirmed: true,
  });
  mocks.dispatch.mockResolvedValue({ executed: true, reason: 'silent_handoff_no_customer_message' });
  mocks.complete.mockResolvedValue({ success: true, hasPending: true });

  const result = await executeWhatsAppAiTurn({} as any,
    { conversationId: 'c', wamid: 'w', text: 'não sei qual produto escolher' } as any,
    {} as any, {} as any, {}, { openAiApiKey: 'test-key' }, { turnId: 't', lockToken: 'l' });

  expect(result.executed).toBe(true);
  expect(result.reason).toBe('silent_handoff_no_customer_message');
  expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ isSilentHandoff: true }));
});
