import {
  getGoodsCirculationState,
  hasGoodsCirculated,
  type OrderCirculationState,
} from './cancellationEligibility.js';
import { getFiscalCancellationPolicy } from './fiscalCancellationPolicy.js';
import { getAuthorizedAt } from './nfeEventRules.js';

import {
  ORDER_EDIT_CCE_DISABLED_REASON,
  FISCAL_CORRECTION_POLICY_NOTICE,
  FISCAL_CORRECTION_RULES,
} from '../../../../../shared-utils/fiscalCorrectionPolicy';
export {
  ORDER_EDIT_CCE_DISABLED_REASON,
  FISCAL_CORRECTION_POLICY_NOTICE,
  FISCAL_CORRECTION_RULES,
} from '../../../../../shared-utils/fiscalCorrectionPolicy';

/** Replacement affects the complete original invoice; the commercial sale stays scheduled. */
export function getOrderEditFiscalPolicy(
  order: OrderCirculationState,
  document: {
    modelo: string;
    ambiente: number;
    status: string;
    chave_acesso: string;
    xml_protocolo?: string | null;
  },
  now?: number
) {
  if (hasGoodsCirculated(order)) {
    return {
      action: 'blocked' as const,
      reason: 'A mercadoria já circulou. Preserve a nota original e use a devolução vinculada quando houver retorno físico.',
      deadline: null,
    };
  }
  if (getGoodsCirculationState(order) === 'in_progress') {
    return {
      action: 'blocked' as const,
      reason: 'A entrega ou retirada ainda não foi confirmada. Revise o andamento da operação antes de substituir a nota.',
      deadline: null,
    };
  }
  if (String(order.status || '').toLowerCase() !== 'scheduled') {
    return {
      action: 'blocked' as const,
      reason: 'A substituição por edição exige uma venda ainda agendada, sem circulação.',
      deadline: null,
    };
  }
  return getFiscalCancellationPolicy({
    model: document.modelo,
    environment: document.ambiente as 1 | 2,
    status: document.status,
    authorizedAt: getAuthorizedAt(document.xml_protocolo || '', ''),
    issuerUf: document.chave_acesso.slice(0, 2) === '41' ? 'PR' : '',
    goodsCirculated: false,
    operationDidNotOccur: true,
    now,
  });
}
