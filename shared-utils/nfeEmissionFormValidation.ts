import type Order from '../erp/src/pages/types/order.type';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
} from './fiscalDocumentModel';
import {
  DEFAULT_NFCE_NUMBER,
  DEFAULT_NFE_NUMBER,
  isFiscalNumber,
} from './fiscalNumbering.js';
import type { DeliveryMethod } from './fiscalTransportModel';
import {
  getRecipientTaxIdValidationMessage,
} from './recipientTaxId';
import {
  resolveFiscalCfopOrderScope,
  validateItemCfopMatch,
} from './fiscalCfopModel';
import { z } from 'zod';
import type { NfeItemWithFiscal } from '../erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemsSection';
import type { FiscalFieldError } from '../erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/types/nfeEmission.types';

export interface ValidationParams {
  issuerUf?: string;
  order: Order;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
  recipientTaxId: string;
  nfeItems: NfeItemWithFiscal[];
  isLoadingFiscalData: boolean;
  fiscalPreparationError: string | null;
  manualNumber?: number;
}

export interface ValidationResult {
  valid: boolean;
  recipientTaxIdError?: string | null;
  fiscalFieldError?: FiscalFieldError | null;
  toastError?: string;
}

export const nfeEmissionFormSchema = z.object({
  issuerUf: z.string().optional(),
  order: z.custom<Order>((value) => Boolean(value && typeof value === 'object' && Array.isArray((value as Order).items)), 'O pedido não está disponível.'),
  currentModel: z.enum(['55', '65']),
  deliveryMethod: z.enum(['delivery', 'pickup']),
  recipientTaxId: z.string(),
  nfeItems: z.array(z.custom<NfeItemWithFiscal>((value) => Boolean(value && typeof value === 'object'), 'Item fiscal inválido.')),
  isLoadingFiscalData: z.boolean(),
  fiscalPreparationError: z.string().nullable(),
  manualNumber: z.number().optional(),
}).superRefine((value, ctx) => {
  const result = validateNfeEmission(value);
  if (!result.valid) ctx.addIssue({
    code: 'custom', path: [result.fiscalFieldError?.fieldId || 'emission'],
    message: result.toastError || 'Confira os dados fiscais antes de emitir.',
  });
});

export function validateNfeEmission(params: ValidationParams): ValidationResult {
  const {
    order,
    currentModel,
    deliveryMethod,
    recipientTaxId,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
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

  const registeredPersonType = order.customerData?.personType;
  const hasSelectedCustomer = Boolean(order.customerData?.id || order.customerData?.fullName);
  if (
    hasSelectedCustomer &&
    registeredPersonType !== 'PF' &&
    registeredPersonType !== 'PJ'
  ) {
    return {
      valid: false,
      toastError:
        'O tipo de pessoa do cliente não foi encontrado no cadastro. Atualize o cadastro do cliente antes de emitir a nota.',
    };
  }

  const recipientReqs = decideFiscalRecipientRequirements({
    model: currentModel,
    presence: currentPresence,
    total: effectiveInvoiceTotal,
    personType: registeredPersonType,
    recipientTaxId: registeredPersonType ? recipientTaxId : '',
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });

  if (!recipientReqs.supported) {
    return {
      valid: false,
      toastError: recipientReqs.message || 'A matriz fiscal não atende a esta operação.',
    };
  }

  const recipientRequired = recipientReqs.documentRequired;
  const recipientTaxIdValidationMessage = getRecipientTaxIdValidationMessage(
    recipientTaxId,
    order.customerData?.personType
  );
  const validForPerson = !recipientTaxIdValidationMessage;

  const docTypeName =
    registeredPersonType === 'PF'
      ? 'CPF'
      : registeredPersonType === 'PJ'
        ? 'CNPJ'
        : 'CPF ou CNPJ';

  if (recipientRequired) {
    const missingMessage =
      recipientReqs.message ||
      (currentModel === '55'
        ? `A emissão de NF-e (modelo 55) exige a identificação do destinatário com ${docTypeName} válido.`
        : deliveryMethod === 'delivery'
          ? `O ${docTypeName} do destinatário é obrigatório na emissão com entrega em domicílio.`
          : effectiveInvoiceTotal >= 10000
            ? `NFC-e com valor a partir de R$ 10.000,00 exige a identificação do destinatário com ${docTypeName}.`
            : `Informe o ${docTypeName} do destinatário para autorizar a nota fiscal.`);

    if (!recipientTaxId.trim() || !validForPerson) {
      const message = recipientTaxId.trim()
        ? recipientTaxIdValidationMessage || `Número de ${docTypeName} incompleto ou com dígitos verificadores incorretos.`
        : missingMessage;
      const fieldErr: FiscalFieldError = {
        tab: 'customer',
        fieldId: 'nfe-recipient-tax-id',
        message,
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
      const specificInvalidMessage =
        recipientTaxIdValidationMessage ||
        `Número de ${docTypeName} incompleto ou com dígitos verificadores incorretos.`;
      const fieldErr: FiscalFieldError = {
        tab: 'customer',
        fieldId: 'nfe-recipient-tax-id',
        message: specificInvalidMessage,
      };
      return {
        valid: false,
        recipientTaxIdError: specificInvalidMessage,
        fiscalFieldError: fieldErr,
        toastError: specificInvalidMessage,
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
      issuerUf: params.issuerUf,
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
