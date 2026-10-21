import React from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus } from '../types';
import {
  assignConversation,
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
  // 1. Alternar arquivamento da conversa
  const handleToggleArchive = async () => {
    if (!selectedConversation) return;
    const ok = await toggleArchiveConversation(
      supabase,
      selectedConversation.id,
      selectedConversation.isArchived
    );
    if (ok) {
      const nextArchived = !selectedConversation.isArchived;
      const updated = { ...selectedConversation, isArchived: nextArchived };
      setSelectedConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  };

  // 2. Atualizar dados parciais da conversa (ex: vínculo com cliente)
  const handleConversationUpdated = (partial: Partial<WhatsAppConversation>) => {
    if (!selectedConversation) return;
    const updated = { ...selectedConversation, ...partial };
    setSelectedConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // 3. Atribuir conversa a um atendente
  const handleAssignConversation = async (profileId: string | null, profileName?: string) => {
    if (!selectedConversation) return;
    const ok = await assignConversation(
      supabase,
      selectedConversation.id,
      profileId,
      profileName,
      currentUserName
    );
    if (ok) {
      const assignedProf = profileId && profileName ? { id: profileId, fullName: profileName } : null;
      const updated = {
        ...selectedConversation,
        assignedTo: profileId,
        assignedProfile: assignedProf,
      };
      setSelectedConversation(updated);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...c, assignedTo: profileId, assignedProfile: assignedProf } : c
        )
      );

    }
  };

  // 4. Alterar status da conversa (open, closed, snoozed)
  const handleUpdateStatus = async (status: ConversationStatus) => {
    if (!selectedConversation) return;
    const ok = await updateConversationStatus(
      supabase,
      selectedConversation.id,
      status,
      selectedConversation.tags,
      currentUserName
    );
    if (ok) {
      const isArchived = status === 'closed';
      const updated = { ...selectedConversation, status, isArchived };
      setSelectedConversation(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, status, isArchived } : c))
      );

    }
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

    if (created) {
      setMessages((prev) => prev.some((message) => message.id === created.id)
        ? prev
        : [...prev, created].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id))
      );
      setSelectedConversation((prev) => (prev ? { ...prev, internalNotes: text } : null));
    }
    return Boolean(created);
  };

  return {
    handleToggleArchive,
    handleConversationUpdated,
    handleAssignConversation,
    handleUpdateStatus,
    handleAddInternalNote,
  };
}
