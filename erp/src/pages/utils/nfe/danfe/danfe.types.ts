import Order from '@/pages/types/order.type';
import { AppSettings } from '../../settingsService';
import type { ParsedFiscalDetails } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';

export interface DanfeData {
  order: Order;
  settings: AppSettings;
  accessKey: string;
  nfeNumber: number;
  series: string;
  protocolNumber: string;
  protocolDate: string;
  model: '55' | '65';
  environment: 1 | 2;
  status: 'autorizada' | 'homologada' | 'pendente';
  natOp?: string;
  fiscalDetails?: ParsedFiscalDetails;
}
