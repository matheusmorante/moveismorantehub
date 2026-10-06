import React from 'react';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import type {
  FiscalDocumentDetails,
  NfeDocumentRecord,
  ParsedFiscalDetails,
} from '../types/fiscalDocuments.types';
import { IssuedFiscalDocumentSummaryTab } from './tabs/IssuedFiscalDocumentSummaryTab';
import { IssuedFiscalDocumentCustomerTab } from './tabs/IssuedFiscalDocumentCustomerTab';
import { IssuedFiscalDocumentItemsTab } from './tabs/IssuedFiscalDocumentItemsTab';
import { IssuedFiscalDocumentTransportTab } from './tabs/IssuedFiscalDocumentTransportTab';
import { IssuedFiscalDocumentPaymentTab } from './tabs/IssuedFiscalDocumentPaymentTab';
import { IssuedFiscalDocumentEventsTab } from './tabs/IssuedFiscalDocumentEventsTab';

export { ReadOnlyField } from './tabs/ReadOnlyField';
export { IssuedFiscalDocumentSummaryTab, IssuedFiscalDocumentSummaryTab as IssuedFiscalDocumentGeneralTab } from './tabs/IssuedFiscalDocumentSummaryTab';
export { IssuedFiscalDocumentCustomerTab } from './tabs/IssuedFiscalDocumentCustomerTab';
export { IssuedFiscalDocumentItemsTab } from './tabs/IssuedFiscalDocumentItemsTab';
export { IssuedFiscalDocumentTransportTab } from './tabs/IssuedFiscalDocumentTransportTab';
export { IssuedFiscalDocumentPaymentTab } from './tabs/IssuedFiscalDocumentPaymentTab';
export { IssuedFiscalDocumentEventsTab } from './tabs/IssuedFiscalDocumentEventsTab';

export type DetailTab = 'general' | 'customer' | 'items' | 'payment' | 'transport' | 'events';

const tabs: Array<{ id: DetailTab; label: string; icon: string }> = [
  { id: 'general', label: 'Resumo', icon: 'bi-receipt' },
  { id: 'customer', label: 'Cliente', icon: 'bi-person' },
  { id: 'items', label: 'Itens', icon: 'bi-box-seam' },
  { id: 'payment', label: 'Pagamento', icon: 'bi-credit-card' },
  { id: 'transport', label: 'Transporte', icon: 'bi-truck' },
  { id: 'events', label: 'Eventos', icon: 'bi-clock-history' },
];

export function IssuedFiscalDocumentDetailsTabList({
  activeTab,
  eventsCount = 0,
  onChange,
}: {
  activeTab: DetailTab;
  eventsCount?: number;
  onChange: (tab: DetailTab) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Abas dos detalhes fiscais"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-2 dark:border-slate-800 sm:px-4"
    >
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        const showBadge = tab.id === 'events' && eventsCount > 0;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`issued-fiscal-tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls={`issued-fiscal-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${
              isSelected
                ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i className={`bi ${tab.icon}`} />
            <span>{tab.label}</span>
            {showBadge && (
              <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-black text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {eventsCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function IssuedFiscalDocumentDetailsTabPanel({
  activeTab,
  emissionResult,
  fallbackDocument,
  details,
  parsed,
}: {
  activeTab: DetailTab;
  emissionResult?: NfeEmissionResult;
  fallbackDocument?: NfeDocumentRecord;
  details: FiscalDocumentDetails | null;
  parsed: ParsedFiscalDetails | null;
}) {
  return (
    <section
      role="tabpanel"
      id={`issued-fiscal-panel-${activeTab}`}
      aria-labelledby={`issued-fiscal-tab-${activeTab}`}
    >
      {activeTab === 'general' && (
        <IssuedFiscalDocumentSummaryTab
          emissionResult={emissionResult}
          fallbackDocument={fallbackDocument}
          details={details}
          parsed={parsed}
        />
      )}
      {activeTab === 'customer' && <IssuedFiscalDocumentCustomerTab parsed={parsed} />}
      {activeTab === 'items' && <IssuedFiscalDocumentItemsTab parsed={parsed} />}
      {activeTab === 'payment' && <IssuedFiscalDocumentPaymentTab parsed={parsed} />}
      {activeTab === 'transport' && <IssuedFiscalDocumentTransportTab parsed={parsed} />}
      {activeTab === 'events' && <IssuedFiscalDocumentEventsTab events={details?.events} />}
    </section>
  );
}
