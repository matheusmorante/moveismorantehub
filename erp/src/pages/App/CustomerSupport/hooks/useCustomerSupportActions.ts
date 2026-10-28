import React, { useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus } from '../types';
import {
  assignConversation,
  markConversationAsRead,
  markConversationAsUnread,
  updateConversationStatus,
  createInternalNoteMessage,
  toggleArchiveConversation,
} from '@/pages/utils/customerSupport/customerSupportService';

interface UseCustomerSupportActionsParams {
  selectedConversation: WhatsAppConversation | null;
  setSelectedConversation: React.Dispatch<React.SetStateAction<WhatsAppConversation | null>>;
  setConversations: React.Dispatch<React.SetStateAction<WhatsAppConversation[]>>;
  setMessages: React.Dispatch<React.SetStateAction<WhatsAppMessage[]>>;
  currentUserName: string;
  currentUserId?: string;
  currentUserRole?: string;
}

export function useCustomerSupportActions({
  selectedConversation,
  setSelectedConversation,
  setConversations,
  setMessages,
  currentUserName,
  currentUserId,
  currentUserRole,
}: UseCustomerSupportActionsParams) {
  const scopeRef = useRef({ id: selectedConversation?.id, generation: 0 });
  if (scopeRef.current.id !== selectedConversation?.id) {
    scopeRef.current = { id: selectedConversation?.id, generation: scopeRef.current.generation + 1 };
  }
  const generation = scopeRef.current.generation;
  const isCurrent = () => scopeRef.current.generation === generation;

  // 1. Alternar arquivamento da conversa
  const handleToggleArchive = async () => {
    if (!selectedConversation) return false;
    const ok = await toggleArchiveConversation(
      supabase,
      selectedConversation.id,
      selectedConversation.isArchived
    );
    if (ok && isCurrent()) {
      const nextArchived = !selectedConversation.isArchived;
      const status: ConversationStatus = nextArchived ? 'closed' : 'open';
      const apply = (row: WhatsAppConversation) => row.id === selectedConversation.id
        ? { ...row, isArchived: nextArchived, status,
          tags: [...row.tags.filter((tag) => !tag.startsWith('status:')), ...(nextArchived ? ['status:closed'] : [])] }
        : row;
      setSelectedConversation((prev) => prev ? apply(prev) : prev);
      setConversations((prev) => prev.map(apply));
    }
    return ok;
  };

  const handleToggleReadStatus = async () => {
    if (!selectedConversation) return false;
    const isUnread = selectedConversation.unreadCount > 0;
    const ok = isUnread
      ? await markConversationAsRead(supabase, selectedConversation.id)
      : await markConversationAsUnread(supabase, selectedConversation.id);
    if (ok && isCurrent()) {
      const unreadCount = isUnread ? 0 : 1;
      const apply = (row: WhatsAppConversation) => row.id === selectedConversation.id ? { ...row, unreadCount } : row;
      setSelectedConversation((prev) => prev ? apply(prev) : prev);
      setConversations((prev) => prev.map(apply));
    }
    return ok;
  };

  // 2. Atualizar dados parciais da conversa (ex: vínculo com cliente)
  const handleConversationUpdated = (partial: Partial<WhatsAppConversation>) => {
    if (!selectedConversation || !isCurrent()) return;
    const apply = (row: WhatsAppConversation) => row.id === selectedConversation.id ? { ...row, ...partial } : row;
    setSelectedConversation((prev) => prev ? apply(prev) : prev);
    setConversations((prev) => prev.map(apply));
  };

  // 3. Atribuir conversa a um atendente
  const handleAssignConversation = async (profileId: string | null, profileName?: string) => {
    if (!selectedConversation) return false;
    const ok = await assignConversation(
      supabase,
      selectedConversation.id,
      profileId,
      profileName,
      currentUserName
    );
    if (ok && isCurrent()) {
      const assignedProf = profileId && profileName ? { id: profileId, fullName: profileName } : null;
      const apply = (row: WhatsAppConversation) => row.id === selectedConversation.id
        ? { ...row, assignedTo: profileId, assignedProfile: assignedProf } : row;
      setSelectedConversation((prev) => prev ? apply(prev) : prev);
      setConversations((prev) => prev.map(apply));
    }
    return ok;
  };

  // 4. Alterar status da conversa (open, closed, snoozed)
  const handleUpdateStatus = async (status: ConversationStatus) => {
    if (!selectedConversation) return false;
    const ok = await updateConversationStatus(
      supabase,
      selectedConversation.id,
      status,
      selectedConversation.tags,
      currentUserName
    );
    if (ok && isCurrent()) {
      const isArchived = status === 'closed';
      const apply = (row: WhatsAppConversation) => row.id === selectedConversation.id
        ? { ...row, status, isArchived, tags: [...row.tags.filter((tag) => !tag.startsWith('status:')),
          ...(status === 'open' ? [] : [`status:${status}`])] } : row;
      setSelectedConversation((prev) => prev ? apply(prev) : prev);
      setConversations((prev) => prev.map(apply));
    }
    return ok;
  };

  // 5. Adicionar comentário interno da equipe
  const handleAddInternalNote = async (text: string) => {
    if (!selectedConversation || !text.trim()) return false;
    const author = {
      id: currentUserId || 'unknown',
      name: currentUserName,
      role: currentUserRole || 'Colaborador',
    };

    const created = await createInternalNoteMessage(
      supabase,
      selectedConversation.id,
      text,
      author
    );

    if (created && isCurrent()) {
      setMessages((prev) => prev.some((message) => message.id === created.id)
        ? prev
        : [...prev, created].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id))
      );
    }
    return Boolean(created);
  };

  return {
    handleToggleArchive,
    handleToggleReadStatus,
    handleConversationUpdated,
    handleAssignConversation,
    handleUpdateStatus,
    handleAddInternalNote,
  };
}
