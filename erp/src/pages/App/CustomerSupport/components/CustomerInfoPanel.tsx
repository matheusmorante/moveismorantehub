import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportCustomerLinkSchema, type SupportCustomerLinkInput } from '../../../../../../shared-utils/customerSupportFormSchemas';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import {
  SupportOrderSummary,
} from '@/pages/utils/customerSupport/supportOrdersService';
import {
  unlinkCustomer,
  CustomerSummary,
} from '@/pages/utils/customerSupport/customerMatchingService';
import type { SupportCustomerOrderGroup } from '@/pages/utils/customerSupport/supportOrdersService';
import { updateConversationNotes, updateConversationTag } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ManualLinkModal } from './ManualLinkModal';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { CustomerDetailsTab } from './infoPanel/CustomerDetailsTab';
import { CustomerOrderRecordsView } from './infoPanel/CustomerOrderRecordsView';
import { CustomerConversationHistoryView } from './infoPanel/CustomerConversationHistoryView';
import { CustomerNotesTab } from './infoPanel/CustomerNotesTab';
import { CustomerMediaTab } from './infoPanel/CustomerMediaTab';

type CustomerPanelView = 'profile' | 'orders' | 'budgets' | 'delivery' | 'assistance' | 'returns' | 'customerData' | 'history' | 'media' | 'notes';

const VIEW_COPY: Record<Exclude<CustomerPanelView, 'profile'>, { title: string; description: string; icon: string }> = {
  orders: { title: 'Pedidos', description: 'Compras realizadas e andamento', icon: 'bi-receipt' },
  budgets: { title: 'Orçamentos', description: 'Propostas abertas, aprovadas e vencidas', icon: 'bi-file-earmark-text' },
  delivery: { title: 'Entregas e montagens', description: 'Agendamentos e acompanhamento', icon: 'bi-truck' },
  assistance: { title: 'Assistências técnicas', description: 'Garantias e solicitações', icon: 'bi-tools' },
  returns: { title: 'Trocas e devoluções', description: 'Solicitações e retornos', icon: 'bi-arrow-return-left' },
  customerData: { title: 'Dados cadastrais', description: 'Contatos e endereços', icon: 'bi-person-vcard' },
  history: { title: 'Histórico de atividades', description: 'Relacionamento com o cliente', icon: 'bi-clock-history' },
  media: { title: 'Mídias', description: 'Arquivos compartilhados', icon: 'bi-images' },
  notes: { title: 'Observações internas', description: 'Anotações da equipe', icon: 'bi-chat-left-text' },
};

export interface CustomerInfoPanelProps {
  conversation: WhatsAppConversation;
  isOpen: boolean;
  isOverlay?: boolean;
  onClose: () => void;
  onConversationUpdated: (updated: Partial<WhatsAppConversation>) => void;
  onJumpToMessage: (message: WhatsAppMessage) => void;
  onShareBudget?: (record: SupportOrderSummary) => void;
}

export const CustomerInfoPanel: React.FC<CustomerInfoPanelProps> = ({
  conversation,
  isOpen,
  isOverlay = false,
  onClose,
  onConversationUpdated,
  onJumpToMessage,
  onShareBudget,
}) => {
  const { profile } = useAuth();
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewCommercial = canPerform('viewCustomerCommercialInfo', roles);
  const canViewOrders = canPerform('viewOrders', roles);
  const canViewBudgets = canPerform('viewBudgets', roles);
  const canViewAssistance = canPerform('viewAssistanceOrders', roles);
  const canViewReturns = canPerform('viewReturns', roles);
  const canViewDelivery = canPerform('viewDeliverySchedule', roles);
  const canViewAssemblies = canPerform('viewAssemblyList', roles);
  const canCreateBudget = canViewBudgets && canPerform('createEditOrders', roles);
  const canSendMessages = canPerform('sendCustomerSupportMessages', roles);

  const [activeView, setActiveView] = useState<CustomerPanelView>('profile');
  const [selectedOrder, setSelectedOrder] = useState<SupportOrderSummary | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(conversation.tags || []);
  const [customerActionError, setCustomerActionError] = useState('');
  const unlinkForm = useForm<SupportCustomerLinkInput>({ resolver: zodResolver(supportCustomerLinkSchema) });
  const unlinkLock = useRef(false);

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

  useEffect(() => {
    setActiveView('profile');
    setSelectedOrder(null);
  }, [conversation.id, conversation.customerId]);

  if (!isOpen) return null;

  const handleUnlink = async () => {
    if (unlinkLock.current) return;
    unlinkLock.current = true;
    unlinkForm.reset({ conversationId: conversation.id, customerId: conversation.customerId || '' });
    setCustomerActionError('');
    try {
      await unlinkForm.handleSubmit(async (data) => {
        if (!window.confirm('Deseja realmente desvincular este cliente da conversa?')) return;
        const res = await unlinkCustomer(supabase, data.conversationId);
        if (!res.success) {
          setCustomerActionError(res.error || 'Não foi possível desvincular o cliente.');
          return;
        }
        onConversationUpdated({ customerId: null, customerLinkStatus: 'unlinked', customer: null, orders: [] });
        setSelectedOrder(null);
        setActiveView('profile');
      }, () => setCustomerActionError('Conversa ou cliente inválido para desvincular.'))();
    } catch {
      setCustomerActionError('Não foi possível desvincular o cliente. Tente novamente.');
    } finally {
      unlinkLock.current = false;
    }
  };

  const handleLinked = (linkedCustomer: CustomerSummary) => {
    onConversationUpdated({
      customerId: linkedCustomer.id,
      customerLinkStatus: 'manually_linked',
      customer: linkedCustomer,
    });
  };

  const handleSaveNotes = async (notes: string, expectedNotes: string | null) => {
    const saved = await updateConversationNotes(supabase, conversation.id, notes, expectedNotes);
    if (saved) onConversationUpdated({ internalNotes: notes });
    return saved;
  };

  const handleAddTag = async (newTag: string) => {
    const nextTags = await updateConversationTag(supabase, conversation.id, newTag, false);
    if (!nextTags) return false;
    setTags(nextTags);
    onConversationUpdated({ tags: nextTags });
    return true;
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = await updateConversationTag(supabase, conversation.id, tagToRemove, true);
    if (!nextTags) return false;
    setTags(nextTags);
    onConversationUpdated({ tags: nextTags });
    return true;
  };

  const openView = (view: CustomerPanelView) => {
    setSelectedOrder(null);
    setActiveView(view);
  };
  const goBack = () => {
    if (selectedOrder) {
      setSelectedOrder(null);
      return;
    }
    setActiveView('profile');
  };
  const viewTitle = selectedOrder
    ? `#${selectedOrder.orderNumber}`
    : activeView === 'profile' ? 'Perfil do cliente' : VIEW_COPY[activeView].title;
  const viewDescription = selectedOrder
    ? 'Detalhes do registro comercial'
    : activeView === 'profile' ? 'Informações comerciais e histórico' : VIEW_COPY[activeView].description;
  const orderGroupByView: Partial<Record<CustomerPanelView, SupportCustomerOrderGroup>> = {
    orders: 'sales',
    budgets: 'budgets',
    delivery: 'delivery',
    assistance: 'assistance',
    returns: 'returns',
  };
  const activeOrderGroup = orderGroupByView[activeView];

  return (
    <>
      <div
        onClick={onClose}
        className="absolute inset-0 z-30 animate-fade-in bg-slate-900/40 backdrop-blur-xs"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-info-panel-title"
        className={`absolute inset-y-0 right-0 ${isOverlay ? 'z-[60]' : 'z-50'} h-full w-full max-w-full shrink-0 animate-slide-left select-none flex flex-col border-l border-slate-200/90 bg-white shadow-xl transition-colors dark:border-slate-800 dark:bg-slate-900 sm:w-[420px] 2xl:w-[480px]`}
      >
        {customerActionError && <p role="alert" className="p-3 text-xs text-red-600">{customerActionError}</p>}
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-3 dark:border-slate-800 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {(activeView !== 'profile' || selectedOrder) ? (
              <button type="button" onClick={goBack} aria-label={selectedOrder ? 'Voltar à lista' : 'Voltar ao perfil'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <i className="bi bi-arrow-left" aria-hidden="true" />
              </button>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <i className="bi bi-person-lines-fill" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <h3 id="customer-info-panel-title" className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{viewTitle}</h3>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{viewDescription}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Fechar perfil do cliente">
            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-800/30">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200/60 bg-gradient-to-tr from-slate-200 to-slate-100 text-sm font-bold text-slate-700 shadow-xs dark:border-slate-700 dark:from-slate-700 dark:to-slate-600 dark:text-slate-200">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</h4>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{formatPhoneForDisplay(conversation.contactPhone)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${isLinked ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            {isLinked ? 'Cliente ERP' : 'Não vinculado'}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {activeView === 'profile' && !selectedOrder && (
            <div className="space-y-4 animate-fade-in">
              {isLinked && canViewCommercial && (
                <section aria-label="Atalhos principais" className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                  {([
                    { view: 'budgets', allowed: canViewBudgets },
                    { view: 'orders', allowed: canViewOrders },
                    { view: 'delivery', allowed: canViewDelivery || canViewAssemblies },
                    { view: 'assistance', allowed: canViewAssistance },
                    { view: 'returns', allowed: canViewReturns },
                  ] as const).filter(({ allowed }) => allowed).map(({ view }) => (
                    <button key={view} type="button" onClick={() => openView(view)} className="group min-h-24 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><i className={`bi ${VIEW_COPY[view].icon}`} aria-hidden="true" /></span>
                      <span className="mt-2 block text-xs font-bold text-slate-900 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-300">{VIEW_COPY[view].title}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-slate-500 dark:text-slate-400">{VIEW_COPY[view].description}</span>
                    </button>
                  ))}
                  </div>
                  <div>
                    <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Relacionamento</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(['customerData', 'history', 'notes', 'media'] as const).map((view) => (
                        <button key={view} type="button" onClick={() => openView(view)} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                          <i className={`bi ${VIEW_COPY[view].icon} text-blue-600 dark:text-blue-400`} aria-hidden="true" />{VIEW_COPY[view].title}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {(!isLinked || !canViewCommercial) && <section>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{isLinked ? 'Dados cadastrais' : 'Vínculo do cliente'}</h4>
                <CustomerDetailsTab
                  conversation={conversation}
                  customer={customer}
                  isLinked={isLinked}
                  canViewCommercial={canViewCommercial}
                  onOpenLinkModal={() => setIsLinkModalOpen(true)}
                  onUnlink={handleUnlink}
                  isUnlinking={unlinkForm.formState.isSubmitting}
                />
              </section>}
            </div>
          )}

          {activeOrderGroup && (
            <CustomerOrderRecordsView
              key={activeView}
              customerId={conversation.customerId}
              orderGroup={activeOrderGroup}
              isLinked={isLinked}
              canViewCommercial={canViewCommercial}
              canCreateBudget={canCreateBudget}
              canShareBudget={canSendMessages && careWindow.isOpen}
              onShareBudget={onShareBudget}
              selectedRecord={selectedOrder}
              onSelectRecord={setSelectedOrder}
            />
          )}

          {activeView === 'customerData' && (
            <CustomerDetailsTab
              conversation={conversation}
              customer={customer}
              isLinked={isLinked}
              canViewCommercial={canViewCommercial}
              onOpenLinkModal={() => setIsLinkModalOpen(true)}
              onUnlink={handleUnlink}
              isUnlinking={unlinkForm.formState.isSubmitting}
            />
          )}

          {activeView === 'history' && <CustomerConversationHistoryView conversationId={conversation.id} />}

          {activeView === 'notes' && (
            <CustomerNotesTab
              key={conversation.id}
              careWindow={careWindow}
              lastCustomerMessageAt={conversation.lastCustomerMessageAt}
              initialNotes={conversation.internalNotes}
              tags={tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onSaveNotes={handleSaveNotes}
            />
          )}

          {activeView === 'media' && <CustomerMediaTab conversationId={conversation.id} onJumpToMessage={onJumpToMessage} />}
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
