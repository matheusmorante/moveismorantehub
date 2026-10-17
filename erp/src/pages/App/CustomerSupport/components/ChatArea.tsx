import React, { useState, useEffect } from 'react';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus, AssignedProfileSummary } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { fetchTeamProfiles } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useAuth } from '@/context/AuthContext';
import { QuickSnippetsModal } from './QuickSnippetsModal';
import { ChatHeader } from './chat/ChatHeader';
import { ChatInChatSearch } from './chat/ChatInChatSearch';
import { ChatMessageTimeline, groupMessagesByDate } from './chat/ChatMessageTimeline';
import { ChatComposer } from './chat/ChatComposer';

// Re-exporta groupMessagesByDate para manter compatibilidade com testes e outros módulos
export { groupMessagesByDate };

export interface ChatAreaProps {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  isLoadingMessages: boolean;
  onBackMobile: () => void;
  isInfoPanelOpen: boolean;
  onToggleInfoPanel: () => void;
  isTimelineOpen?: boolean;
  onToggleTimeline?: () => void;
  onToggleArchive: () => void;
  onAssign?: (profileId: string | null, profileName?: string) => Promise<void>;
  onUpdateStatus?: (status: ConversationStatus) => Promise<void>;
  onAddInternalNote?: (text: string) => Promise<void>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  isLoadingMessages,
  onBackMobile,
  isInfoPanelOpen,
  onToggleInfoPanel,
  isTimelineOpen = false,
  onToggleTimeline,
  onToggleArchive,
  onAssign,
  onUpdateStatus,
  onAddInternalNote,
}) => {
  const { profile, user } = useAuth();
  const [inChatSearch, setInChatSearch] = useState('');
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [isSnippetsModalOpen, setIsSnippetsModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<AssignedProfileSummary[]>([]);

  // Carrega membros da equipe para o menu de atribuição
  useEffect(() => {
    fetchTeamProfiles(supabase).then(setTeamMembers);
  }, []);

  const displayName =
    conversation.customer?.fullName ||
    conversation.contactName ||
    formatPhoneForDisplay(conversation.contactPhone);

  const formattedPhone = formatPhoneForDisplay(conversation.contactPhone);
  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const currentStatus = conversation.status || (conversation.isArchived ? 'closed' : 'open');
  const currentUserName = profile?.full_name || user?.email || 'Atendente';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2]/80 dark:bg-[#0b141a] relative overflow-hidden select-none transition-colors">
      {/* Textura sutil de fundo estilo WhatsApp Web */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none bg-[radial-gradient(#128c7e_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* 1. Header Fixo da Conversa Ativa */}
      <ChatHeader
        conversation={conversation}
        displayName={displayName}
        formattedPhone={formattedPhone}
        initials={initials}
        careWindow={careWindow}
        currentStatus={currentStatus}
        isSearchingInChat={isSearchingInChat}
        onToggleSearchInChat={() => {
          setIsSearchingInChat((prev) => !prev);
          if (isSearchingInChat) setInChatSearch('');
        }}
        isInfoPanelOpen={isInfoPanelOpen}
        onToggleInfoPanel={onToggleInfoPanel}
        isTimelineOpen={isTimelineOpen}
        onToggleTimeline={onToggleTimeline}
        onBackMobile={onBackMobile}
        onOpenSnippets={() => setIsSnippetsModalOpen(true)}
        onToggleArchive={onToggleArchive}
        teamMembers={teamMembers}
        onAssign={onAssign}
        onUpdateStatus={onUpdateStatus}
        currentUserId={profile?.id || user?.id}
        currentUserName={currentUserName}
      />

      {/* 2. Barra de Busca Interna (se ativada) */}
      {isSearchingInChat && (
        <ChatInChatSearch
          searchQuery={inChatSearch}
          onSearchChange={setInChatSearch}
          onClose={() => {
            setIsSearchingInChat(false);
            setInChatSearch('');
          }}
        />
      )}

      {/* 3. Área Central de Mensagens com Rolagem Independente */}
      <ChatMessageTimeline
        messages={messages}
        displayName={displayName}
        inChatSearch={inChatSearch}
        isLoadingMessages={isLoadingMessages}
        conversationId={conversation.id}
      />

      {/* 4. Rodapé de Composição (WhatsApp vs Comentário Interno) */}
      <ChatComposer
        onAddInternalNote={onAddInternalNote}
        onOpenSnippets={() => setIsSnippetsModalOpen(true)}
      />

      {/* Modal de Respostas Rápidas & Snippets */}
      <QuickSnippetsModal
        isOpen={isSnippetsModalOpen}
        onClose={() => setIsSnippetsModalOpen(false)}
        onSelectSnippet={(content) => {
          if (onAddInternalNote) {
            onAddInternalNote(content);
          }
        }}
      />
    </div>
  );
};
