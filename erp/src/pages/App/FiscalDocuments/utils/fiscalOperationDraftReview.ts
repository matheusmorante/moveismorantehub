import {
  buildProportionalReturnTaxesXml,
  buildReturnProductXml,
  updateFiscalOperationTotalsXml,
} from '../../../utils/nfe/fiscalOperationReview';
import type {
  DraftLine,
  DraftPayload,
  ReviewData,
  ReviewedLine,
} from '../types/fiscalOperationDraft.types';
import { validateReturnTaxScenario } from '../../../../../../shared-utils/fiscalOperationContext';

export interface FiscalOperationDraftReviewState {
  reviewedLines: ReviewedLine[];
  review: ReviewData;
  error: string | null;
  notice: string;
}

export function buildFiscalOperationDraftProductXml(line: DraftLine, cfop: string): string {
  return buildReturnProductXml({
    originalProductXml: line.originalProductXml,
    quantity: Number(line.quantity),
    originalQuantity: Number(line.originalQuantity),
    grossValue: Number(line.gross_value),
    discountValue: Number(line.discount_value),
    cfop,
  });
}

export function buildFiscalOperationDraftReviewState(
  data: DraftPayload
): FiscalOperationDraftReviewState {
  let error: string | null = null;
  const reviewedLines = data.lines.map((line) => {
    const cfop =
      line.reviewed_cfop ||
      line.suggestedCfop ||
      '';
    let productXml = line.reviewed_product_xml || line.originalProductXml;

    if (cfop && !line.reviewed_product_xml) {
      try {
        productXml = buildFiscalOperationDraftProductXml(line, cfop);
      } catch (cause) {
        error = cause instanceof Error ? cause.message : 'Não foi possível preparar o item fiscal.';
      }
    }

    let taxesXml = line.reviewed_taxes_xml || line.originalTaxesXml;
    try {
      if (!line.reviewed_taxes_xml) {
        taxesXml = buildProportionalReturnTaxesXml(
          line.originalTaxesXml,
          Number(line.quantity),
          Number(line.originalQuantity)
        );
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Tributos do item requerem revisão manual.';
    }

    return { draft_line_id: line.id, cfop, product_xml: productXml, taxes_xml: taxesXml };
  });

  let totalsXml = data.reviewTemplate.totals_xml;
  try {
    totalsXml = updateFiscalOperationTotalsXml({
      originalTotalsXml: totalsXml,
      grossTotal: data.lines.reduce((sum, line) => sum + Number(line.gross_value), 0),
      discountTotal: data.lines.reduce((sum, line) => sum + Number(line.discount_value), 0),
    });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Totais fiscais precisam de revisão manual.';
  }

  const savedReview = data.draft.review_data || {};
  const review: ReviewData = {
    nature_of_operation:
      data.draft.nature_of_operation ||
      savedReview.nature_of_operation ||
      (data.draft.operation_kind === 'estorno'
        ? 'Nota Fiscal de Estorno'
        : 'Devolução de mercadoria'),
    reason: savedReview.reason || data.draft.reason || '',
    recipient_xml: savedReview.recipient_xml || data.reviewTemplate.recipient_xml,
    totals_xml: savedReview.totals_xml || totalsXml,
    transport_xml: savedReview.transport_xml || data.reviewTemplate.transport_xml,
    payment_xml: savedReview.payment_xml || data.reviewTemplate.payment_xml,
    item_taxes_confirmed: savedReview.item_taxes_confirmed === true,
    totals_confirmed: savedReview.totals_confirmed === true,
    apportionment_review_confirmed: savedReview.apportionment_review_confirmed === true,
    period_adjustment_text: savedReview.period_adjustment_text || '',
  };

  let notice: string;
  if (data.draft.status === 'rejected') {
    const sefazMessage =
      data.lastSefazResult?.xMotivo || 'Revise os dados e consulte a rejeição fiscal.';
    error =
      'SEFAZ rejeitou esta tentativa' +
      (data.lastSefazResult?.cStat ? ' (cStat ' + data.lastSefazResult.cStat + ')' : '') +
      ': ' +
      sefazMessage;
    notice =
      'Esta tentativa rejeitada é somente leitura; é necessário criar uma nova tentativa fiscal após corrigir os dados.';
  } else if (['transmitting', 'unknown'].includes(data.draft.status)) {
    notice =
      'Há uma transmissão sem confirmação final. Consulte a SEFAZ para reconciliar; o sistema não retransmitirá automaticamente.';
  } else {
    notice =
      data.draft.status === 'authorized'
        ? 'Esta operação já foi autorizada pela SEFAZ.'
        : 'Rascunho carregado. Revise CFOP, tributos e totais antes de salvar.';
  }

  return { reviewedLines, review, error, notice };
}

/** Automatic returns confirm only the supported matrix; manual review keeps its explicit checkboxes. */
export function buildAutomaticReturnDraftReviewState(data: DraftPayload): FiscalOperationDraftReviewState {
  const state = buildFiscalOperationDraftReviewState(data);
  if (state.error) return state;
  if (data.draft.operation_kind !== 'return' || data.source.modelo !== '55' || !state.reviewedLines.length) {
    return { ...state, error: 'A operação exige revisão fiscal manual.' };
  }
  for (const [index, line] of state.reviewedLines.entries()) {
    const original = data.lines[index];
    if (!original.allowedCfops?.some(option => option.value === line.cfop)) {
      return { ...state, error: 'O CFOP exige revisão fiscal manual.' };
    }
    const taxError = validateReturnTaxScenario(data.reviewTemplate.totals_xml, original.originalTaxesXml) ||
      validateReturnTaxScenario(state.review.totals_xml, line.taxes_xml);
    if (taxError) return { ...state, error: taxError };
  }
  return { ...state, review: { ...state.review, item_taxes_confirmed: true, totals_confirmed: true } };
}
