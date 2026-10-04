import Order from '@/pages/types/order.type';
import { AppSettings } from '../settingsService';
import { resolveOrderFiscalModel, getFiscalRecipientAddress, fiscalPresence, fiscalRecipientRequirements } from '../../../../../shared-utils/fiscalDocumentModel';

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
  const decision = resolveOrderFiscalModel(order, { issuerUf: settings.companyUF, finalConsumer: order.fiscalContext?.finalConsumer ?? true });
  if (decision.status === 'blocked') errors.push(decision.reason);
  else {
    const presence = fiscalPresence(decision.model, order.shipping?.deliveryMethod, order.fiscalContext?.presence);
    const requirements = fiscalRecipientRequirements(decision.model, presence, order.paymentsSummary?.totalOrderValue || 0);
    const document = (order.customerData?.cpfCnpj || order.customerData?.document || '').replace(/\D/g, '');
    if (requirements.documentRequired && ![11,14].includes(document.length)) errors.push('CPF/CNPJ do destinatário obrigatório para esta operação.');
    if (document && ![11,14].includes(document.length)) errors.push('CPF/CNPJ do destinatário inválido.');
    if (requirements.addressRequired) {
      const address = getFiscalRecipientAddress(order);
      const missing = [['logradouro',address.street],['número',address.number],['bairro',address.neighborhood || address.bairro],
        ['código IBGE do município',address.cityCode || address.cMun],['município',address.city],['UF',address.state || address.uf]]
        .filter(([,value]) => !String(value || '').trim()).map(([field]) => field);
      if (missing.length) errors.push('Endereço do destinatário incompleto: informe ' + missing.join(', ') + '.');
      const cep = String(address.zipCode || address.postalCode || address.cep || '').replace(/\D/g,'');
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
