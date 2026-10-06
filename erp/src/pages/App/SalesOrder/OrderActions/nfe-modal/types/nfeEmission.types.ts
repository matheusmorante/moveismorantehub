import type Order from '@/pages/types/order.type';
import type { FreightContractResponsible, TransportResponsible } from '../../../../../../../../shared-utils/fiscalTransportModel';
import type { NfeItemFiscal } from '../NfeItemsSection';
import type { ThirdPartyTransporterForm } from '../NfeTransportSection';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';

export interface FiscalFieldError {
  tab: 'general' | 'customer' | 'items' | 'transport' | 'payment';
  fieldId: string;
  message: string;
  itemIndex?: number;
  itemField?: 'ncm' | 'cfop' | 'cst' | 'origem';
}

export type NfeTabId = 'general' | 'customer' | 'items' | 'transport' | 'payment';

export interface NfeEmissionModalProps {
  isOpen: boolean;
  order: Order | null;
  initialEnvironment?: 1 | 2;
  onClose: () => void;
  onSuccess?: (result: NfeEmissionResult) => void;
}

export interface NfeSequencePreviewState {
  number: string;
  model: '55' | '65';
  series: string;
  environment: 1 | 2;
}

export interface NfeSequenceSettingsState {
  model: '55' | '65';
  series: string | null;
  environment: 1 | 2;
}

export interface NfeTransportState {
  transportResponsible: TransportResponsible | 'NONE';
  freightContractResponsible: FreightContractResponsible;
  thirdPartyTransporter: ThirdPartyTransporterForm;
}

// In-memory emission drafts survive modal unmounts; no product/order mutation or persistent PII.
export const emissionContexts = new Map<string, { finalConsumer: boolean }>();
export const fiscalDrafts = new Map<string, Record<number, Partial<NfeItemFiscal>>>();

export const clearFiscalEmissionDrafts = () => {
  emissionContexts.clear();
  fiscalDrafts.clear();
};

export const draftKey = (order: Order, environment: number) =>
  JSON.stringify([
    String(order.id),
    environment,
    (order as unknown as { version?: number }).version,
    (order.items || [])
      .filter((item) => item.itemType !== 'service')
      .map((item) => [
        item.orderItemId,
        item.productId,
        item.variationId,
        item.quantity,
        item.unitPrice,
      ]),
  ]);
