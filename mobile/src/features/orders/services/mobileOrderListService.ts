import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import { fetchServerOrderPage } from '../../../../../shared-utils/orderListServerQuery';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import { fetchOrderSummaries } from '../../../../../shared-utils/orderSummaryQuery';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { refreshOfflineOrderSnapshots } from '../../../services/offline/orderSnapshotCache';

import type {
  MobileOrderListItem,
  MobileFiscalBadgeStatuses,
  FiscalBadgeStatus,
  FiscalDocumentStatusRow,
  MobileOrderType,
  OrderFiscalCancellationState,
} from '../domain/types';

export type { MobileOrderListItem, MobileFiscalBadgeStatuses, FiscalBadgeStatus };


const resolveFiscalBadgeStatus = (
  documents: readonly FiscalDocumentStatusRow[]
): FiscalBadgeStatus => {
  const isAuthorized = (document: FiscalDocumentStatusRow) =>
    document.status === 'autorizada' || document.status === 'homologada';
  const isOutbound = (document: FiscalDocumentStatusRow) =>
    (document.document_type || 'outbound') === 'outbound';

  if (
    documents.some(
      (document) =>
        (document.document_type === 'return' || document.document_type === 'estorno') &&
        isAuthorized(document)
    )
  ) {
    return 'reversed';
  }
  if (documents.some((document) => isOutbound(document) && isAuthorized(document))) return 'issued';
  if (documents.some((document) => isOutbound(document) && document.status === 'cancelada')) {
    return 'cancelled';
  }
  return 'not_issued';
};

export const resolveMobileFiscalBadgePair = (
  documents: readonly FiscalDocumentStatusRow[],
  isOrderCancelled: boolean = false
): MobileFiscalBadgeStatuses => {
  const prodDocs = documents.filter((doc) => doc.ambiente !== 2);
  const hmlDocs = documents.filter((doc) => doc.ambiente === 2);

  const production = resolveFiscalBadgeStatus(prodDocs);
  const homologation = resolveFiscalBadgeStatus(hmlDocs);

  const isAuthorized = (doc: FiscalDocumentStatusRow) =>
    doc.status === 'autorizada' || doc.status === 'homologada';

  const hasAuthorizedEstorno = documents.some(
    (doc) => doc.document_type === 'estorno' && isAuthorized(doc)
  );
  const returnDocs = documents.filter(
    (doc) => doc.document_type === 'return' && isAuthorized(doc)
  );

  let fiscalCancellationState: OrderFiscalCancellationState | undefined;
  if (isOrderCancelled) {
    const outboundDocs = documents.filter((d) => (d.document_type || 'outbound') === 'outbound');
    const hasCancelled = outboundDocs.some((d) => d.status === 'cancelada');
    const hasAuthorized = outboundDocs.some(isAuthorized);
    if (outboundDocs.some((d) => d.status === 'rejeitada' || d.status === 'erro')) {
      fiscalCancellationState = 'failed';
    } else if (hasAuthorized && !hasCancelled && !hasAuthorizedEstorno) {
      fiscalCancellationState = 'pending';
    }
  }

  return {
    production,
    homologation: homologation !== 'not_issued' ? homologation : undefined,
    estornoStatus: hasAuthorizedEstorno ? 'issued' : undefined,
    devolucaoStatus: returnDocs.length > 0 ? 'issued' : undefined,
    devolucaoCount: returnDocs.length,
    fiscalCancellationState,
  };
};

export const fetchMobileOrderFiscalBadgeStatuses = async (
  orderIds: readonly string[],
  orderCancelledMap?: Record<string, boolean>
): Promise<Record<string, MobileFiscalBadgeStatuses>> => {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (uniqueOrderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('nfe_documents')
    .select('order_id,status,document_type,ambiente')
    .in('order_id', uniqueOrderIds);
  if (error) throw error;

  const documentsByOrderId = new Map<string, FiscalDocumentStatusRow[]>();
  for (const row of (data || []) as FiscalDocumentStatusRow[]) {
    if (!row.order_id) continue;
    const documents = documentsByOrderId.get(row.order_id) || [];
    documents.push(row);
    documentsByOrderId.set(row.order_id, documents);
  }

  return Object.fromEntries(
    uniqueOrderIds.map((orderId) => [
      orderId,
      resolveMobileFiscalBadgePair(
        documentsByOrderId.get(orderId) || [],
        orderCancelledMap ? Boolean(orderCancelledMap[orderId]) : false
      ),
    ])
  );
};


interface OrderListRow {
  id: string;
  order_number: string | null;
  created_at: string | null;
  status: string | null;
  order_type: string | null;
  order_index: string | null;
  customer_name: string | null;
  total_value: number | string | null;
  delivery_method: string | null;
  scheduled_date: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  pending_scheduling: boolean | null;
  handling_type: string | null;
  delivery_status: string | null;
  delivery_arrived_at: string | null;
  delivery_started_at: string | null;
  unattended_reason: string | null;
  marketing_origin: string | null;
  is_stock_checked: boolean | null;
  item_handling: unknown;
  deleted?: boolean | null;
}

const toListItem = (row: any): MobileOrderListItem => {
  const data =
    row.order_data && typeof row.order_data === 'object' && !Array.isArray(row.order_data)
      ? { ...row.order_data }
      : {};
  delete data.isRegisteredInBling;
  delete data.is_registered_in_bling;
  const customerName =
    row.customer_name || data.customerData?.fullName || data.customer_name || 'Cliente';
  const orderNumber = String(
    row.order_number ??
      row.order_index ??
      data.orderIndex ??
      data.order_index ??
      data.orderNumber ??
      row.id ??
      ''
  ).trim();
  const orderStatus = row.status || data.status || 'scheduled';
  const orderType = row.order_type || data.orderType || data.order_type || 'sale';
  const totalValue = Number(
    row.total_amount ??
      data.paymentsSummary?.totalOrderValue ??
      data.totalValue ??
      row.total_value ??
      data.total ??
      0
  );

  const isStockChecked = Boolean(
    data.isStockChecked ?? data.is_stock_checked ?? row.is_stock_checked ?? row.isStockChecked
  );
  const isReturnOrder = orderType === 'return';
  const stockProcessed = isReturnOrder
    ? Boolean(
        data.returnStockProcessed ??
          data.return_stock_processed ??
          row.return_stock_processed ??
          data.stockProcessed ??
          data.stock_processed
      )
    : Boolean(
        data.stockProcessed ??
          data.stock_processed ??
          data.inventoryProcessed ??
          row.stock_processed ??
          row.stockProcessed
      );
  const stockReversed = isReturnOrder
    ? Boolean(
        data.returnStockReversed ??
          data.return_stock_reversed ??
          row.return_stock_reversed ??
          data.stockReversed ??
          data.stock_reversed
      )
    : Boolean(
        data.stockReversed ??
          data.stock_reversed ??
          data.inventoryReversed ??
          row.stock_reversed ??
          row.stockReversed
      );
  const returnOrderId =
    data.returnOrderId || data.return_order_id || row.return_order_id || row.returnOrderId || null;
  const returnKind =
    data.returnKind || data.return_kind || row.return_kind || row.returnKind || null;
  const linkedOrderId =
    data.linkedOrderId || data.linked_order_id || row.linked_order_id || row.linkedOrderId || null;
  const linkedOrderCode =
    data.linkedOrderCode ||
    data.linked_order_code ||
    row.linked_order_code ||
    row.linkedOrderCode ||
    null;

  return {
    id: String(row.id),
    order_number: orderNumber,
    created_at: row.created_at || data.createdAt || data.date || null,
    status: orderStatus,
    order_type: orderType,
    customer_name: customerName,
    total_value: totalValue,
    version: row.version ?? undefined,
    is_stock_checked: isStockChecked,
    stock_processed: stockProcessed,
    stock_reversed: stockReversed,
    return_order_id: returnOrderId,
    return_kind: returnKind,
    linked_order_id: linkedOrderId,
    linked_order_code: linkedOrderCode,
    order_data: {
      ...data,
      id: String(row.id),
      deleted: Boolean(data.deleted ?? row.deleted),
      orderIndex: data.orderIndex || data.order_index || orderNumber || String(row.id),
      status: orderStatus,
      orderType: orderType,
      customerData: data.customerData || { fullName: customerName },
      paymentsSummary: data.paymentsSummary || { totalOrderValue: totalValue },
      handlingType: data.handlingType || data.handling || row.handling_type || '',
      deliveryStatus: data.deliveryStatus || row.delivery_status || '',
      deliveryArrivedAt: data.deliveryArrivedAt || row.delivery_arrived_at || '',
      deliveryStartedAt: data.deliveryStartedAt || row.delivery_started_at || '',
      deliveryResponsibles: data.deliveryResponsibles || null,
      deliveryResponsibleName: data.deliveryResponsibleName || null,
      deliveryResponsibleId: data.deliveryResponsibleId || null,
      unattendedReason: data.unattendedReason || row.unattended_reason || '',
      marketingOrigin:
        data.marketingOrigin || data.customerData?.marketingOrigin || row.marketing_origin || '',
      isStockChecked,
      stockProcessed,
      stockReversed,
      returnStockProcessed: isReturnOrder ? stockProcessed : undefined,
      returnStockReversed: isReturnOrder ? stockReversed : undefined,

      returnOrderId,
      returnKind,
      linkedOrderId,
      linkedOrderCode,
      items: Array.isArray(data.items)
        ? data.items
        : Array.isArray(row.items)
          ? row.items
          : Array.isArray(row.item_handling)
            ? row.item_handling
            : [],
      shipping: data.shipping || {
        deliveryMethod: data.deliveryMethod || row.delivery_method || '',
        scheduling: data.scheduling || {
          date: data.scheduledDate || row.scheduled_date || '',
          startTime: row.scheduled_start_time || row.schedule_start_time || '',
          endTime: row.scheduled_end_time || row.schedule_end_time || '',
          pendingScheduling: Boolean(row.pending_scheduling),
        },
      },
    },
  };
};

export const fetchMobileOrdersPage = async ({
  page,
  pageSize,
  search,
  status,
  orderType = 'sale',
  signal,
}: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  orderType?: MobileOrderType;
  signal?: AbortSignal;
}): Promise<{ items: MobileOrderListItem[]; total: number }> => {
  const selected = await fetchServerOrderPage(supabase, {
    filters: { orderType, mobileSearch: search.trim(), mobileStatus: status },
    page, pageSize, mode: 'mobile', signal,
  });
  if (selected.ids.length === 0) return { items: [], total: selected.total };

  const data = await fetchOrderSummaries(supabase, selected.ids, signal);

  const byId = new Map((data || []).map((row: any) => [String(row.id), row]));
  const items = selected.ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toListItem(row)] : [];
  });
  await refreshOfflineOrderSnapshots(data, signal).catch((cause) => console.warn('[MobileOrders] Não foi possível atualizar os detalhes offline:', cause));
  return { items: await cacheOrders(items), total: selected.total };
};

async function cacheOrders(items: MobileOrderListItem[]): Promise<MobileOrderListItem[]> {
  // Cache é um acelerador de leitura, não pode invalidar dados recebidos do ERP
  // enquanto a migração SQLite ainda está inicializando no primeiro carregamento.
  try {
    const previous = await offlineStorageService.getWorkingSet<MobileOrderListItem[]>('order_list_summaries').catch(() => null);
    const byId = new Map((previous?.data || []).map((item) => [item.id, item]));
    items.forEach((item) => byId.set(item.id, item));
    await offlineStorageService.cacheWorkingSet('order_list_summaries', [...byId.values()]);
    // A summary must never replace an existing complete offline snapshot.
    await Promise.all(
      items.filter((item) => !isIdentifiedTestArtifact(item.order_data)).map((item) =>
        item.order_data.__orderSummary ? Promise.resolve() : OrderRepository.saveLocal({
          id: item.id,
          status: item.status,
          orderType: item.order_type,
          customerName: item.customer_name,
          totalAmount: item.total_value,
          orderData: {
            ...item.order_data,
            createdAt: item.created_at || item.order_data.createdAt || undefined,
          },
          version: item.version ?? 1,
          updatedAt: item.created_at ?? new Date().toISOString(),
          syncedAt: new Date().toISOString(),
          isPendingLocal: false,
        }, { preservePending: true })
      )
    );
    return await OrderRepository.overlayPendingLocalOrders(items);
  } catch (error) {
    console.warn('[MobileOrders] Cache local indisponível; mantendo resposta remota:', error);
  }
  return items;
}
