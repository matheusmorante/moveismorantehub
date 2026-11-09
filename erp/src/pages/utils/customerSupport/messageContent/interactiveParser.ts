import { formatReceivedValue, removeFlowToken } from './formatters';
import type { ExtractedMessageContent } from './types';

export function parseInteractiveFlow(
  flowReply: any,
  replyToWamid?: string,
  type = 'interactive'
): ExtractedMessageContent {
  const responseJson = typeof flowReply.response_json === 'string' ? flowReply.response_json : '';
  let response: Record<string, unknown> = {};
  let parsedResponse = false;
  try {
    const parsed = responseJson ? JSON.parse(responseJson) : flowReply.response_json;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      response = parsed;
      parsedResponse = true;
    }
  } catch {
    // Show a safe fallback rather than exposing an opaque Flow token or payload.
  }
  const safeResponse = removeFlowToken(response) as Record<string, unknown>;
  const responseLines = Object.entries(safeResponse).map(
    ([key, value]) => key.replace(/[_-]+/g, ' ') + ': ' + formatReceivedValue(value)
  );
  const flowName = typeof flowReply.name === 'string' ? flowReply.name.trim() : '';
  const fallbackLine = !parsedResponse && responseJson ? 'Resposta recebida em formato não reconhecido.' : '';

  return {
    type: 'interactive',
    text: ['📋 Resposta do formulário', flowName ? 'Fluxo: ' + flowName : '', ...responseLines, fallbackLine]
      .filter(Boolean)
      .join('\n'),
    replyToWamid,
    rawPayload: {
      provider_message_type: type,
      interactive: {
        type: 'nfm_reply',
        nfm_reply: { ...(flowName ? { name: flowName } : {}), response: safeResponse },
      },
    },
  };
}

export function parseInteractiveSelection(
  selection: any,
  rawInteractive: any,
  replyToWamid?: string,
  type = 'interactive'
): ExtractedMessageContent {
  const buttonTitle = selection?.title || 'Resposta interativa';
  const description = typeof selection?.description === 'string' ? selection.description.trim() : '';
  const selectionId = typeof selection?.id === 'string' ? selection.id.trim() : '';

  return {
    type: 'interactive',
    text: [`🔘 ${buttonTitle}`, description, selectionId ? `Identificador: ${selectionId}` : '']
      .filter(Boolean)
      .join('\n'),
    replyToWamid,
    rawPayload: { provider_message_type: type, interactive: rawInteractive || {} },
  };
}

export function parseCatalogOrder(
  order: any,
  replyToWamid?: string,
  type = 'order'
): ExtractedMessageContent {
  const items = Array.isArray(order?.product_items) ? order.product_items : [];
  const itemSummaries = items.map((item: any) => {
    const quantity = String(item?.quantity ?? '1').trim() || '1';
    const product =
      typeof item?.product_retailer_id === 'string' && item.product_retailer_id.trim()
        ? item.product_retailer_id.trim()
        : 'Produto do catálogo';
    const amount = item?.item_price == null ? Number.NaN : Number(item.item_price);
    const currency = typeof item?.currency === 'string' ? item.currency.toUpperCase() : '';
    let unitPrice = '';
    if (Number.isFinite(amount)) {
      try {
        unitPrice = currency
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount).replace(/\u00a0/g, ' ')
          : amount.toFixed(2);
      } catch {
        unitPrice = `${amount.toFixed(2)}${currency ? ` ${currency}` : ''}`;
      }
    }
    return `• ${quantity} × ${product}${unitPrice ? ` — ${unitPrice} cada` : ''}`;
  });
  const customerText = typeof order?.text === 'string' ? order.text.trim() : '';
  const catalogId = typeof order?.catalog_id === 'string' ? order.catalog_id.trim() : '';

  return {
    type: 'interactive',
    text: [
      '🛒 Pedido recebido pelo catálogo',
      ...(catalogId ? [`Catálogo: ${catalogId}`] : []),
      ...itemSummaries,
      ...(customerText ? [`Mensagem: ${customerText}`] : []),
    ].join('\n'),
    replyToWamid,
    rawPayload: { provider_message_type: type, order },
  };
}
