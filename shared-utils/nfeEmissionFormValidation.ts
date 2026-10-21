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
import { getRecipientIeIndicatorConsistencyError, resolveEffectiveRecipientIeIndicator } from './recipientIeIndicator';

export interface ValidationParams {
  issuerUf?: string;
  order: Order;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
  recipientTaxId: string;
  recipientIe?: string;
  recipientIeIndicator?: '1' | '2' | '9';
  finalConsumer?: boolean;
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
  recipientIe: z.string().optional(),
  recipientIeIndicator: z.enum(['1', '2', '9']).optional(),
  finalConsumer: z.boolean().optional(),
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

export const nfeAcquisitionPurposeFormSchema = z.object({
  orderId: z.string().min(1, 'Salve o pedido antes de registrar a finalidade da compra.'),
  purpose: z.enum(['resale', 'use_consumption', 'fixed_asset']),
});

export const nfeEmissionConsultFormSchema = z.object({
  orderId: z.string().trim().min(1, 'O pedido não está disponível para consulta fiscal.'),
  environment: z.union([z.literal(1), z.literal(2)]),
  documentId: z.string().trim().min(1, 'A identidade do documento fiscal está vazia.').optional(),
  emissionRequestId: z.string().trim().min(1, 'A identidade da tentativa fiscal está vazia.').optional(),
  resultOrderId: z.string().trim().min(1).optional(),
  resultEnvironment: z.union([z.literal(1), z.literal(2)]).optional(),
}).superRefine((value, ctx) => {
  if (!value.documentId && !value.emissionRequestId) {
    ctx.addIssue({ code: 'custom', path: ['documentId'], message: 'A consulta exige a identidade da mesma tentativa fiscal.' });
  }
  if (value.resultOrderId !== undefined && value.resultOrderId !== value.orderId) {
    ctx.addIssue({ code: 'custom', path: ['resultOrderId'], message: 'A tentativa fiscal pertence a outro pedido. Reabra a emissão do pedido correto.' });
  }
  if (value.resultEnvironment !== undefined && value.resultEnvironment !== value.environment) {
    ctx.addIssue({ code: 'custom', path: ['resultEnvironment'], message: 'A tentativa fiscal pertence a outro ambiente. Consulte no ambiente original.' });
  }
});

export const nfeEmissionDraftFormSchema = z.object({
  order: nfeEmissionFormSchema.shape.order.refine((value) => Boolean(value.id), 'Salve o pedido antes de registrar o rascunho fiscal.'),
  recipientTaxId: z.string(), nfeItems: nfeEmissionFormSchema.shape.nfeItems,
  environment: z.union([z.literal(1), z.literal(2)]),
}).superRefine((value, ctx) => {
  if (value.environment !== 1 || !value.recipientTaxId.trim()) return;
  const message = getRecipientTaxIdValidationMessage(value.recipientTaxId, value.order.customerData?.personType);
  if (message) ctx.addIssue({ code: 'custom', path: ['recipientTaxId'], message });
});

export const nfeHmlRestartFormSchema = z.object({
  identity: nfeEmissionConsultFormSchema,
  emission: nfeEmissionFormSchema,
  kind: z.enum(['tls_untransmitted', 'confirmed_not_found']),
  previousSuccess: z.boolean().refine((value) => !value, 'Uma nota autorizada não pode iniciar outra tentativa por este fluxo.'),
  previousPending: z.boolean().refine((value) => !value, 'Consulte a tentativa pendente antes de iniciar outra emissão.'),
  canAbandonTls: z.boolean(),
  needsNewEmission: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.identity.environment !== 2 || value.identity.orderId !== String(value.emission.order.id)) {
    ctx.addIssue({ code: 'custom', path: ['identity'], message: 'A retomada exige a mesma tentativa e pedido em homologação.' });
  }
  if (value.kind === 'tls_untransmitted' ? !value.canAbandonTls || !value.identity.documentId || !value.identity.emissionRequestId : !value.needsNewEmission) {
    ctx.addIssue({ code: 'custom', path: ['kind'], message: 'A tentativa ainda não permite nova emissão. Consulte a situação fiscal antes de continuar.' });
  }
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
  const hasSelectedCustomer = Boolean(order.customerData?.id?.trim());
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

  if (currentModel === '55') {
    const recipientIe = params.recipientIe ?? order.customerData?.ie;
    const indicator = resolveEffectiveRecipientIeIndicator({
      selected: params.recipientIeIndicator,
      persisted: order.fiscalContext?.recipientIeIndicator,
      customer: order.customerData?.ieIndicator,
      ie: recipientIe,
    });
    const message = getRecipientIeIndicatorConsistencyError(
      indicator, recipientIe, params.finalConsumer ?? order.fiscalContext?.finalConsumer
    );
    if (message) return {
      valid: false,
      fiscalFieldError: { tab: 'customer', fieldId: 'nfe-recipient-ie-indicator', message },
      toastError: message,
    };
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
