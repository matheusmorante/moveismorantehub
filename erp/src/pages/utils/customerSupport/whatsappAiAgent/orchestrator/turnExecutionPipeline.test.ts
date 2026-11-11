import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ handoff: vi.fn(), complete: vi.fn(), history: vi.fn(), model: vi.fn() }));
vi.mock('./index.js', () => ({
  buildTurnContext: () => ({ situation: { action: 'handoff_human', name: 'Atendente', situationKey: 'humano' },
    matchedKeywords: [], relevantArticles: [], activeWorkflow: null, systemInstructionText: '' }),
  fetchAndFormatConversationHistory: mocks.history,
}));
vi.mock('./turnHandoffHandler.js', () => ({ handleImmediateSituationHandoff: mocks.handoff }));
vi.mock('../whatsappAiModelRunner.js', () => ({ runAiTurnWithFallback: mocks.model }));
vi.mock('../whatsappAiAgentSecurity.js', () => ({
  markMessageInFlight: vi.fn(), markMessageProcessed: vi.fn(), releaseMessageInFlight: vi.fn(),
  completeDistributedAiTurnLock: mocks.complete, releaseConversationInFlight: vi.fn(),
}));
import { executeWhatsAppAiTurn } from './turnExecutionPipeline.js';

beforeEach(() => { vi.clearAllMocks(); mocks.handoff.mockResolvedValue(undefined); });

it('finaliza o encaminhamento confirmado sem chamar a OpenAI nem enviar mensagem ao cliente', async () => {
  mocks.complete.mockResolvedValue({ success: true });
  const result = await executeWhatsAppAiTurn({} as any,
    { conversationId: 'c', wamid: 'w', text: 'quero um atendente' } as any,
    {} as any, {} as any, {}, {}, { turnId: 't', lockToken: 'l' });
  expect(result.reason).toBe('silent_handoff_no_customer_message');
  expect(mocks.handoff).toHaveBeenCalledOnce();
  expect(mocks.model).not.toHaveBeenCalled();
  expect(mocks.history).not.toHaveBeenCalled();
});

it('não confirma o turno quando a gravação do encaminhamento falha', async () => {
  mocks.handoff.mockRejectedValue(new Error('Falha ao registrar intervenção'));
  mocks.complete.mockResolvedValue({ success: true });
  const result = await executeWhatsAppAiTurn({} as any,
    { conversationId: 'c', wamid: 'w', text: 'quero um atendente' } as any,
    {} as any, {} as any, {}, {}, { turnId: 't', lockToken: 'l' });
  expect(result.executed).toBe(false);
  expect(result.reason).toBe('exception');
  expect(mocks.complete).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'failed' }));
  expect(mocks.model).not.toHaveBeenCalled();
});
