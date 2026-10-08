import type Order from '@/pages/types/order.type';
import { resolveFiscalCfopOrderScope } from '../../../../../shared-utils/fiscalCfopModel';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
  getFiscalRecipientAddress,
  resolveOrderFiscalModel,
} from '../../../../../shared-utils/fiscalDocumentModel';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../../../../shared-utils/recipientTaxId';
import type { AppSettings } from '../settingsService';

export interface NfeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida se um pedido possui todos os dados necessários para emissão em ambiente de homologação/produção
 */
export function validateOrderForNfe(order: Order, settings: AppSettings): NfeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validação do Emitente
  const cleanCnpj = (settings.companyCnpj || '').replace(/\D/g, '');
  if (!cleanCnpj || cleanCnpj.length !== 14) {
    errors.push('CNPJ da empresa emitente não configurado ou inválido nas Configurações Fiscais.');
  }

  if (!settings.companyName || settings.companyName.trim() === '') {
    errors.push('Razão Social da empresa emitente não configurada.');
  }

  const missingEmitterFields = [
    ['Logradouro', (settings as any).companyLogradouro || settings.companyAddress],
    ['número', (settings as any).companyNumero],
    ['bairro', (settings as any).companyBairro],
    ['código IBGE do município', (settings as any).companyCMun],
    ['município', (settings as any).companyXMun],
    ['UF', (settings as any).companyUF],
    ['CEP', (settings as any).companyCEP],
  ]
    .filter(([, value]) => !String(value || '').trim())
    .map(([label]) => label);
  if (missingEmitterFields.length)
    errors.push(
      `Endereço do emitente incompleto: informe ${missingEmitterFields.join(', ')} nas Configurações Fiscais.`
    );

  // 2. Validação dos Itens do Pedido
  const fiscalProducts = (order.items || []).filter((item) => item.itemType !== 'service');
  if (fiscalProducts.length === 0) {
    errors.push('O pedido não possui nenhum item para emissão de nota fiscal.');
  } else {
    fiscalProducts.forEach((item, index) => {
      const itemNum = index + 1;
      const desc = item.description || `Item #${itemNum}`;

      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${itemNum} (${desc}): Quantidade deve ser maior que zero.`);
      }

      if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
        errors.push(`Item ${itemNum} (${desc}): Valor unitário inválido.`);
      }

      // NCM (8 dígitos)
      const ncm = (item as any).fiscal?.ncm || '';
      const cleanNcm = String(ncm).replace(/\D/g, '');
      if (!cleanNcm || cleanNcm.length !== 8) {
        errors.push(
          `Item ${itemNum} (${desc}): informe um NCM válido de 8 dígitos antes da emissão.`
        );
      }
    });
  }

  // Recipient requirements follow the fiscal model and presence, not pickup/delivery alone.
  const acquisitionPurpose = order.fiscalContext?.acquisitionPurpose;
  const hasPersistedPurpose =
    acquisitionPurpose === 'resale' ||
    acquisitionPurpose === 'use_consumption' ||
    acquisitionPurpose === 'fixed_asset';
  const operationScope = resolveFiscalCfopOrderScope({
    issuerUf: settings.companyUF,
    deliveryMethod: order.shipping?.deliveryMethod,
    shipping: order.shipping,
    customerAddress: getFiscalRecipientAddress(order),
  });
  const isInterstate = operationScope.scope === 'interstate';
  const finalConsumer = hasPersistedPurpose
    ? acquisitionPurpose !== 'resale'
    : isInterstate
      ? undefined
      : order.fiscalContext?.finalConsumer;

  if (isInterstate && !hasPersistedPurpose) {
    errors.push('Registre no pedido se a compra é para revenda, uso/consumo ou ativo imobilizado.');
  }
  if (
    hasPersistedPurpose &&
    typeof order.fiscalContext?.finalConsumer === 'boolean' &&
    order.fiscalContext.finalConsumer !== finalConsumer
  ) {
    errors.push('O indFinal persistido não corresponde à finalidade da compra no pedido.');
  }

  const decisionOrder = {
    ...order,
    fiscalContext: { ...order.fiscalContext, finalConsumer },
  };
  const decision = resolveOrderFiscalModel(decisionOrder, {
    issuerUf: settings.companyUF,
    finalConsumer,
  });
  if (decision.status === 'blocked') errors.push(decision.reason);
  else {
    const presence = fiscalPresence(
      decision.model,
      order.shipping?.deliveryMethod,
      order.fiscalContext?.presence
    );
    const document = normalizeRecipientTaxId(
      order.customerData?.cpfCnpj || order.customerData?.document || ''
    );
    const normalSale = decision.reasons.every((reason) =>
      ['RETAIL_FINAL_CONSUMER_IN_STATE', 'RESALE', 'VALUE_LIMIT'].includes(reason)
    );
    const requirements = decideFiscalRecipientRequirements({
      model: decision.model,
      presence,
      total: order.paymentsSummary?.totalOrderValue || 0,
      personType: order.customerData?.personType,
      recipientTaxId: document,
      operationScope: normalSale ? 'NORMAL_DOMESTIC_SALE' : 'SPECIAL_OR_FOREIGN_OPERATION',
    });
    if (!requirements.supported)
      errors.push(requirements.message || 'Operação exige matriz fiscal própria.');
    else if (requirements.documentRequired && !document)
      errors.push(
        requirements.message || 'Documento do destinatário obrigatório para esta operação.'
      );
    if (
      document &&
      (!isValidRecipientTaxId(document) ||
        !recipientTaxIdMatchesPersonType(document, order.customerData?.personType))
    )
      errors.push('CPF/CNPJ do destinatário inválido.');
    if (requirements.addressRequired) {
      const address = getFiscalRecipientAddress(order);
      const missing = [
        ['logradouro', address.street],
        ['número', address.number],
        ['bairro', address.neighborhood || address.bairro],
        ['código IBGE do município', address.cityCode || address.cMun],
        ['município', address.city],
        ['UF', address.state || address.uf],
      ]
        .filter(([, value]) => !String(value || '').trim())
        .map(([field]) => field);
      if (missing.length)
        errors.push('Endereço do destinatário incompleto: informe ' + missing.join(', ') + '.');
      const cep = String(address.zipCode || address.postalCode || address.cep || '').replace(
        /\D/g,
        ''
      );
      if (cep && !/^\d{8}$/.test(cep)) errors.push('CEP do destinatário inválido.');
    }
  }

  // 4. Totais
  const totalOrder = order.paymentsSummary?.totalOrderValue || 0;
  if (totalOrder <= 0) {
    errors.push('O valor total do pedido deve ser maior que zero.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
