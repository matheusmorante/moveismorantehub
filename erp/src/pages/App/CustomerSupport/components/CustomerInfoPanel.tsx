import React, { useState, useEffect } from 'react';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import {
  getCustomerOrders,
  SupportOrderSummary,
} from '@/pages/utils/customerSupport/supportOrdersService';
import {
  unlinkCustomer,
  CustomerSummary,
} from '@/pages/utils/customerSupport/customerMatchingService';
import { updateInternalNotesAndTags } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ManualLinkModal } from './ManualLinkModal';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { CustomerDetailsTab } from './infoPanel/CustomerDetailsTab';
import { CustomerOrdersTab } from './infoPanel/CustomerOrdersTab';
import { CustomerNotesTab } from './infoPanel/CustomerNotesTab';
import { CustomerMediaTab } from './infoPanel/CustomerMediaTab';

export interface CustomerInfoPanelProps {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  isOpen: boolean;
  onClose: () => void;
  onConversationUpdated: (updated: Partial<WhatsAppConversation>) => void;
}

export type PanelTab = 'customer' | 'orders' | 'support' | 'media';

export const CustomerInfoPanel: React.FC<CustomerInfoPanelProps> = ({
  conversation,
  messages,
  isOpen,
  onClose,
  onConversationUpdated,
}) => {
  const { profile } = useAuth();
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewCommercial = canPerform('viewCustomerCommercialInfo', roles);

  const [activeTab, setActiveTab] = useState<PanelTab>('customer');
  const [orders, setOrders] = useState<SupportOrderSummary[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(conversation.tags || []);

  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
  const customer = conversation.customer;
  const isLinked = Boolean(conversation.customerId && customer);

  const displayName =
    customer?.fullName ||
    conversation.contactName ||
    formatPhoneForDisplay(conversation.contactPhone);

  useEffect(() => {
    setTags(conversation.tags || []);
  }, [conversation.id, conversation.tags]);

  // Carrega pedidos vinculados sob demanda (Egress otimizado)
  useEffect(() => {
    if (!conversation.customerId || !canViewCommercial) {
      setOrders([]);
      return;
    }

    let isMounted = true;
    setIsLoadingOrders(true);

    getCustomerOrders(supabase, conversation.customerId)
      .then((data) => {
        if (isMounted) setOrders(data);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [conversation.customerId, canViewCommercial]);

  if (!isOpen) return null;

  const handleUnlink = async () => {
    if (!window.confirm('Deseja realmente desvincular este cliente da conversa?')) return;
    const res = await unlinkCustomer(supabase, conversation.id);
    if (res.success) {
      onConversationUpdated({
        customerId: null,
        customerLinkStatus: 'unlinked',
        customer: null,
        orders: [],
      });
      setOrders([]);
    }
  };

  const handleLinked = (linkedCustomer: CustomerSummary) => {
    onConversationUpdated({
      customerId: linkedCustomer.id,
      customerLinkStatus: 'manually_linked',
      customer: linkedCustomer,
    });
  };

  const handleSaveNotes = async (notes: string) => {
    const saved = await updateInternalNotesAndTags(supabase, conversation.id, notes, tags);
    if (saved) onConversationUpdated({ internalNotes: notes, tags });
    return saved;
  };

  const handleAddTag = async (newTag: string) => {
    if (tags.includes(newTag)) return true;
    const nextTags = [...tags, newTag];
    const saved = await updateInternalNotesAndTags(
      supabase,
      conversation.id,
      conversation.internalNotes || '',
      nextTags
    );
    if (!saved) return false;
    setTags(nextTags);
    onConversationUpdated({ tags: nextTags });
    return true;
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    const saved = await updateInternalNotesAndTags(
      supabase,
      conversation.id,
      conversation.internalNotes || '',
      nextTags
    );
    if (!saved) return false;
    setTags(nextTags);
    onConversationUpdated({ tags: nextTags });
    return true;
  };

  // Separação de mídias por tipo
  const imageMessages = messages.filter(
    (m) => m.messageType === 'image' && (m.mediaId || m.mediaUrl)
  );
  const docMessages = messages.filter(
    (m) => m.messageType === 'document' && (m.mediaId || m.mediaUrl)
  );

  return (
    <>
      {/* Backdrop transparente para telas menores */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 xl:hidden animate-fade-in"
      />

      <aside className="fixed inset-y-0 right-0 z-40 xl:static xl:z-20 w-80 sm:w-[360px] lg:w-[380px] border-l border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 shadow-xl xl:shadow-none animate-slide-left select-none transition-colors">
        {/* 1. Header do Painel */}
        <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <i className="bi bi-person-lines-fill text-blue-600 dark:text-blue-400"></i>
            Informações Comerciais
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar painel"
          >
            <i className="bi bi-x-lg text-xs"></i>
          </button>
        </div>

        {/* 2. Cabeçalho Resumido do Contato */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3 shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm shadow-xs border border-slate-200/60 dark:border-slate-700 shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {formatPhoneForDisplay(conversation.contactPhone)}
            </p>
          </div>
        </div>

        {/* 3. Navegação em Abas */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
              activeTab === 'customer'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Pedidos
            {orders.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] flex items-center justify-center">
                {orders.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
              activeTab === 'support'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Atendimento
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
              activeTab === 'media'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Mídias
          </button>
        </div>

        {/* 4. Conteúdo Modular das Abas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'customer' && (
            <CustomerDetailsTab
              conversation={conversation}
              customer={customer}
              isLinked={isLinked}
              canViewCommercial={canViewCommercial}
              displayName={displayName}
              onOpenLinkModal={() => setIsLinkModalOpen(true)}
              onUnlink={handleUnlink}
            />
          )}

          {activeTab === 'orders' && (
            <CustomerOrdersTab
              isLinked={isLinked}
              canViewCommercial={canViewCommercial}
              isLoadingOrders={isLoadingOrders}
              orders={orders}
            />
          )}

          {activeTab === 'support' && (
            <CustomerNotesTab
              careWindow={careWindow}
              lastCustomerMessageAt={conversation.lastCustomerMessageAt}
              initialNotes={conversation.internalNotes}
              tags={tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onSaveNotes={handleSaveNotes}
            />
          )}

          {activeTab === 'media' && (
            <CustomerMediaTab
              imageMessages={imageMessages}
              docMessages={docMessages}
            />
          )}
        </div>

        {/* Modal de Vinculação Manual */}
        {canViewCommercial && (
          <ManualLinkModal
            isOpen={isLinkModalOpen}
            onClose={() => setIsLinkModalOpen(false)}
            conversationId={conversation.id}
            onLinked={handleLinked}
          />
        )}
      </aside>
    </>
  );
};
