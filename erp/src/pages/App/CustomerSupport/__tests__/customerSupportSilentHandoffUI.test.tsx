// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConversationItem } from '../components/ConversationItem';
import { ChatArea } from '../components/ChatArea';
import { WhatsAppConversation } from '../types';

afterEach(() => {
  cleanup();
});

// Mock do AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'agent-user-01', email: 'atendente@morante.com' },
    profile: { id: 'agent-user-01', full_name: 'Atendente Lizandro', role: 'gerente' },
  }),
}));

// Mock dos serviços de mensageria e formulários
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => ({
  sendCustomerSupportMessage: vi.fn(),
  updateConversationAiStatus: vi.fn(),
}));

const mockBaseConversation: WhatsAppConversation = {
  id: 'conv-test-01',
  businessPhoneNumberId: 'biz-phone-01',
  contactPhone: '5541999999999',
  contactWaId: '5541999999999',
  contactName: 'Carlos Silva',
  customerId: null,
  customerLinkStatus: 'unlinked',
  lastMessageText: 'Qual o valor do frete?',
  lastMessageAt: new Date().toISOString(),
  lastCustomerMessageAt: new Date().toISOString(),
  unreadCount: 0,
  isArchived: false,
  internalNotes: '',
  tags: [],
  assignedTo: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  aiStatus: 'active',
};

describe('Central de Atendimento — Interface de Escalonamento Silencioso (UI)', () => {
  it('ConversationItem exibe badge "Intervenção necessária" quando aiStatus é needs_human', () => {
    const convNeedsHuman: WhatsAppConversation = {
      ...mockBaseConversation,
      aiStatus: 'needs_human',
      aiHandoffReason: 'Endereço não localizado na consulta de distância da loja.',
    };

    render(
      <ConversationItem
        conversation={convNeedsHuman}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    const badge = screen.getByTestId('badge-intervencao-necessaria');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Intervenção necessária');
  });

  it('ConversationItem NÃO exibe badge de intervenção quando aiStatus é active ou human_active', () => {
    const { rerender } = render(
      <ConversationItem
        conversation={{ ...mockBaseConversation, aiStatus: 'active' }}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    expect(screen.queryByTestId('badge-intervencao-necessaria')).toBeNull();

    rerender(
      <ConversationItem
        conversation={{ ...mockBaseConversation, aiStatus: 'human_active' }}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    expect(screen.queryByTestId('badge-intervencao-necessaria')).toBeNull();
  });

  it('ChatArea exibe banner persistente de intervenção humana quando aiStatus é needs_human', () => {
    const convNeedsHuman: WhatsAppConversation = {
      ...mockBaseConversation,
      aiStatus: 'needs_human',
      aiHandoffReason: 'A IA não encontrou uma regra confiável para confirmar essa solicitação de montagem.',
    };

    const handleUpdateAiStatusSpy = vi.fn();

    render(
      <ChatArea
        conversation={convNeedsHuman}
        teamMembers={[]}
        messages={[]}
        isLoadingMessages={false}
        onBackMobile={vi.fn()}
        onToggleInfoPanel={vi.fn()}
        onToggleArchive={vi.fn()}
        onUpdateAiStatus={handleUpdateAiStatusSpy}
      />
    );

    const banner = screen.getByTestId('banner-intervencao-humana');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Intervenção humana necessária');
    expect(banner.textContent).toContain('IA pausada nesta conversa');
    expect(banner.textContent).toContain('Aviso interno — não enviado ao cliente');
    expect(banner.textContent).toContain('A IA não encontrou uma regra confiável para confirmar essa solicitação de montagem.');

    // Clica em "Assumir atendimento"
    const btnAssumir = screen.getByRole('button', { name: /Assumir atendimento/i });
    fireEvent.click(btnAssumir);
    expect(handleUpdateAiStatusSpy).toHaveBeenCalledWith('human_active');

    // Clica em "Reativar IA"
    const btnReativar = screen.getByRole('button', { name: /Reativar IA/i });
    fireEvent.click(btnReativar);
    expect(handleUpdateAiStatusSpy).toHaveBeenCalledWith('active');
  });

  it('ChatArea NÃO exibe o banner de intervenção quando a IA está ativa ou quando o atendente já assumiu', () => {
    const { rerender } = render(
      <ChatArea
        conversation={{ ...mockBaseConversation, aiStatus: 'active' }}
        teamMembers={[]}
        messages={[]}
        isLoadingMessages={false}
        onBackMobile={vi.fn()}
        onToggleInfoPanel={vi.fn()}
        onToggleArchive={vi.fn()}
      />
    );

    expect(screen.queryByTestId('banner-intervencao-humana')).toBeNull();

    rerender(
      <ChatArea
        conversation={{ ...mockBaseConversation, aiStatus: 'human_active' }}
        teamMembers={[]}
        messages={[]}
        isLoadingMessages={false}
        onBackMobile={vi.fn()}
        onToggleInfoPanel={vi.fn()}
        onToggleArchive={vi.fn()}
      />
    );

    expect(screen.queryByTestId('banner-intervencao-humana')).toBeNull();
  });
});
