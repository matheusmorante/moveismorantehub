// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomerNotesTab } from '../components/infoPanel/CustomerNotesTab';
import { createInternalNoteMessage, updateConversationNotes, updateConversationTag } from '@/pages/utils/customerSupport/customerSupportService';

afterEach(() => cleanup());
const props = {
  careWindow: { isOpen: false, remainingMs: 0, remainingHours: 0, remainingMinutes: 0, expiresAt: null },
  lastCustomerMessageAt: null, initialNotes: 'Texto original', tags: ['Urgente', 'status:closed'],
  onSaveNotes: vi.fn().mockResolvedValue(true), onAddTag: vi.fn().mockResolvedValue(true), onRemoveTag: vi.fn().mockResolvedValue(true),
};

describe('Comandos e rascunhos internos', () => {
  it('conserva a edição e envia a base original após uma atualização remota', async () => {
    const save = vi.fn().mockResolvedValue(true);
    const { rerender } = render(<CustomerNotesTab {...props} onSaveNotes={save} />);
    fireEvent.change(screen.getByPlaceholderText('Observações visíveis somente para a equipe interna...'), { target: { value: 'Meu rascunho' } });
    rerender(<CustomerNotesTab {...props} initialNotes="Outro atendente alterou" onSaveNotes={save} />);
    expect((screen.getByPlaceholderText('Observações visíveis somente para a equipe interna...') as HTMLTextAreaElement).value).toBe('Meu rascunho');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Notas' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('Meu rascunho', 'Texto original'));
  });

  it('exibe conflito sem descartar o rascunho', async () => {
    render(<CustomerNotesTab {...props} onSaveNotes={vi.fn().mockRejectedValue(new Error('As notas foram alteradas. Atualize antes de salvar.'))} />);
    fireEvent.change(screen.getByPlaceholderText('Observações visíveis somente para a equipe interna...'), { target: { value: 'Meu rascunho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Notas' }));
    await screen.findByText('As notas foram alteradas. Atualize antes de salvar.');
    expect((screen.getByPlaceholderText('Observações visíveis somente para a equipe interna...') as HTMLTextAreaElement).value).toBe('Meu rascunho');
  });

  it('bloqueia marcadores de status pelo resolver e oculta sua remoção livre', async () => {
    const add = vi.fn();
    render(<CustomerNotesTab {...props} onAddTag={add} />);
    expect(screen.queryByRole('button', { name: 'Remover tag status:closed' })).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Adicionar marcador'), { target: { value: 'Status:snoozed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await screen.findByText('Marcadores de status são gerenciados pelas ações do atendimento.');
    expect(add).not.toHaveBeenCalled();
  });

  it('rejeita marcador duplicado sem distinguir maiúsculas', async () => {
    const add = vi.fn();
    render(<CustomerNotesTab {...props} onAddTag={add} />);
    fireEvent.change(screen.getByPlaceholderText('Adicionar marcador'), { target: { value: ' urgente ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await screen.findByText('Este marcador já existe.');
    expect(add).not.toHaveBeenCalled();
  });

  it('salva notas com comparação da base e não envia tags', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    expect(await updateConversationNotes({ rpc } as any, 'conversation', 'Atualizado', 'Anterior')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('customer_support_set_internal_notes', { p_conversation_id: 'conversation', p_notes: 'Atualizado', p_expected_notes: 'Anterior' });
    rpc.mockResolvedValue({ data: null, error: { code: '40001' } });
    await expect(updateConversationNotes({ rpc } as any, 'conversation', 'Atualizado', 'Anterior')).rejects.toThrow(/alteradas/);
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'CUSTOMER_SUPPORT_NOTES_CONFLICT: As notas foram alteradas.' } });
    await expect(updateConversationNotes({ rpc } as any, 'conversation', 'Atualizado', 'Anterior')).rejects.toThrow(/alteradas/);
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Outro erro de domínio.' } });
    expect(await updateConversationNotes({ rpc } as any, 'conversation', 'Atualizado', 'Anterior')).toBe(false);
  });

  it('altera somente o marcador e recebe a lista canônica do servidor', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: ['Compartilhada', 'Novo'], error: null });
    expect(await updateConversationTag({ rpc } as any, 'conversation', ' Novo ', false)).toEqual(['Compartilhada', 'Novo']);
    expect(rpc).toHaveBeenCalledWith('customer_support_update_tag', { p_conversation_id: 'conversation', p_tag: 'Novo', p_remove: false });
  });

  it('impede comentários e tags inválidos antes do RPC', async () => {
    const rpc = vi.fn();
    expect(await updateConversationTag({ rpc } as any, 'conversation', 'status:closed', false)).toBeNull();
    expect(await createInternalNoteMessage({ rpc } as any, 'conversation', '   ')).toBeNull();
    expect(await createInternalNoteMessage({ rpc } as any, 'conversation', 'x'.repeat(2001))).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});

