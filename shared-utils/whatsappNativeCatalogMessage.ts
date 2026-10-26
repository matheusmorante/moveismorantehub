export interface WhatsAppNativeCatalogMessageInput {
  recipient: string;
  catalogId: string;
  bodyText: string;
  retailerIds: string[];
}

/** Builds the official Cloud API payload for a single product or product list. */
export function buildWhatsAppNativeCatalogMessage({
  recipient,
  catalogId,
  bodyText,
  retailerIds,
}: WhatsAppNativeCatalogMessageInput): Record<string, unknown> {
  const normalizedRecipient = recipient.replace(/\D/g, '');
  const normalizedCatalogId = catalogId.trim();
  const normalizedBody = bodyText.trim();
  const normalizedRetailerIds = retailerIds.map((id) => id.trim());

  if (!/^\d{10,15}$/.test(normalizedRecipient)) throw new Error('Telefone inválido para mensagem de catálogo.');
  if (!/^\d{1,32}$/.test(normalizedCatalogId)) throw new Error('Catálogo da Meta não configurado.');
  if (!normalizedBody || normalizedBody.length > 1024) throw new Error('A mensagem deve ter entre 1 e 1024 caracteres.');
  if (normalizedRetailerIds.length < 1 || normalizedRetailerIds.length > 30
    || normalizedRetailerIds.some((id) => !id || id.length > 100)) {
    throw new Error('A lista nativa deve ter de 1 a 30 produtos publicados no catálogo da Meta.');
  }

  const basePayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedRecipient,
    type: 'interactive',
  };

  if (normalizedRetailerIds.length === 1) {
    return {
      ...basePayload,
      interactive: {
        type: 'product',
        body: { text: normalizedBody },
        action: {
          catalog_id: normalizedCatalogId,
          product_retailer_id: normalizedRetailerIds[0],
        },
      },
    };
  }

  return {
    ...basePayload,
    interactive: {
      type: 'product_list',
      header: { type: 'text', text: 'Produtos selecionados' },
      body: { text: normalizedBody },
      action: {
        catalog_id: normalizedCatalogId,
        sections: [{
          title: 'Selecionados',
          product_items: normalizedRetailerIds.map((product_retailer_id) => ({ product_retailer_id })),
        }],
      },
    },
  };
}
