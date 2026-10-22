import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import type {
  FiscalExportDocument,
  FiscalExportEvent,
  FiscalExportFilters,
  FiscalExportHistoryItem,
  FiscalExportPreview,
} from '../types/fiscalExport.types';

export interface FiscalExportPage {
  documents: FiscalExportDocument[];
  linkedDocuments: FiscalExportDocument[];
  events: FiscalExportEvent[];
  orderNumbers: Record<string, number>;
  nextOffset: number | null;
}

async function postFiscalExport<T>(payload: Record<string, unknown>): Promise<T> {
  const sessionResult = await withTimeout(
    supabase.auth.getSession(),
    8_000,
    null,
    'fiscal-export:session'
  );
  const accessToken = sessionResult?.data?.session?.access_token;
  if (!accessToken) throw new Error('Sua sessão expirou. Entre novamente para exportar documentos fiscais.');

  const response = await fetch('/api/nfe/export-documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  let result: Record<string, unknown>;
  try {
    result = await response.json() as Record<string, unknown>;
  } catch {
    throw new Error('O serviço fiscal retornou uma resposta inválida. Tente novamente.');
  }
  if (!response.ok || result.success !== true) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível concluir a exportação fiscal.');
  }
  return result as T;
}

export async function previewFiscalExport(filters: FiscalExportFilters): Promise<FiscalExportPreview> {
  const result = await postFiscalExport<FiscalExportPreview & { success: true }>({ action: 'preview', filters });
  return {
    totalCount: result.totalCount,
    inboundCount: result.inboundCount,
    eventCount: result.eventCount,
    totalValue: result.totalValue,
    groups: result.groups,
  };
}

export async function fetchFiscalExportPage(
  filters: FiscalExportFilters,
  offset: number
): Promise<FiscalExportPage> {
  const result = await postFiscalExport<FiscalExportPage & { success: true }>({ action: 'page', filters, offset });
  return {
    documents: result.documents,
    linkedDocuments: result.linkedDocuments,
    events: result.events,
    orderNumbers: result.orderNumbers,
    nextOffset: result.nextOffset,
  };
}

export async function recordFiscalExport(input: {
  exportId: string;
  archiveName: string;
  filters: FiscalExportFilters;
}): Promise<void> {
  await postFiscalExport({ action: 'record', ...input });
}

export async function fetchFiscalExportHistory(): Promise<FiscalExportHistoryItem[]> {
  const result = await postFiscalExport<{ history: FiscalExportHistoryItem[] }>({ action: 'history' });
  return result.history || [];
}
