export type MetaGraphOperation =
  | 'sender_status'
  | 'connection_test'
  | 'list_templates'
  | 'send_message'
  | 'list_catalog_products'
  | 'sync_catalog_batch'
  | 'check_catalog_batch'
  | 'list_product_sets'
  | 'delete_product_set';

export type MetaMessagePurpose = 'sales' | 'delivery' | 'warranty' | 'settings_test';

export interface MetaGraphProxyInput {
  operation: MetaGraphOperation | string;
  purpose?: unknown;
  phoneNumberId?: unknown;
  wabaId?: unknown;
  catalogId?: unknown;
  productSetId?: unknown;
  handle?: unknown;
  payload?: unknown;
}

export interface MetaGraphProxyPlan {
  permission: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
}

export interface MetaGraphSettings {
  phoneNumberId?: unknown;
  wabaId?: unknown;
  catalogId?: unknown;
}

const numericId = (value: unknown): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{1,32}$/.test(normalized)) throw new Error('Identificador Meta inválido.');
  return normalized;
};

const configuredId = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Integração Meta não configurada.');
  return numericId(value);
};

const configuredResourceId = (requested: unknown, configured: unknown): string => {
  const configuredValue = configuredId(configured);
  if (requested === undefined || requested === null || requested === '') return configuredValue;
  if (numericId(requested) !== configuredValue) {
    throw new Error('Identificador Meta não corresponde à configuração.');
  }
  return configuredValue;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Dados da solicitação inválidos.');
  }
  return value as Record<string, unknown>;
}

function validateMessage(payloadValue: unknown): Record<string, unknown> {
  const payload = record(payloadValue);
  if (payload.messaging_product !== 'whatsapp') throw new Error('Mensagem inválida.');
  const type = payload.type;
  if (!['text', 'template', 'document', 'interactive'].includes(String(type))) {
    throw new Error('Tipo de mensagem não permitido.');
  }
  const to = typeof payload.to === 'string' ? payload.to : '';
  if (!/^\d{10,15}$/.test(to)) throw new Error('Telefone destinatário inválido.');
  if (type === 'text') {
    const text = record(payload.text);
    if (typeof text.body !== 'string' || !text.body.trim() || text.body.length > 4096) {
      throw new Error('Texto da mensagem inválido.');
    }
  }
  if (type === 'template') {
    const template = record(payload.template);
    if (typeof template.name !== 'string' || !/^[a-zA-Z0-9_]{1,512}$/.test(template.name)) {
      throw new Error('Modelo de mensagem inválido.');
    }
  }
  if (type === 'document') {
    const document = record(payload.document);
    if (typeof document.link !== 'string' || !document.link.startsWith('https://')) {
      throw new Error('Documento inválido.');
    }
  }
  return payload;
}

function validateCatalogBatch(payloadValue: unknown): Record<string, unknown> {
  const payload = record(payloadValue);
  const requests = payload.requests;
  if (
    payload.item_type !== 'PRODUCT_ITEM' ||
    !Array.isArray(requests) ||
    requests.length < 1 ||
    requests.length > 50
  ) {
    throw new Error('Lote do catálogo inválido.');
  }
  for (const requestValue of requests) {
    const request = record(requestValue);
    if (!['CREATE', 'UPDATE', 'DELETE'].includes(String(request.method))) {
      throw new Error('Operação de catálogo inválida.');
    }
    if (typeof request.retailer_id !== 'string' || !request.retailer_id.trim() || request.retailer_id.length > 100) {
      throw new Error('Identificador do produto inválido.');
    }
    if (request.method !== 'DELETE') record(request.data);
  }
  return payload;
}

export function planMetaGraphRequest(
  input: MetaGraphProxyInput,
  settings: MetaGraphSettings
): MetaGraphProxyPlan {
  switch (input.operation) {
    case 'sender_status': {
      const phoneId = configuredResourceId(input.phoneNumberId, settings.phoneNumberId);
      return {
        permission: 'manageSettings',
        method: 'GET',
        path: `${phoneId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status,status,quality_score,messaging_limit_tier`,
      };
    }
    case 'connection_test': {
      const phoneId = configuredResourceId(input.phoneNumberId, settings.phoneNumberId);
      return {
        permission: 'manageSettings',
        method: 'GET',
        path: `${phoneId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,status,quality_score,messaging_limit_tier`,
      };
    }
    case 'list_templates':
      return {
        permission: 'manageSettings',
        method: 'GET',
        path: `${configuredResourceId(input.wabaId, settings.wabaId)}/message_templates?fields=name,status,language,category,components`,
      };
    case 'send_message': {
      if (input.purpose === 'customer_support') {
        throw new Error('Envio indisponível por política da empresa.');
      }
      const purpose = input.purpose as MetaMessagePurpose;
      const permissionByPurpose: Record<MetaMessagePurpose, string> = {
        sales: 'createEditOrders',
        delivery: 'startDelivery',
        warranty: 'viewOrders',
        settings_test: 'manageSettings',
      };
      const permission = permissionByPurpose[purpose];
      if (!permission) throw new Error('Finalidade de mensagem inválida.');
      return {
        permission,
        method: 'POST',
        path: `${configuredId(settings.phoneNumberId)}/messages`,
        body: validateMessage(input.payload),
      };
    }
    case 'list_catalog_products':
      return {
        permission: 'viewChannelCatalog',
        method: 'GET',
        path: `${configuredResourceId(input.catalogId, settings.catalogId)}/products?fields=id,retailer_id,name,description,price,currency,image_url,url,visibility,is_hidden`,
      };
    case 'sync_catalog_batch':
      return {
        permission: 'productConfig',
        method: 'POST',
        path: `${configuredId(settings.catalogId)}/items_batch`,
        body: validateCatalogBatch(input.payload),
      };
    case 'check_catalog_batch': {
      const handle = typeof input.handle === 'string' ? input.handle.trim() : '';
      if (!/^[A-Za-z0-9_=-]{1,512}$/.test(handle)) throw new Error('Identificador do lote inválido.');
      return {
        permission: 'viewChannelCatalog',
        method: 'GET',
        path: `${configuredId(settings.catalogId)}/check_batch_request_status?handle=${encodeURIComponent(handle)}`,
      };
    }
    case 'list_product_sets':
      return {
        permission: 'viewChannelCatalog',
        method: 'GET',
        path: `${configuredId(settings.catalogId)}/product_sets?fields=id,name,filter`,
      };
    case 'delete_product_set':
      return {
        permission: 'productConfig',
        method: 'DELETE',
        path: numericId(input.productSetId),
      };
    default:
      throw new Error('Operação Meta não permitida.');
  }
}
