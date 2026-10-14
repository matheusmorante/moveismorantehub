import { z } from 'zod';
import { ESTORNO_NATURE_OF_OPERATION } from './fiscalOperationContext';
import { normalizeReviewedFiscalBlock } from '../erp/src/pages/utils/nfe/fiscalOperationXml';
import { CSOSN_CODES } from './fiscalIcmsGroups';
export const hmlCsosnFormSchema = z.object({
  csosn: z.string().refine((value) => (CSOSN_CODES as readonly string[]).includes(value), 'CSOSN inválido. Selecione uma opção fiscal válida.'),
});

// Count Unicode code points as the event/XML validators do; do not rewrite inputs or snapshots.
export const fiscalReasonFormSchema = z.string().refine(
  (value) => Array.from(value.trim()).length >= 15 && Array.from(value.trim()).length <= 255,
  'A justificativa deve ter entre 15 e 255 caracteres.',
);

export const fiscalOperationPreparationFormSchema = z.object({
  kind: z.enum(['return', 'estorno']),
  originalDocumentId: z.uuid('Documento fiscal original inválido.'),
  returnOrderId: z.uuid('Devolução comercial vinculada inválida.').nullable(),
  environment: z.union([z.literal(1), z.literal(2)]),
  reason: z.string(),
  operationDidNotOccur: z.boolean(),
  goodsDidNotCirculate: z.boolean(),
}).superRefine((value, context) => {
  if (value.kind === 'return') {
    if (!value.returnOrderId) context.addIssue({ code: 'custom', path: ['returnOrderId'], message: 'Selecione a devolução comercial vinculada.' });
    return;
  }
  if (value.returnOrderId || !value.operationDidNotOccur || !value.goodsDidNotCirculate) {
    context.addIssue({ code: 'custom', path: ['operationDidNotOccur'], message: 'Confirme operação não realizada e ausência de circulação para preparar o estorno fiscal.' });
  }
  const reason = fiscalReasonFormSchema.safeParse(value.reason);
  if (!reason.success) context.addIssue({ code: 'custom', path: ['reason'], message: reason.error.issues[0].message });
});

function fiscalXmlBlock(expected: Parameters<typeof normalizeReviewedFiscalBlock>[1]) {
  return z.string().superRefine((value, context) => {
    try { normalizeReviewedFiscalBlock(value, expected); }
    catch (cause) {
      context.addIssue({ code: 'custom', message: cause instanceof Error ? cause.message : `Bloco fiscal ${expected} inválido.` });
    }
  });
}

export function createFiscalOperationReviewFormSchema(kind: 'return' | 'estorno', expectedLineIds: readonly string[]) {
  return z.object({
    draftId: z.uuid('Rascunho fiscal inválido.'),
    reviewData: z.object({
      nature_of_operation: z.string().refine((value) => value.trim().length > 0, 'Informe a natureza da operação.'),
      reason: z.string(),
      recipient_xml: fiscalXmlBlock('dest'),
      totals_xml: fiscalXmlBlock('total'),
      transport_xml: fiscalXmlBlock('transp'),
      payment_xml: fiscalXmlBlock('pag'),
      item_taxes_confirmed: z.boolean(),
      totals_confirmed: z.boolean(),
      apportionment_review_confirmed: z.boolean(),
      period_adjustment_text: z.string().refine((value) => Array.from(value).length <= 1200, 'O ajuste de apuração deve ter até 1200 caracteres.'),
    }).passthrough(),
    lines: z.array(z.object({
      draft_line_id: z.uuid('Item fiscal inválido.'),
      cfop: z.string().regex(/^\d{4}$/, 'Informe um CFOP de quatro dígitos.'),
      product_xml: fiscalXmlBlock('prod'),
      taxes_xml: fiscalXmlBlock('imposto'),
    }).passthrough()).min(1, 'Revise os itens fiscais.'),
  }).superRefine((value, context) => {
    const ids = new Set(value.lines.map((line) => line.draft_line_id));
    if (ids.size !== value.lines.length || ids.size !== expectedLineIds.length || expectedLineIds.some((id) => !ids.has(id))) {
      context.addIssue({ code: 'custom', path: ['lines'], message: 'A revisão deve cobrir uma vez cada item deste rascunho fiscal.' });
    }
    if (kind !== 'estorno') return;
    const review = value.reviewData;
    if (review.nature_of_operation.trim() !== ESTORNO_NATURE_OF_OPERATION) context.addIssue({ code: 'custom', path: ['reviewData', 'nature_of_operation'], message: 'A natureza do estorno fiscal é fixa.' });
    const reason = fiscalReasonFormSchema.safeParse(review.reason);
    if (!reason.success) context.addIssue({ code: 'custom', path: ['reviewData', 'reason'], message: reason.error.issues[0].message });
    for (const field of ['item_taxes_confirmed', 'totals_confirmed', 'apportionment_review_confirmed'] as const) {
      if (!review[field]) context.addIssue({ code: 'custom', path: ['reviewData', field], message: 'Confirme a revisão dos tributos, totais e apuração do estorno fiscal.' });
    }
  });
}

export function createFiscalOperationTransmissionFormSchema(context: { environment: number; status: string; retryAllowed: boolean }) {
  return z.object({ draftId: z.uuid('Rascunho fiscal inválido.'), productionConfirmed: z.boolean() }).superRefine((value, refinement) => {
    if (!['ready', 'transmitting', 'unknown', 'authorized'].includes(context.status)) {
      refinement.addIssue({ code: 'custom', path: ['draftId'], message: 'Conclua e salve a revisão fiscal antes de transmitir.' });
    }
    const isTransmission = context.status === 'ready' || context.retryAllowed;
    if (isTransmission && context.environment === 1 && !value.productionConfirmed) {
      refinement.addIssue({ code: 'custom', path: ['productionConfirmed'], message: 'Confirme explicitamente a transmissão deste documento em Produção.' });
    }
  });
}

export function createFiscalCancellationFormSchema(context: { isCancelEvent: boolean; environment: number }) {
  return z.object({ reason: z.string(), productionConfirmed: z.boolean() }).superRefine((value, refinement) => {
    if (!context.isCancelEvent) return;
    const reason = fiscalReasonFormSchema.safeParse(value.reason);
    if (!reason.success) refinement.addIssue({ code: 'custom', path: ['reason'], message: reason.error.issues[0].message });
    if (context.environment === 1 && !value.productionConfirmed) {
      refinement.addIssue({ code: 'custom', path: ['productionConfirmed'], message: 'Confirme que deseja cancelar a nota no ambiente de Produção.' });
    }
  });
}
