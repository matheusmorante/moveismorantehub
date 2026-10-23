// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import { ChatHeader } from '../components/chat/ChatHeader';
import type { WhatsAppConversation } from '../types';

const conversationId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
it('organiza o cabeçalho em linhas na tela pequena e mantém o retorno fora das ações', () => {
  const { container } = render(<ChatHeader {...props()} />);
  expect(container.firstElementChild?.classList.contains('flex-col')).toBe(true);
  expect(container.firstElementChild?.classList.contains('md:flex-row')).toBe(true);
  expect(screen.getByRole('button', { name: 'Voltar para a lista', exact: true }).classList.contains('shrink-0')).toBe(true);
  expect(screen.getByTitle('Atendente responsável pelo atendimento').parentElement?.parentElement?.classList.contains('flex-wrap')).toBe(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});
const props = () => ({
  conversation: { id: conversationId, tags: [], isArchived: false } as unknown as WhatsAppConversation,
  displayName: 'Contato', formattedPhone: '', initials: 'C',
  careWindow: { isOpen: false, remainingMs: 0, remainingHours: 0, remainingMinutes: 0, expiresAt: null },
  currentStatus: 'open', isSearchingInChat: false, isInfoPanelOpen: false, isTimelineOpen: false,
  onToggleSearchInChat: vi.fn(), onToggleInfoPanel: vi.fn(), onToggleTimeline: vi.fn(), onBackMobile: vi.fn(), onOpenSnippets: vi.fn(),
  onToggleArchive: vi.fn().mockResolvedValue(true), teamMembers: [{ id: userId, fullName: 'Operador' }],
  onAssign: vi.fn().mockResolvedValue(true), onUpdateStatus: vi.fn().mockResolvedValue(true), currentUserId: userId, currentUserName: 'Operador',
});

describe('Diretório de atribuição', () => {
  it('permite repetir uma falha de consulta sem atribuir ou fechar o menu', () => {
    const input = props();
    const reload = vi.fn();
    render(<ChatHeader {...input} teamMembers={[]} agentsError="Não foi possível carregar os atendentes. Tente novamente." onReloadAgents={reload} />);
    fireEvent.click(screen.getByTitle('Atendente responsável pelo atendimento'));
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar os atendentes');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar atendentes novamente' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(input.onAssign).not.toHaveBeenCalled();
    expect(screen.getByText('Responsável pelo atendimento')).toBeTruthy();
  });
});

describe('Cópia de telefone no cabeçalho', () => {
  const openCopy = () => {
    const input = props();
    render(<ChatHeader {...input} conversation={{ ...input.conversation, contactPhone: '5500000000000' }} />);
    fireEvent.click(screen.getByTitle('Mais opções da conversa'));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar telefone' }));
    return input;
  };

  it('informa sucesso somente depois da confirmação da área de transferência', async () => {
    let finish!: () => void;
    const writeText = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const input = openCopy();
    expect(writeText).toHaveBeenCalledWith('5500000000000');
    expect(toast.success).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(toast.success).toHaveBeenCalledWith('Telefone copiado para a área de transferência.');
    expect(toast.error).not.toHaveBeenCalled();
    expect(input.onToggleArchive).not.toHaveBeenCalled();
    expect(input.onAssign).not.toHaveBeenCalled();
    expect(input.onUpdateStatus).not.toHaveBeenCalled();
  });

  it('informa recusa do navegador sem anunciar sucesso', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
    } });
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    openCopy();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar o telefone. Verifique a permissão da área de transferência.'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('informa indisponibilidade da API sem falha não tratada', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    openCopy();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar o telefone. Verifique a permissão da área de transferência.'));
    expect(toast.success).not.toHaveBeenCalled();
  });
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
