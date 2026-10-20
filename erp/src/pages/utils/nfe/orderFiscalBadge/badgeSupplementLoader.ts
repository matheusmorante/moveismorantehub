import { supabase } from '../../supabaseConfig';
import { getAuthorizedAt } from '../nfeEventRules';
import type {
  BadgeDocumentRow,
  FiscalBadgeSupplement,
  RelatedOrderRow,
} from './orderFiscalBadge.types';

export const DOCUMENT_SELECT =
  'id,order_id,related_return_order_id,status,document_type,ambiente,created_at,numero_nfe,serie,modelo,valor_total';

export async function fetchBadgeSupplementFromApi(
  orderIds: readonly string[],
  accessToken: string
): Promise<FiscalBadgeSupplement | null> {
  try {
    const response = await fetch('/api/nfe/order-fiscal-badges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ orderIds: [...orderIds] }),
    });
    if (response.ok) {
      return (await response.json()) as FiscalBadgeSupplement;
    }
  } catch {
    // Fall back to direct database query
  }
  return null;
}

export async function loadScopedBadgeSupplement(
  orderIds: readonly string[],
  includeRelatedReturns: boolean
): Promise<{ supplement: FiscalBadgeSupplement; documents: BadgeDocumentRow[] }> {
  const { data: visibleOrders, error: visibleOrdersError } = await supabase
    .from('orders')
    .select('id,status')
    .in('id', [...orderIds]);
  if (visibleOrdersError) throw visibleOrdersError;

  const relatedReturns: RelatedOrderRow[] = [];
  if (includeRelatedReturns) {
    const [linkedResult, legacyResult] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id,status,order_type,linked_order_id,order_index,legacy_parent_id:order_data->>linkedOrderId'
        )
        .eq('order_type', 'return')
        .in('linked_order_id', [...orderIds]),
      supabase
        .from('orders')
        .select(
          'id,status,order_type,linked_order_id,order_index,legacy_parent_id:order_data->>linkedOrderId'
        )
        .eq('order_type', 'return')
        .in('order_data->>linkedOrderId', [...orderIds]),
    ]);
    if (linkedResult.error) throw linkedResult.error;
    if (legacyResult.error) throw legacyResult.error;

    const uniqueReturns = new Map<string, RelatedOrderRow>();
    for (const row of [...(linkedResult.data || []), ...(legacyResult.data || [])]) {
      uniqueReturns.set(String(row.id), row as RelatedOrderRow);
    }
    relatedReturns.push(...uniqueReturns.values());
  }

  const scopedOrderIds = [
    ...new Set([...orderIds, ...relatedReturns.map((row) => String(row.id))]),
  ];
  const { data: directRows, error: documentsError } = await supabase
    .from('nfe_documents')
    .select(DOCUMENT_SELECT)
    .in('order_id', scopedOrderIds);
  if (documentsError) throw documentsError;

  const { data: relatedRows, error: relatedDocumentsError } = await supabase
    .from('nfe_documents')
    .select(DOCUMENT_SELECT)
    .in('related_return_order_id', scopedOrderIds);
  if (relatedDocumentsError) throw relatedDocumentsError;

  const rows = [
    ...new Map(
      [...(directRows || []), ...(relatedRows || [])].map((row) => [row.id, row])
    ).values(),
  ];

  const returnDocumentIds = [
    ...new Set(
      (rows || [])
        .filter((row) => row.document_type === 'return' && row.id)
        .map((row) => String(row.id))
    ),
  ];

  let itemQuantityByDocumentId = new Map<string, number>();
  let authorizationXmlByDocumentId = new Map<string, string>();

  if (returnDocumentIds.length) {
    const [itemsResult, protocolResult] = await Promise.all([
      supabase
        .from('nfe_document_items')
        .select('document_id,billed_quantity')
        .in('document_id', returnDocumentIds),
      supabase.from('nfe_documents').select('id,xml_protocolo').in('id', returnDocumentIds),
    ]);
    const { data: items, error: itemsError } = itemsResult;
    const { data: protocols, error: protocolError } = protocolResult;

    if (!itemsError) {
      itemQuantityByDocumentId = new Map<string, number>();
      for (const item of items || []) {
        const documentId = String(item.document_id || '');
        if (!documentId) continue;
        itemQuantityByDocumentId.set(
          documentId,
          (itemQuantityByDocumentId.get(documentId) || 0) + Number(item.billed_quantity || 0)
        );
      }
    }

    if (!protocolError) {
      authorizationXmlByDocumentId = new Map(
        (protocols || []).map((document) => [
          String(document.id),
          String(document.xml_protocolo || ''),
        ])
      );
    }
  }

  const returnOrderById = new Map(relatedReturns.map((row) => [String(row.id), row]));
  const documents: BadgeDocumentRow[] = (rows || []).map((row) => {
    const returnOrderId =
      row.document_type === 'return'
        ? row.related_return_order_id || row.order_id
        : row.order_id;
    const returnOrder = returnOrderById.get(String(returnOrderId || ''));
    const isReturnDocument = row.document_type === 'return';

    const document: BadgeDocumentRow = {
      ...row,
      order_id: returnOrderId,
      issuedAt:
        isReturnDocument && row.id
          ? getAuthorizedAt(authorizationXmlByDocumentId.get(String(row.id)) || '', '') || null
          : null,
      ...(isReturnDocument && returnOrder
        ? { returnOrderCode: returnOrder.order_index || returnOrder.id }
        : {}),
      ...(isReturnDocument && row.id
        ? { itemQuantity: itemQuantityByDocumentId.get(String(row.id)) }
        : {}),
    };
    return document;
  });

  const cancelledOrderIds = (visibleOrders || [])
    .filter((order) =>
      ['cancelled', 'cancelado'].includes(String(order.status || '').toLowerCase())
    )
    .map((order) => String(order.id));

  return {
    supplement: {
      documents,
      returnOrders: relatedReturns,
      cancelledOrderIds,
    },
    documents,
  };
}
