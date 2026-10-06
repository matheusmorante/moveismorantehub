import type Order from '@/pages/types/order.type';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
} from '../../../../../../../../shared-utils/fiscalDocumentModel';
import {
  DEFAULT_NFCE_NUMBER,
  DEFAULT_NFE_NUMBER,
  isFiscalNumber,
} from '../../../../../../../../shared-utils/fiscalNumbering.js';
import type { DeliveryMethod } from '../../../../../../../../shared-utils/fiscalTransportModel';
import {
  isValidRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../../../../../../../shared-utils/recipientTaxId';
import {
  resolveFiscalCfopOrderScope,
  validateItemCfopMatch,
} from '../../../../../../../../shared-utils/fiscalCfopModel';
import { getSettings } from '@/pages/utils/settingsService';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import type { FiscalFieldError } from '../types/nfeEmission.types';

export interface ValidationParams {
  order: Order;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
  recipientTaxId: string;
  nfeItems: NfeItemWithFiscal[];
  isLoadingFiscalData: boolean;
  fiscalPreparationError: string | null;
  isLoadingNfeNumber: boolean;
  manualNumber?: number;
}

export interface ValidationResult {
  valid: boolean;
  recipientTaxIdError?: string | null;
  fiscalFieldError?: FiscalFieldError | null;
  toastError?: string;
}

export function validateNfeEmission(params: ValidationParams): ValidationResult {
  const {
    order,
    currentModel,
    deliveryMethod,
    recipientTaxId,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    isLoadingNfeNumber,
    manualNumber,
  } = params;

  const currentPresence = fiscalPresence(
    currentModel,
    deliveryMethod,
    order.fiscalContext?.presence
  );

  const effectiveItemsTotal = (nfeItems.length ? nfeItems : order.items || [])
    .filter((it) => it.itemType !== 'service')
    .reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  const effectiveFreightTotal = Number(order.shipping?.value) || 0;
  const effectiveDiscountTotal = Number(order.itemsSummary?.totalFixedDiscount) || 0;
  const effectiveInvoiceTotal =
    Number(order.paymentsSummary?.totalOrderValue) ||
    effectiveItemsTotal + effectiveFreightTotal - effectiveDiscountTotal;

  const recipientReqs = decideFiscalRecipientRequirements({
    model: currentModel,
    presence: currentPresence,
    total: effectiveInvoiceTotal,
    personType: order.customerData?.personType,
    recipientTaxId,
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });

  if (!recipientReqs.supported) {
    return {
      valid: false,
      toastError: recipientReqs.message || 'A matriz fiscal não atende a esta operação.',
    };
  }

  const recipientRequired = recipientReqs.documentRequired;
  const validForPerson =
    isValidRecipientTaxId(recipientTaxId) &&
    recipientTaxIdMatchesPersonType(recipientTaxId, order.customerData?.personType);

  if (recipientRequired) {
    const missingMessage = recipientReqs.message || 'Documento do destinatário obrigatório.';
    if (!validForPerson) {
      const message = recipientTaxId.trim()
        ? 'Documento inválido ou incompatível com o tipo PF/PJ do cadastro.'
        : missingMessage;
      const fieldErr: FiscalFieldError = {
        tab: 'customer',
        fieldId: 'nfe-recipient-tax-id',
        message: recipientTaxId.trim()
          ? 'Confira o documento do destinatário e o tipo PF/PJ.'
          : missingMessage,
      };
      return {
        valid: false,
        recipientTaxIdError: message,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }
  } else {
    if (recipientTaxId.trim() && !validForPerson) {
      const fieldErr: FiscalFieldError = {
        tab: 'customer',
        fieldId: 'nfe-recipient-tax-id',
        message: 'Confira o documento informado e o tipo PF/PJ do cadastro.',
      };
      return {
        valid: false,
        recipientTaxIdError: 'Documento inválido ou incompatível com o tipo PF/PJ do cadastro.',
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }
  }

  if (isLoadingFiscalData || !nfeItems.length) {
    return {
      valid: false,
      recipientTaxIdError: null,
      toastError: 'Aguarde a preparação fiscal dos itens antes de emitir.',
    };
  }

  if (fiscalPreparationError) {
    return {
      valid: false,
      recipientTaxIdError: null,
      toastError: 'A emissão está bloqueada até que a preparação fiscal seja concluída.',
    };
  }

  if (isLoadingNfeNumber) {
    return {
      valid: false,
      recipientTaxIdError: null,
      toastError: 'Aguarde a consulta do próximo número fiscal.',
    };
  }

  // Validação granular e atômica dos dados tributários de cada item
  for (let index = 0; index < nfeItems.length; index++) {
    const item = nfeItems[index];
    const itemLabel = item.description ? `"${item.description}"` : `Item #${index + 1}`;
    const ncmClean = (item.fiscal?.ncm || '').replace(/\D/g, '');

    if (!ncmClean) {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-ncm-${index}`,
        itemIndex: index,
        itemField: 'ncm',
        message: `Informe o NCM do produto ${itemLabel}.`,
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }

    if (ncmClean.length !== 8) {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-ncm-${index}`,
        itemIndex: index,
        itemField: 'ncm',
        message: `NCM do produto ${itemLabel} deve conter exatamente 8 dígitos.`,
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }

    const shipping = (order.shipping as Record<string, unknown> | undefined) || {};
    const customerData = (order.customerData as Record<string, unknown> | undefined) || {};
    const operationScope = resolveFiscalCfopOrderScope({
      issuerUf: getSettings().companyUF,
      deliveryMethod,
      shipping,
      customerAddress: customerData.fullAddress || customerData.address,
    });
    if (!operationScope.destination || operationScope.destination === '3') {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-cfop-${index}`,
        itemIndex: index,
        itemField: 'cfop',
        message: operationScope.reason || 'Local físico da operação fiscal não identificado.',
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }
    if (operationScope.scope === 'interstate') {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-cfop-${index}`,
        itemIndex: index,
        itemField: 'cfop',
        message:
          `Operação interestadual ${operationScope.issuerUf} → ${operationScope.operationUf}: ` +
          'não existe matriz tributária aprovada; a emissão permanece bloqueada.',
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }

    const cfopTrimmed = item.fiscal?.cfop?.trim() || '';
    if (!cfopTrimmed) {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-cfop-${index}`,
        itemIndex: index,
        itemField: 'cfop',
        message: `Selecione o CFOP do produto ${itemLabel}.`,
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }

    const cfopMatch = validateItemCfopMatch({
      cfop: cfopTrimmed,
      destination: operationScope.destination,
      model: currentModel,
      direction: 'outbound',
      itemType: item.itemType === 'service' ? 'service' : 'product',
      operationType: 'sale',
    });
    if (!cfopMatch.valid) {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-cfop-${index}`,
        itemIndex: index,
        itemField: 'cfop',
        message: `${cfopMatch.reason} (Produto ${itemLabel})`,
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }

    if (!item.fiscal?.cst?.trim()) {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-csosn-${index}`,
        itemIndex: index,
        itemField: 'cst',
        message: `Selecione o CSOSN do produto ${itemLabel}.`,
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }

    if (!item.fiscal?.origem?.trim()) {
      const fieldErr: FiscalFieldError = {
        tab: 'items',
        fieldId: `nfe-item-origem-${index}`,
        itemIndex: index,
        itemField: 'origem',
        message: `Selecione a Origem fiscal do produto ${itemLabel}.`,
      };
      return {
        valid: false,
        recipientTaxIdError: null,
        fiscalFieldError: fieldErr,
        toastError: fieldErr.message,
      };
    }
  }

  if (manualNumber !== undefined) {
    if (!isFiscalNumber(manualNumber)) {
      return {
        valid: false,
        recipientTaxIdError: null,
        toastError: 'Informe um número inteiro entre 1 e 999999999.',
      };
    }
    const modelMinimum = currentModel === '65' ? DEFAULT_NFCE_NUMBER : DEFAULT_NFE_NUMBER;
    if (manualNumber < modelMinimum) {
      return {
        valid: false,
        recipientTaxIdError: null,
        toastError: `O número desta nota deve ser igual ou superior a ${modelMinimum}.`,
      };
    }
  }

  return {
    valid: true,
    recipientTaxIdError: null,
    fiscalFieldError: null,
  };
}
