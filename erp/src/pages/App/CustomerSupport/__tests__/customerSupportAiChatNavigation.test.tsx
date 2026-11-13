// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CustomerSupport from '../Index';

const mocks = vi.hoisted(() => ({
  mobile: false,
  toggleAgent: vi.fn(),
  simulate: vi.fn(),
  agentConfig: {
    systemPrompt: 'Instruções salvas do agente',
    enabledTools: ['buscarProdutos'],
  },
}));

vi.mock('../hooks/useCustomerSupportPageController', async () => {
  const React = await import('react');
  return {
    useCustomerSupportPageController: () => {
      const [selectedConversation, setSelectedConversation] = React.useState<any>(null);
      const [isAiAgentModalOpen, setIsAiAgentModalOpen] = React.useState(false);
      const [isMobileInboxOpen, setIsMobileInboxOpen] = React.useState(false);
      const supportLayoutRef = React.useRef<HTMLDivElement>(null);
      const inboxPanelRef = React.useRef<HTMLDivElement>(null);
      const conversationPanelRef = React.useRef<HTMLDivElement>(null);
      return {
        user: { id: 'operator' },
        aiAgentConfig: mocks.agentConfig,
        isAdministrator: true,
        isAiAgentEnabled: false,
        isAgentStatusKnown: true,
        isTogglingAiAgent: false,
        handleToggleAiAgent: mocks.toggleAgent,
        isAiAgentModalOpen,
        setIsAiAgentModalOpen,
        supportLayoutRef,
        inboxPanelRef,
        conversationPanelRef,
        isMobileViewport: mocks.mobile,
        isMobileInboxOpen,
        setIsMobileInboxOpen,
        isInboxSidebarOpen: true,
        isConversationSidebarOpen: true,
        inboxPanelVisible: false,
        inboxPanelStyle: {},
        conversationPanelStyle: {},
        conversationSidebarWidth: 300,
        conversations: [],
        selectedConversation,
        setSelectedConversation,
        handleSelectConversation: setSelectedConversation,
        handleToggleConversationPanel: () => setSelectedConversation(null),
        filter: 'all',
        unreadCountTotal: 0,
      };
    },
  };
});

vi.mock('../components', async () => {
  const { NavigationRail } = await vi.importActual<typeof import('../components/NavigationRail')>(
    '../components/NavigationRail'
  );
  return {
    NavigationRail,
    InboxSidebar: () => null,
    EmptyChatState: () => <div>Selecione uma conversa</div>,
  };
});

vi.mock('../components/layout', async () => {
  const { ConversationSidebarColumn } = await vi.importActual<typeof import('../components/layout/ConversationSidebarColumn')>(
    '../components/layout/ConversationSidebarColumn'
  );
  return {
    InboxSidebarColumn: () => null,
    ConversationSidebarColumn,
    CustomerSupportActiveConversation: () => <div>Conversa do cliente</div>,
  };
});

vi.mock('../components/ConversationSidebar', () => ({
  ConversationSidebar: ({ onSelectConversation }: { onSelectConversation: (conversation: unknown) => void }) => (
    <button type="button" onClick={() => onSelectConversation({ id: 'customer-conversation' })}>
      Selecionar cliente
    </button>
  ),
}));
vi.mock('../components/CustomerSupportResizeHandle', () => ({ CustomerSupportResizeHandle: () => null }));
vi.mock('../components/WhatsAppAiAgentModal', () => ({
  WhatsAppAiAgentModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Configurações do agente">
      <button type="button" onClick={onClose}>Fechar configurações</button>
    </div>
  ),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/settings', () => ({ getSettings: () => ({}) }));
vi.mock('@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator', () => ({
  simulateWhatsAppAiTurn: mocks.simulate,
  createSimulatorOpenAiFetch: () => vi.fn(),
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

beforeEach(() => {
  mocks.mobile = false;
  mocks.agentConfig.enabledTools = ['buscarProdutos'];
  mocks.toggleAgent.mockReset();
  mocks.simulate.mockReset();
  mocks.simulate.mockResolvedValue({
    executed: true,
    aiResponseText: 'Resposta de teste',
    situation: null,
    articlesUsed: [],
    workflowApplied: null,
    toolsCalled: [],
    mandatoryPhrasesEnforced: [],
    executionTimeMs: 1,
  });
});
afterEach(cleanup);

it('abre o teste pelo painel esquerdo e preserva a conversa ao trocar de cliente', async () => {
  render(<MemoryRouter><CustomerSupport /></MemoryRouter>);
  const rail = screen.getByRole('complementary', { name: /barra de navegação da central/i });
  const openChat = within(rail).getByRole('button', { name: /conversa de teste com o agente de ia/i });
  expect(within(rail).queryByRole('button', { name: /ligar atendimento/i })).toBeNull();

  fireEvent.click(openChat);
  const chat = document.getElementById('customer-support-ai-test-chat')!;
  expect(chat.getAttribute('aria-hidden')).toBe('false');
  expect(within(chat).queryByRole('button', { name: /ligar atendimento de clientes por ia/i })).toBeNull();
  expect(within(chat).queryByRole('button', { name: /desligar atendimento de clientes por ia/i })).toBeNull();
  expect(mocks.toggleAgent).not.toHaveBeenCalled();

  fireEvent.click(within(chat).getByRole('button', { name: /configurações do agente de ia/i }));
  expect(screen.getByRole('dialog', { name: /configurações do agente/i })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: /fechar configurações/i }));

  const input = within(chat).getByRole('textbox', { name: 'Mensagem para o agente de IA' }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Quero testar um produto' } });
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar cliente' }));
  expect(screen.getByText('Conversa do cliente')).toBeDefined();
  expect(chat.getAttribute('aria-hidden')).toBe('true');

  fireEvent.click(openChat);
  expect(chat.getAttribute('aria-hidden')).toBe('false');
  expect((within(chat).getByRole('textbox', { name: 'Mensagem para o agente de IA' }) as HTMLInputElement).value)
    .toBe('Quero testar um produto');
  fireEvent.click(within(chat).getByRole('button', { name: /enviar/i }));
  await waitFor(() => expect(mocks.simulate).toHaveBeenCalledTimes(1));
  expect(mocks.simulate.mock.calls[0][2]).toEqual(expect.objectContaining({
    systemPrompt: 'Instruções salvas do agente',
    enabledTools: ['buscarProdutos'],
  }));
  expect(mocks.toggleAgent).not.toHaveBeenCalled();
});

it('mostra a conversa de teste no espaço principal e volta à lista no celular', () => {
  mocks.mobile = true;
  render(<MemoryRouter><CustomerSupport /></MemoryRouter>);
  const list = screen.getByTestId('customer-support-conversations-panel');
  fireEvent.click(screen.getByRole('button', { name: /conversa de teste com o agente de ia/i }));
  expect(list.getAttribute('aria-hidden')).toBe('true');
  expect(list.classList.contains('hidden')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /mostrar lista de conversas/i }));
  expect(list.getAttribute('aria-hidden')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: /conversa de teste com o agente de ia/i }));
  fireEvent.click(screen.getByRole('button', { name: /voltar para conversas/i }));
  expect(list.getAttribute('aria-hidden')).toBe('false');
  expect(screen.getByRole('button', { name: 'Selecionar cliente' })).toBeDefined();
  expect(mocks.toggleAgent).not.toHaveBeenCalled();
});

it('mantém uma lista de ferramentas vazia na simulação', async () => {
  mocks.agentConfig.enabledTools = [];
  render(<MemoryRouter><CustomerSupport /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /conversa de teste com o agente de ia/i }));
  fireEvent.change(screen.getByRole('textbox', { name: /mensagem para o agente de ia/i }), {
    target: { value: 'Olá' },
  });
  fireEvent.click(screen.getByRole('button', { name: /enviar mensagem de teste/i }));
  await waitFor(() => expect(mocks.simulate).toHaveBeenCalledTimes(1));
  expect(mocks.simulate.mock.calls[0][2].enabledTools).toEqual([]);
  expect(mocks.toggleAgent).not.toHaveBeenCalled();
});
