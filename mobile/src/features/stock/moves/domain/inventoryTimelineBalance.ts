import { formatInventoryAuditObservation } from '../../../../../../shared-utils/inventoryMoveObservation';

export interface InventoryMoveLike {
  id?: string;
  type?: string;
  quantity?: number;
  date?: string;
  createdAt?: string;
  created_at?: string;
  status?: string;
  label?: string;
  observation?: string;
  relatedEntityType?: string;
  related_entity_type?: string;
  relatedEntityId?: string;
  related_entity_id?: string;
  sourceReceiptId?: string;
  source_receipt_id?: string;
  reversalReason?: string;
  reversal_reason?: string;
}

export const getTargetStockFromObservation = (observation?: string): number | null => {
  if (!observation || !observation.trim().startsWith('{')) return null;
  try {
    const target = JSON.parse(observation).targetStock;
    return Number.isFinite(Number(target)) ? Number(target) : null;
  } catch {
    return null;
  }
};

export const isReversedMoveStatus = (status?: string | null): boolean => {
  const normalizedStatus = String(status || '').toLowerCase();
  return normalizedStatus === 'reversed' || normalizedStatus === 'cancelled';
};

export const isEffectiveMove = (move: InventoryMoveLike): boolean => {
  if (isReversedMoveStatus(move.status)) return false;
  if (move.observation && move.observation.trim().startsWith('{')) {
    try {
      const meta = JSON.parse(move.observation);
      if (isReversedMoveStatus(meta.status)) return false;
    } catch {
      // Ignora erro de parse
    }
  }
  return true;
};

/**
 * Movimentações de inventário que são apenas marcadores com quantidade zero
 * não devem ser exibidas como lançamentos operacionais na linha do tempo.
 */
export const isInventoryAuditMarker = (move: InventoryMoveLike): boolean => {
  const lbl = String(move.label || '').toLowerCase();
  return lbl.startsWith('inventário #') && Number(move.quantity || 0) === 0;
};

export const isPurchaseEntry = (move: InventoryMoveLike): boolean => {
  const relType = move.relatedEntityType || move.related_entity_type;
  if (relType === 'purchase_order') return true;
  const lbl = String(move.label || '');
  return /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(lbl);
};

export const isOrderLinked = (move: InventoryMoveLike): boolean => {
  const relType = move.relatedEntityType || move.related_entity_type;
  return relType === 'sales_order' || isPurchaseEntry(move);
};

/**
 * Formata e limpa a observação para exibição idêntica ao ERP Web.
 */
export const getCleanObservation = (move: InventoryMoveLike): string => {
  let obsText = move.observation || '';
  let metadata: Record<string, unknown> | undefined;
  if (obsText.startsWith('{') || obsText.startsWith('[')) {
    try {
      const parsed = JSON.parse(obsText) as Record<string, unknown>;
      metadata = parsed;
      const note = parsed.note || parsed.observation || parsed.reason;
      if (typeof note === 'string') obsText = note.trim();
    } catch {
      // Formato não JSON
    }
  }

  if (metadata) {
    const auditObservation = formatInventoryAuditObservation(metadata);
    if (auditObservation) return auditObservation;
    if (obsText === move.observation) obsText = '';
  }

  const relType = move.relatedEntityType || move.related_entity_type;
  const rawLabel = String(move.label || '');

  if (
    relType === 'goods_receipt' ||
    move.sourceReceiptId ||
    move.source_receipt_id ||
    typeof metadata?.goodsReceiptId === 'string'
  ) {
    if (obsText && !obsText.trim().startsWith('{') && !obsText.trim().startsWith('[')) {
      return obsText;
    }
    const invoiceReference = rawLabel && rawLabel !== 'Recebimento de Mercadorias'
      ? ` da NF-e ${rawLabel}`
      : '';
    return `Entrada gerada pelo recebimento${invoiceReference}`;
  }

  if (
    relType === 'sales_order' ||
    /^Saída - Pedido\s*#/i.test(rawLabel) ||
    /^Pedido\s*#/i.test(rawLabel)
  ) {
    if (obsText.startsWith('Ajuste do pedido de venda #')) return obsText;
    const rawId =
      move.relatedEntityId ||
      move.related_entity_id ||
      rawLabel.replace(/^(Saída - )?Pedido\s*#/i, '') ||
      '';
    if (obsText && obsText.startsWith('Pedido de venda #')) {
      return `Saída gerada pelo ${obsText.toLowerCase()}`;
    }
    if (rawLabel && /^Saída - Pedido\s*#/i.test(rawLabel)) {
      return `Saída gerada pelo ${rawLabel.replace(/^Saída - /i, '').toLowerCase()}`;
    }
    return `Saída gerada pelo pedido de venda #${rawId}`.trim();
  }

  if (
    relType === 'purchase_order' ||
    isPurchaseEntry(move) ||
    /Pedido de Compra\s*#/i.test(obsText)
  ) {
    if (
      obsText &&
      (obsText.startsWith('Pedido de Compra #') || obsText.startsWith('Entrada NF-'))
    ) {
      return `Entrada gerada por ${obsText}`;
    }
    if (rawLabel) return `Entrada gerada por ${rawLabel}`;
    return 'Entrada gerada por pedido de compra';
  }

  if (rawLabel === 'ESTOQUE INICIAL') return 'Estoque Inicial';

  return obsText || rawLabel || 'Motivo de criação não informado';
};

/**
 * Calcula o saldo no tempo de forma cronológica, onde um ajuste de inventário
 * define o saldo daquele instante exato.
 */
export const calculateInventoryTimelineBalance = (moves: InventoryMoveLike[]): number | null => {
  if (!moves.length) return null;

  const validMoves = moves.filter((m) => isEffectiveMove(m) && !isInventoryAuditMarker(m));
  if (!validMoves.length) return null;

  const sortedMoves = [...validMoves].sort((left, right) => {
    const dLeft = new Date(left.date || left.created_at || left.createdAt || 0).getTime();
    const dRight = new Date(right.date || right.created_at || right.createdAt || 0).getTime();
    if (dLeft !== dRight) return dLeft - dRight;
    const cLeft = new Date(left.createdAt || left.created_at || 0).getTime();
    const cRight = new Date(right.createdAt || right.created_at || 0).getTime();
    return cLeft - cRight;
  });

  return sortedMoves.reduce((balance, move) => {
    const targetStock = getTargetStockFromObservation(move.observation);
    if (targetStock !== null) return targetStock;

    const t = (move.type || '').toLowerCase();
    const q = Number(move.quantity || 0);

    if (t === 'entry' || t === 'in') return balance + q;
    if (t === 'exit' || t === 'out' || t === 'withdrawal') return balance - q;
    if (t === 'adjustment' || t === 'balance') return balance + q;

    return balance;
  }, 0);
};
