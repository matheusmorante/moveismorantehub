import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, WhatsAppMessage, ConversationFilter } from './types';
import {
  fetchConversations,
  fetchConversationMessages,
  markConversationAsRead,
  toggleArchiveConversation,
  mapRowToConversation,
  mapRowToMessage,
} from '@/pages/utils/customerSupport/customerSupportService';
import { getMonthlyUsage, FreeTierUsageInfo } from '@/pages/utils/customerSupport/freeTierTracker';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatArea } from './components/ChatArea';
import { CustomerInfoPanel } from './components/CustomerInfoPanel';
import { EmptyChatState } from './components/EmptyChatState';
import { UsageConsumptionModal } from './components/UsageConsumptionModal';

export default function CustomerSupport() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [search, setSearch] = useState('');
  const [usageInfo, setUsageInfo] = useState<FreeTierUsageInfo | null>(null);

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

  // Referência para conversas ativas para Realtime
  const selectedConvIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConversation?.id || null;

  // 1. Carrega conversas do banco
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const res = await fetchConversations(supabase, {
        filter,
        search,
        page: 1,
        pageSize: 50,
      });
      setConversations(res.conversations);

      // Mantém conversa selecionada atualizada
      if (selectedConvIdRef.current) {
        const found = res.conversations.find((c) => c.id === selectedConvIdRef.current);
        if (found) setSelectedConversation(found);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  }, [filter, search]);

  // 2. Carrega uso mensal da franquia gratuita
  const loadUsage = useCallback(async () => {
    const info = await getMonthlyUsage(supabase);
    setUsageInfo(info);
  }, []);

  useEffect(() => {
    loadConversations();
    loadUsage();
  }, [loadConversations, loadUsage]);

  // 3. Ao selecionar uma conversa, carrega mensagens e zera não lidas
  const handleSelectConversation = async (conv: WhatsAppConversation) => {
    setSelectedConversation(conv);
    setIsLoadingMessages(true);

    try {
      if (conv.unreadCount > 0) {
        await markConversationAsRead(supabase, conv.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
        );
      }

      const msgs = await fetchConversationMessages(supabase, conv.id);
      setMessages(msgs);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 4. Sincronização Reativa via Supabase Realtime
  useEffect(() => {
    // Canal para mudanças nas conversas
    const conversationsChannel = supabase
      .channel('whatsapp-conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = mapRowToConversation(payload.new);
            setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToConversation(payload.new);
            setConversations((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
            );
            if (selectedConvIdRef.current === updated.id) {
              setSelectedConversation((prev) => (prev ? { ...prev, ...updated } : null));
            }
          }
        }
      )
      .subscribe();

    // Canal para novas mensagens da conversa aberta
    const messagesChannel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = mapRowToMessage(payload.new);
            if (selectedConvIdRef.current === newMsg.conversationId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id || (m.apiMessageId && m.apiMessageId === newMsg.apiMessageId))) {
                  return prev;
                }
                return [...prev, newMsg];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = mapRowToMessage(payload.new);
            if (selectedConvIdRef.current === updatedMsg.conversationId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

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
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    }
  };

  const handleConversationUpdated = (partial: Partial<WhatsAppConversation>) => {
    if (!selectedConversation) return;
    const updated = { ...selectedConversation, ...partial };
    setSelectedConversation(updated);
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      {/* 1. Barra Lateral de Conversas (Mobile: oculta se houver conversa selecionada) */}
      <div className={`h-full ${selectedConversation ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <ConversationSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          usageInfo={usageInfo}
          onOpenUsageModal={() => setIsUsageModalOpen(true)}
          isLoading={isLoadingConversations}
          onRefresh={loadConversations}
        />
      </div>

      {/* 2. Área Central de Conversa / Chat */}
      {selectedConversation ? (
        <div className="flex-1 flex h-full min-w-0">
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onBackMobile={() => setSelectedConversation(null)}
            isInfoPanelOpen={isInfoPanelOpen}
            onToggleInfoPanel={() => setIsInfoPanelOpen((prev) => !prev)}
            onToggleArchive={handleToggleArchive}
          />

          {/* 3. Painel Lateral Direito com Informações e Pedidos */}
          <CustomerInfoPanel
            conversation={selectedConversation}
            messages={messages}
            isOpen={isInfoPanelOpen}
            onClose={() => setIsInfoPanelOpen(false)}
            onConversationUpdated={handleConversationUpdated}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 h-full">
          <EmptyChatState />
        </div>
      )}

      {/* Modal de Consumo de Franquia Gratuita */}
      <UsageConsumptionModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        usageInfo={usageInfo}
      />
    </div>
  );
}
