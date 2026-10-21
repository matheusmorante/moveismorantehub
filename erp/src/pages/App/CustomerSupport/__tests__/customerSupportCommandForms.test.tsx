// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatHeader } from '../components/chat/ChatHeader';
import type { WhatsAppConversation } from '../types';

const conversationId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
afterEach(() => cleanup());
const props = () => ({
  conversation: { id: conversationId, tags: [], isArchived: false } as unknown as WhatsAppConversation,
  displayName: 'Contato', formattedPhone: '', initials: 'C',
  careWindow: { isOpen: false, remainingMs: 0, remainingHours: 0, remainingMinutes: 0, expiresAt: null },
  currentStatus: 'open', isSearchingInChat: false, isInfoPanelOpen: false, isTimelineOpen: false,
  onToggleSearchInChat: vi.fn(), onToggleInfoPanel: vi.fn(), onToggleTimeline: vi.fn(), onBackMobile: vi.fn(), onOpenSnippets: vi.fn(),
  onToggleArchive: vi.fn().mockResolvedValue(true), teamMembers: [{ id: userId, fullName: 'Operador' }],
  onAssign: vi.fn().mockResolvedValue(true), onUpdateStatus: vi.fn().mockResolvedValue(true), currentUserId: userId, currentUserName: 'Operador',
});

describe('Resolver das ações do cabeçalho', () => {
  it('valida contexto antes de atualizar status', async () => {
    const input = props();
    render(<ChatHeader {...input} conversation={{ ...input.conversation, id: 'inválido' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await screen.findByRole('alert');
    expect(input.onUpdateStatus).not.toHaveBeenCalled();
  });

  it('valida atendente antes de atribuir', async () => {
    const input = props();
    render(<ChatHeader {...input} currentUserId="inválido" />);
    fireEvent.click(screen.getByTitle('Atendente responsável pelo atendimento'));
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir a mim' }));
    await screen.findByRole('alert');
    expect(input.onAssign).not.toHaveBeenCalled();
  });

  it('envia a atribuição parseada com o nome do diretório', async () => {
    const input = props();
    render(<ChatHeader {...input} />);
    fireEvent.click(screen.getByTitle('Atendente responsável pelo atendimento'));
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir a mim' }));
    await waitFor(() => expect(input.onAssign).toHaveBeenCalledWith(userId, 'Operador'));
  });

  it('mostra falha do comando sem informar sucesso', async () => {
    const input = props();
    input.onUpdateStatus.mockResolvedValue(false);
    render(<ChatHeader {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível salvar');
    expect(input.onUpdateStatus).toHaveBeenCalledWith('closed');
  });

  it('trava repetição durante o comando e exibe progresso', async () => {
    const input = props();
    let resolve!: (value: boolean) => void;
    input.onUpdateStatus.mockReturnValue(new Promise<boolean>((callback) => { resolve = callback; }));
    render(<ChatHeader {...input} />);
    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(close);
    fireEvent.click(close);
    await screen.findByRole('status');
    expect(input.onUpdateStatus).toHaveBeenCalledTimes(1);
    expect((close.closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
    await act(async () => resolve(true));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('também passa arquivamento pelo resolver', async () => {
    const input = props();
    render(<ChatHeader {...input} conversation={{ ...input.conversation, id: '' }} />);
    fireEvent.click(screen.getByTitle('Mais opções da conversa'));
    fireEvent.click(screen.getByRole('button', { name: 'Arquivar conversa' }));
    await screen.findByRole('alert');
    expect(input.onToggleArchive).not.toHaveBeenCalled();
  });
});
