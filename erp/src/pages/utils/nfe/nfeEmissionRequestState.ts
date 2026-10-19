import type Order from '@/pages/types/order.type';
import { parseFiscalItemSelections } from '../../../../../shared-utils/fiscalItemSelections';
import { supabase } from '../supabaseConfig';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { isFiscalNumber } from '../../../../../shared-utils/fiscalNumbering';

export const fiscalEmissionRequestIds = new Map<string, string>();
export const fiscalReplacementSources = new Map<string, string>();
export const fiscalSupersedingDocuments = new Map<string, string>();

export const fiscalRequestStorageKey = (requestKey: string): string =>
  `nfe-emission-request:${requestKey}`;

export const fiscalReplacementSourceStorageKey = (requestKey: string): string =>
  `nfe-emission-replacement-source:${requestKey}`;

export const fiscalSupersedingStorageKey = (requestKey: string, requestId: string): string =>
  `nfe-emission-supersedes:${requestKey}:${requestId}`;

/** Read-only recovery also works in a new browser session without local storage. */
export async function findPendingFiscalEmission(orderId: string, environment: 1 | 2) {
  const query = supabase.from('nfe_documents')
    .select('id,order_id,ambiente,document_type,status,emission_request_id,chave_acesso,numero_nfe,serie,modelo')
    .eq('order_id', orderId)
    .eq('ambiente', environment)
    .eq('document_type', 'outbound')
    .in('status', ['pendente', 'processando'])
    .limit(2);
  const result = await withTimeout(
    query.then(({ data, error }) => ({ data, failed: Boolean(error) })),
    10_000, { data: null, failed: true }, 'fiscal-pending-attempt-lookup'
  );
  if (result.failed || !result.data)
    throw new Error('Não foi possível conferir as tentativas fiscais anteriores. Feche e reabra a emissão para consultar novamente.');
  if (result.data.length > 1)
    throw new Error('Há mais de uma tentativa fiscal pendente para este pedido. Confira as notas fiscais antes de continuar.');
  const document = result.data[0];
  if (!document) return null;
  const number = Number(document.numero_nfe);
  const model = String(document.modelo);
  if (!document.id || document.order_id !== orderId || Number(document.ambiente) !== environment ||
      document.document_type !== 'outbound' || !['pendente', 'processando'].includes(document.status || '') ||
      !isFiscalNumber(number) || !document.serie || !['55', '65'].includes(model))
    throw new Error('Não foi possível confirmar a identidade da tentativa fiscal pendente. Confira as notas fiscais antes de continuar.');
  return {
    documentId: document.id, orderId, environment,
    emissionRequestId: document.emission_request_id || undefined,
    accessKey: document.chave_acesso || undefined,
    nfeNumber: number, series: String(document.serie), model: model as '55' | '65',
  };
}

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
