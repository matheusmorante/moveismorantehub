import React, { useState, useEffect } from 'react';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import {
  SupportOrderSummary,
  type SupportCustomerOrderGroup,
} from '@/pages/utils/customerSupport/supportOrdersService';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { CustomerOrderRecordsView } from './infoPanel/CustomerOrderRecordsView';
import { CustomerMediaTab } from './infoPanel/CustomerMediaTab';
import { CustomerOrderDetailsModal } from './infoPanel/CustomerOrderDetailsModal';

type CustomerPanelView = 'profile' | 'media';

const VIEW_COPY: Record<CustomerPanelView, { title: string; icon: string }> = {
  profile: { title: 'Operações comerciais', icon: 'bi-receipt' },
  media: { title: 'Mídias', icon: 'bi-images' },
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
  const canSendMessages = canPerform('sendCustomerSupportMessages', roles);
  const customerRecordGroups: Array<{ group: SupportCustomerOrderGroup; title: string; icon: string }> = [
    ...(canViewOrders ? [{ group: 'sales' as const, title: 'Pedidos de venda', icon: 'bi-receipt' }] : []),
    ...(canViewAssistance ? [{ group: 'assistance' as const, title: 'Assistências', icon: 'bi-tools' }] : []),
    ...(canViewReturns ? [{ group: 'returns' as const, title: 'Devoluções', icon: 'bi-arrow-return-left' }] : []),
    ...(canViewBudgets ? [{ group: 'budgets' as const, title: 'Orçamentos', icon: 'bi-file-earmark-text' }] : []),
  ];

  const [activeView, setActiveView] = useState<CustomerPanelView>('profile');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [expandedOrderGroup, setExpandedOrderGroup] = useState<SupportCustomerOrderGroup | null>(null);
  const [renderedOrderGroups, setRenderedOrderGroups] = useState<Set<SupportCustomerOrderGroup>>(() => new Set());
  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
  const customer = conversation.customer;
  const contactName = conversation.contactName?.trim() || customer?.fullName || 'Contato sem nome';
  const contactPhone = conversation.contactPhone || customer?.phone;

  useEffect(() => {
    setActiveView('profile');
    setSelectedOrderId(null);
    setExpandedOrderGroup(null);
    setRenderedOrderGroups(new Set());
  }, [conversation.id, conversation.customerId]);

  if (!isOpen) return null;

  const openView = (view: CustomerPanelView) => {
    setActiveView(view);
  };
  const viewDescription = `${contactName} · ${contactPhone ? formatPhoneForDisplay(contactPhone) : 'Telefone não informado'}`;
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
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-3 dark:border-slate-800 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <i className="bi bi-person-lines-fill" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id="customer-info-panel-title" className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">Perfil do cliente</h3>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{viewDescription}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Fechar perfil do cliente">
            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Seções do perfil do cliente" className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
          {(['profile', 'media'] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-current={activeView === view ? 'page' : undefined}
              onClick={() => openView(view)}
              className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[10px] font-semibold transition-colors ${activeView === view
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              <i className={`bi ${VIEW_COPY[view].icon} text-blue-600 dark:text-blue-400`} aria-hidden="true" />
              <span>{VIEW_COPY[view].title}</span>
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {activeView === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              {canViewCommercial ? (
                <section aria-label="Registros comerciais do cliente" className="space-y-4">
                  {customerRecordGroups.map(({ group, title, icon }) => {
                    const isExpanded = expandedOrderGroup === group;
                    const shouldRenderRecords = renderedOrderGroups.has(group);
                    return (
                      <section key={group} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => {
                            setExpandedOrderGroup(isExpanded ? null : group);
                            if (!isExpanded) {
                              setRenderedOrderGroups((current) => new Set(current).add(group));
                            }
                          }}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                        >
                          <span className="flex items-center gap-2">
                            <i className={`bi ${icon} text-blue-600 dark:text-blue-400`} aria-hidden="true" />
                            {title}
                          </span>
                          <i className={`bi bi-chevron-down text-[10px] transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        <div
                          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}
                          onTransitionEnd={(event) => {
                            if (event.target !== event.currentTarget || event.propertyName !== 'grid-template-rows' || isExpanded) return;
                            setRenderedOrderGroups((current) => {
                              if (!current.has(group)) return current;
                              const next = new Set(current);
                              next.delete(group);
                              return next;
                            });
                          }}
                        >
                          <div className="min-h-0 overflow-hidden">
                            {shouldRenderRecords && (
                              <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                                <CustomerOrderRecordsView
                                  contactPhone={conversation.contactPhone}
                                  orderGroup={group}
                                  canViewCommercial={canViewCommercial}
                                  canShareBudget={canSendMessages && careWindow.isOpen}
                                  onOpenRecord={(record) => setSelectedOrderId(record.id)}
                                  onShareBudget={onShareBudget}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </section>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <strong className="block font-bold">Dados comerciais restritos</strong>
                  <p className="mt-1 text-[11px] leading-relaxed">É necessária a permissão de informações comerciais para consultar as operações deste cliente.</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'media' && (
            canViewCommercial
              ? <CustomerMediaTab conversationId={conversation.id} onJumpToMessage={onJumpToMessage} />
              : <p className="text-xs text-amber-700 dark:text-amber-300">Dados comerciais restritos.</p>
          )}
        </div>
      </aside>
      {selectedOrderId && (
        <CustomerOrderDetailsModal
          key={selectedOrderId}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </>
  );
};
