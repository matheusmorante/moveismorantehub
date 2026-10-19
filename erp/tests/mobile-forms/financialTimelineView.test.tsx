import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ chat: {} as any, choose: vi.fn() }));
vi.mock('react-native', () => ({ View: 'div', Text: 'span', ScrollView: 'section', ActivityIndicator: 'progress', StyleSheet: { create: (value: unknown) => value } }));
vi.mock('lucide-react-native', () => ({ Bot: () => null }));
vi.mock('../../../mobile/src/features/finance/hooks/useFinancialAiChat', () => ({ useFinancialAiChat: () => mocks.chat }));
vi.mock('../../../mobile/src/features/finance/components/AssistantEmptyState', () => ({ AssistantEmptyState: () => null }));
vi.mock('../../../mobile/src/features/finance/components/chat/ChatHeaderToolBar', () => ({ ChatHeaderToolBar: () => null }));
vi.mock('../../../mobile/src/features/finance/components/chat/ChatMessageItem', () => ({ ChatMessageItem: () => null }));
vi.mock('../../../mobile/src/features/finance/components/chat/FinancialChatInputBar', () => ({ FinancialChatInputBar: () => null }));
vi.mock('../../../mobile/src/features/finance/components/chat/GeminiLiveOrb', () => ({ GeminiLiveOrb: () => null }));
vi.mock('../../../mobile/src/features/finance/components/TransactionPreviewCard', () => ({ TransactionPreviewCard: ({ intent, readOnly, onSelectCandidate }: any) => <button disabled={readOnly} onClick={() => onSelectCandidate(intent.candidateAccounts[0])}>Selecionar {intent.description}</button> }));
import { FinancialAiChatView } from '../../../mobile/src/features/finance/components/FinancialAiChatView';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('composição da fila financeira', () => {
  it('mostra o cartão incompleto e entrega sua identidade ao proprietário ao escolher conta', () => {
    const candidate = { id: 'account-1', amount: 12 }; const card = { id: 'card-1', afterMessageId: 'message-1', timestamp: '10:00', cardState: 'NEEDS_INPUT', intent: { description: 'Conta', candidateAccounts: [candidate] } };
    mocks.chat = { messages: [{ id: 'message-1', sender: 'assistant', text: 'Confira a conta' }], timelineCards: [card], handleSelectTimelineCandidate: mocks.choose, inputText: '', loading: false };
    render(<FinancialAiChatView categories={[]} onTransactionRegistered={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Selecionar Conta' }); expect(button).toHaveProperty('disabled', false); fireEvent.click(button);
    expect(mocks.choose).toHaveBeenCalledWith('card-1', candidate);
  });

  it('mantém seleção desabilitada durante outra submissão do proprietário', () => {
    const card = { id: 'card-1', afterMessageId: 'message-1', timestamp: '10:00', cardState: 'NEEDS_INPUT', intent: { description: 'Conta', candidateAccounts: [{ id: 'account-1', amount: 12 }] } };
    mocks.chat = { messages: [{ id: 'message-1', sender: 'assistant', text: 'Confira a conta' }], timelineCards: [card], registering: true, handleSelectTimelineCandidate: mocks.choose, inputText: '', loading: false };
    render(<FinancialAiChatView categories={[]} onTransactionRegistered={vi.fn()} />); const button = screen.getByRole('button', { name: 'Selecionar Conta' }); expect(button).toHaveProperty('disabled', true); fireEvent.click(button); expect(mocks.choose).not.toHaveBeenCalled();
  });
});
