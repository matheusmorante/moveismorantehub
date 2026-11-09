import React from 'react';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import { ManualLinkModal } from './ManualLinkModal';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { CustomerDetailsTab } from './infoPanel/CustomerDetailsTab';
import { CustomerOrdersTab } from './infoPanel/CustomerOrdersTab';
import { CustomerMediaTab } from './infoPanel/CustomerMediaTab';
import { CustomerInfoContactCard } from './infoPanel/CustomerInfoContactCard';
import { CustomerOrderRecordsView } from './infoPanel/CustomerOrderRecordsView';
import { CustomerInfoTabsNav, type PanelTab } from './infoPanel/CustomerInfoTabsNav';
import { useCustomerInfoPanelState } from './infoPanel/useCustomerInfoPanelState';

export { type PanelTab };

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

  const {
    activeTab,
    setActiveTab,
    orders,
    isLoadingOrders,
    ordersError,
    retryOrders,
    isLinkModalOpen,
    setIsLinkModalOpen,
    customerActionError,
    unlinkForm,
    handleUnlink,
    handleLinked,
  } = useCustomerInfoPanelState({
    conversation,
    canViewCommercial,
    onConversationUpdated,
  });

  if (!isOpen) return null;

  const customer = conversation.customer;
  const isLinked = Boolean(conversation.customerId && customer);
  const contactName = conversation.contactName?.trim() || customer?.fullName || 'Contato sem nome';
  const contactPhone = conversation.contactPhone || customer?.phone;
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
              <h3 id="customer-info-panel-title" className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                Perfil do cliente
              </h3>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{viewDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fechar perfil do cliente"
          >
            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
          </button>
        </div>

        <CustomerInfoContactCard conversation={conversation} />

        {customerActionError && (
          <div role="alert" className="mx-4 mt-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
            {customerActionError}
          </div>
        )}

        <CustomerInfoTabsNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          ordersCount={orders.length}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'customer' && (
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

          {activeTab === 'orders' && (
            <CustomerOrdersTab
              isLinked={isLinked}
              canViewCommercial={canViewCommercial}
              isLoadingOrders={isLoadingOrders}
              orders={orders}
              ordersError={ordersError}
              onRetryOrders={retryOrders}
            />
          )}

          {activeTab === 'budgets' && (
            <CustomerOrderRecordsView
              contactPhone={conversation.contactPhone}
              orderGroup="budgets"
              canViewCommercial={canViewCommercial}
              canShareBudget={Boolean(onShareBudget)}
              onShareBudget={onShareBudget}
            />
          )}

          {activeTab === 'media' && (
            <CustomerMediaTab conversationId={conversation.id} onJumpToMessage={onJumpToMessage} />
          )}
        </div>

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
