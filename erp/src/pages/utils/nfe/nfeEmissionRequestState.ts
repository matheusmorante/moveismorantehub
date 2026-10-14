import type Order from '@/pages/types/order.type';
import { parseFiscalItemSelections } from '../../../../../shared-utils/fiscalItemSelections';
import { supabase } from '../supabaseConfig';

export const fiscalEmissionRequestIds = new Map<string, string>();
export const fiscalReplacementSources = new Map<string, string>();
export const fiscalSupersedingDocuments = new Map<string, string>();

export const fiscalRequestStorageKey = (requestKey: string): string =>
  `nfe-emission-request:${requestKey}`;

export const fiscalReplacementSourceStorageKey = (requestKey: string): string =>
  `nfe-emission-replacement-source:${requestKey}`;

export const fiscalSupersedingStorageKey = (requestKey: string, requestId: string): string =>
  `nfe-emission-supersedes:${requestKey}:${requestId}`;

/**
 * Limpa o identificador e os metadados de substituição da tentativa fiscal em memória e no localStorage.
 */
export const clearFiscalEmissionRequest = (orderId: string, environment: 1 | 2): void => {
  const k = `${orderId}:outbound:${environment}`;
  const requestId = fiscalEmissionRequestIds.get(k);
  fiscalEmissionRequestIds.delete(k);
  if (requestId) fiscalSupersedingDocuments.delete(fiscalSupersedingStorageKey(k, requestId));
  try {
    if (typeof window !== 'undefined') {
      const storedRequestId = window.localStorage.getItem(fiscalRequestStorageKey(k));
      window.localStorage.removeItem(fiscalRequestStorageKey(k));
      if (requestId || storedRequestId)
        window.localStorage.removeItem(
          fiscalSupersedingStorageKey(k, requestId || storedRequestId || '')
        );
    }
  } catch {
    /* armazenamento indisponível */
  }
};

/**
 * Registra o documento original que será substituído por esta nova emissão.
 */
export function setFiscalEmissionReplacementSource(
  orderId: string,
  environment: 1 | 2,
  documentId: string
): void {
  const requestKey = `${orderId}:outbound:${environment}`;
  fiscalReplacementSources.set(requestKey, documentId);
  try {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(fiscalReplacementSourceStorageKey(requestKey), documentId);
  } catch {
    /* armazenamento indisponível */
  }
}

/**
 * Constrói os payloads de CSOSN e seleções fiscais confirmadas para os itens do pedido.
 */
export function buildFiscalItemSelectionPayload(order: Order): {
  itemCsosnOverrides: Record<string, string>;
  itemFiscalSelections: ReturnType<typeof parseFiscalItemSelections>;
} {
  const productItems = (order.items || []).filter((item) => item.itemType !== 'service');
  const itemCsosnOverrides = Object.fromEntries(
    productItems.flatMap((item, index) => {
      const fiscal = item.fiscal as Record<string, unknown> | undefined;
      return fiscal?.csosnSource === 'manual' && fiscal.cst
        ? [[String(index + 1), String(fiscal.cst)]]
        : [];
    })
  );
  const itemFiscalSelections = parseFiscalItemSelections(
    Object.fromEntries(
      productItems.flatMap((item, index) => {
        const fiscal = item.fiscal;
        return fiscal
          ? [
              [
                String(index + 1),
                {
                  ncm: fiscal.ncm,
                  cfop: fiscal.cfop,
                  origem: fiscal.origem,
                  cest: fiscal.cest ?? '',
                  csosn: fiscal.cst,
                },
              ],
            ]
          : [];
      })
    )
  );
  return { itemCsosnOverrides, itemFiscalSelections };
}

/**
 * Resolve exclusivamente o documento durável correspondente a esta tentativa fiscal específica.
 * Nunca emite ou limpa o registro de intenção.
 */
export async function findFiscalDocumentForRequest(
  orderId: string,
  environment: 1 | 2,
  emissionRequestId: string
): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(emissionRequestId))
    throw new Error('Identificador da tentativa fiscal inválido.');
  const { data, error } = await supabase
    .from('nfe_documents')
    .select('id')
    .eq('order_id', orderId)
    .eq('ambiente', environment)
    .eq('emission_request_id', emissionRequestId)
    .maybeSingle();
  if (error)
    throw new Error(
      'A tentativa ainda não pode ser localizada. Aguarde e consulte novamente; a intenção original foi preservada.'
    );
  if (!data?.id) {
    const notFound = new Error('FISCAL_REQUEST_DOCUMENT_NOT_FOUND');
    Object.assign(notFound, { code: 'FISCAL_REQUEST_DOCUMENT_NOT_FOUND' });
    throw notFound;
  }
  return data.id;
}
