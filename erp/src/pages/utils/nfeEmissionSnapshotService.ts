import type Order from '../types/order.type';
import { fetchOrderById, updateOrder } from './orderHistoryService';
import { ensureOrderItemsHaveFiscalSnapshots } from './orderFiscalSnapshotService';
import { findAuthorizedFiscalDocument } from './nfe/findAuthorizedFiscalDocument';
import { fetchFiscalDocumentDetails } from '@/pages/App/FiscalDocuments/services/fiscalDocumentsService';
import {
  hasFiscalItemSnapshot,
  hasPersistedAuthorizedInvoice,
} from '../../../../shared-utils/orderItemFiscalSnapshot';

/**
 * Completes and persists legacy item snapshots for the selected fiscal environment.
 * An authorized invoice from another environment is never used as a source for it.
 */
const inFlightPreparations = new Map<string, Promise<Order>>();

async function prepareOrderFiscalSnapshot(order: Order, environment: 1 | 2): Promise<Order> {
  const needsSnapshot = (items: Order['items']) =>
    items.some(
      (item) =>
        item.itemType !== 'service' &&
        (!hasFiscalItemSnapshot(item) || !item.fiscal?.ncm || !item.fiscal.ncm.trim())
    );

  if (!order.id) {
    throw new Error('Salve o pedido antes de iniciar a emissão da nota fiscal.');
  }
  if (!needsSnapshot(order.items || [])) return order;

  const persistedOrder = await fetchOrderById(order.id);
  if (!persistedOrder?.id) {
    throw new Error('Não foi possível recarregar o pedido para preparar os dados fiscais.');
  }

  if (!needsSnapshot(persistedOrder.items || [])) return persistedOrder;

  const orderNfeStatus = String(persistedOrder.nfeData?.status || '').toLowerCase();
  const persistedEnvironment =
    persistedOrder.nfeData?.environment ??
    (orderNfeStatus === 'homologada' ? 2 : orderNfeStatus === 'autorizada' ? 1 : undefined);
  const orderInvoiceMatchesEnvironment = persistedEnvironment === environment;
  let invoiceSnapshotSource = orderInvoiceMatchesEnvironment
    ? persistedOrder.nfeData || undefined
    : undefined;
  let hasAuthorizedInvoice = hasPersistedAuthorizedInvoice({ nfeData: invoiceSnapshotSource });
  let hasAnyAuthorizedInvoice =
    hasPersistedAuthorizedInvoice(persistedOrder) ||
    ['autorizada', 'homologada'].includes(orderNfeStatus);
  const orderIndicatesAuthorizedInvoice =
    orderInvoiceMatchesEnvironment && ['autorizada', 'homologada'].includes(orderNfeStatus);

  if (!hasAuthorizedInvoice) {
    const authorizedDocument = await findAuthorizedFiscalDocument(persistedOrder.id, {
      throwOnError: true,
      environment,
    });
    if (authorizedDocument) {
      hasAnyAuthorizedInvoice = true;
      const details = await fetchFiscalDocumentDetails(authorizedDocument.id);
      const document = details.document;
      if (
        (document.status !== 'autorizada' && document.status !== 'homologada') ||
        document.order_id !== persistedOrder.id ||
        document.status !== authorizedDocument.status ||
        document.ambiente !== authorizedDocument.ambiente ||
        document.ambiente !== environment ||
        document.modelo !== authorizedDocument.modelo
      ) {
        throw new Error('O XML consultado não corresponde à nota autorizada vinculada ao pedido.');
      }
      if (!document.xml_nfe?.trim()) {
        throw new Error(
          'A nota autorizada não possui XML disponível para recuperar os dados fiscais originais.'
        );
      }
      invoiceSnapshotSource = {
        xml: document.xml_nfe,
        status: document.status,
      };
      hasAuthorizedInvoice = true;
    } else if (orderIndicatesAuthorizedInvoice) {
      throw new Error(
        'O pedido indica uma nota autorizada, mas o documento fiscal vinculado não foi localizado.'
      );
    } else if (!hasAnyAuthorizedInvoice) {
      // A nota de outro ambiente ainda protege o pedido contra alterações comerciais.
      // Detectá-la evita tentar gravar snapshots no order_data bloqueado pelo guard fiscal.
      hasAnyAuthorizedInvoice = Boolean(
        await findAuthorizedFiscalDocument(persistedOrder.id, { throwOnError: true })
      );
    }
  }

  const items = await ensureOrderItemsHaveFiscalSnapshots(
    persistedOrder.items || [],
    invoiceSnapshotSource
  );
  const unresolvedItemNumbers = items.flatMap((item, index) =>
    item.itemType !== 'service' && !hasFiscalItemSnapshot(item) ? [index + 1] : []
  );

  if (unresolvedItemNumbers.length > 0) {
    const source = hasAuthorizedInvoice
      ? 'Não foi possível recuperar os dados destes itens do XML autorizado do próprio pedido'
      : 'Não foi possível localizar os dados fiscais atuais dos produtos destes itens';
    throw new Error(
      `${source}: ${unresolvedItemNumbers.join(', ')}. Confira os itens antes de emitir.`
    );
  }

  // Pedidos com qualquer nota autorizada continuam protegidos. O snapshot de
  // outro ambiente pode ser usado em memória, mas nunca gravado sobre a venda.
  if (!hasAnyAuthorizedInvoice) {
    if (!persistedOrder.updatedAt) {
      throw new Error('Não foi possível confirmar a versão do pedido para salvar os dados fiscais.');
    }

    try {
      await updateOrder(
        persistedOrder.id,
        { items },
        persistedOrder,
        persistedOrder.updatedAt,
        { metadataOnly: true }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error &&
              typeof error.message === 'string'
            ? error.message
            : 'Não foi possível salvar os dados fiscais dos itens do pedido.';
      throw new Error(message, { cause: error });
    }
  }

  return { ...persistedOrder, items };
}

export function prepareOrderFiscalSnapshotForEmission(
  order: Order,
  environment: 1 | 2
): Promise<Order> {
  const orderId = order.id;
  if (!orderId) return prepareOrderFiscalSnapshot(order, environment);
  const preparationKey = `${orderId}:${environment}`;
  const existing = inFlightPreparations.get(preparationKey);
  if (existing) return existing;

  const preparation = prepareOrderFiscalSnapshot(order, environment);
  inFlightPreparations.set(preparationKey, preparation);
  const clearPreparation = () => {
    if (inFlightPreparations.get(preparationKey) === preparation) {
      inFlightPreparations.delete(preparationKey);
    }
  };
  void preparation.then(clearPreparation, clearPreparation);
  return preparation;
}
