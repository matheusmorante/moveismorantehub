import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';

export interface UseNfeItemEnrichmentProps {
  order: Order | null;
  environment: 1 | 2;
  finalConsumer?: boolean;
  recipientIeIndicator?: '1' | '2' | '9';
  model?: '55' | '65';
  manualFiscalFields: React.MutableRefObject<Map<string, Record<number, Partial<NfeItemFiscal>>>>;
}

export interface UseNfeItemEnrichmentReturn {
  nfeItems: NfeItemWithFiscal[];
  isLoadingFiscalData: boolean;
  fiscalPreparationError: string | null;
  handleUpdateItemFiscal: (index: number, updates: Partial<NfeItemFiscal>) => void;
  handleBatchUpdateItems: (updated: NfeItemWithFiscal[]) => void;
}
