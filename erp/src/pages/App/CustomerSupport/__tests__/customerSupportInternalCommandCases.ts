import { expect, it, vi } from 'vitest';
import {
  assignConversation,
  computeConversationStatus,
  createInternalNoteMessage,
  updateConversationStatus,
} from '@/pages/utils/customerSupport/customerSupportService';

export function registerCustomerSupportInternalCommandCases(): void {
  // Internal commands: transport proof only; PostgreSQL transaction proof needs owned fixtures.
  it('21. delega atribuição ao RPC sem enviar autoria nem gravar evento no navegador', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const from = vi.fn();
    expect(await assignConversation({ rpc, from } as any, 'conv-xyz', 'user-123', 'Nome falso', 'Autor falso')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('customer_support_assign_conversation', { p_conversation_id: 'conv-xyz', p_assignee_id: 'user-123' });
    expect(from).not.toHaveBeenCalled();
  });

  it('22. delega status ao RPC sem enviar snapshot antigo de marcadores', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const from = vi.fn();
    expect(await updateConversationStatus({ rpc, from } as any, 'conv-xyz', 'closed', ['old-tag'], 'Autor falso')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('customer_support_set_conversation_status', { p_conversation_id: 'conv-xyz', p_status: 'closed' });
    expect(from).not.toHaveBeenCalled();
    expect(computeConversationStatus({ is_archived: true, tags: [] })).toBe('closed');
    expect(computeConversationStatus({ is_archived: false, tags: ['status:snoozed'] })).toBe('snoozed');
    expect(computeConversationStatus({ is_archived: false, tags: [] })).toBe('open');
  });

  it('23. usa a autoria do comentário retornado pelo servidor sem despachar à Meta', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{
      id: 'msg-note-1', conversation_id: 'conv-xyz', direction: 'outbound', message_type: 'internal_note',
      text_content: 'Comentário válido', raw_payload: { author_name: 'Ana Silva', author_role: 'Vendedora' },
      timestamp: '2026-10-21T12:00:00Z',
    }], error: null });
    const from = vi.fn();
    const note = await createInternalNoteMessage({ rpc, from } as any, 'conv-xyz', ' Comentário válido ', { id: 'forged', name: 'Autor falso' });
    expect(note?.messageType).toBe('internal_note');
    expect(note?.authorName).toBe('Ana Silva');
    expect(rpc).toHaveBeenCalledWith('customer_support_add_internal_note', { p_conversation_id: 'conv-xyz', p_text: 'Comentário válido' });
    expect(from).not.toHaveBeenCalled();
  });
}
