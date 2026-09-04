export type CostState = {
  quantity: number;
  inventoryValue: number;
  unitCost?: number;
};

export type CostMove = {
  id?: string;
  type: string;
  quantity: number;
  unitCost?: number | null;
  status?: string;
  observation?: string | null;
};

export type AppliedCostMove = CostMove & { resolvedUnitCost?: number };

const isExit = (type: string) => type === 'exit' || type === 'withdrawal';

export const isEffectiveInventoryMove = (move: Pick<CostMove, 'status' | 'observation'> & { reason?: string | null }) => {
  try {
    const metadata = typeof move.observation === 'string' && (move.observation.startsWith('{') || move.observation.startsWith('[')) ? JSON.parse(move.observation) : null;
    const isReversed = move.status === 'reversed' || move.status === 'cancelled'
      || metadata?.status === 'reversed' || metadata?.status === 'cancelled'
      || (typeof move.reason === 'string' && move.reason.startsWith('Cancelamento da venda'));
    return !isReversed;
  } catch {
    const isReversed = move.status === 'reversed' || move.status === 'cancelled'
      || (typeof move.reason === 'string' && move.reason.startsWith('Cancelamento da venda'));
    return !isReversed;
  }
};

export const applyMovingAverageMove = (
  state: CostState,
  move: CostMove,
  recalculateExitCost = false,
): { state: CostState; resolvedUnitCost?: number } => {
  const quantity = Number(move.quantity || 0);
  const previous = { ...state };

  if (move.type === 'entry') {
    const unitCost = move.unitCost === null || move.unitCost === undefined ? undefined : Number(move.unitCost);
    const nextQuantity = previous.quantity + quantity;
    const nextValue = unitCost !== undefined && unitCost > 0
      ? previous.inventoryValue + quantity * unitCost
      : previous.inventoryValue;
    return {
      state: {
        quantity: nextQuantity,
        inventoryValue: nextValue,
        unitCost: nextQuantity > 0 && nextValue > 0 ? nextValue / nextQuantity : undefined,
      },
    };
  }

  if (isExit(move.type)) {
    const currentUnitCost = previous.quantity > 0 && previous.inventoryValue > 0
      ? previous.inventoryValue / previous.quantity
      : undefined;
    const storedUnitCost = move.unitCost === null || move.unitCost === undefined ? undefined : Number(move.unitCost);
    const resolvedUnitCost = recalculateExitCost ? currentUnitCost : storedUnitCost ?? currentUnitCost;
    const nextQuantity = previous.quantity - quantity;
    const nextValue = resolvedUnitCost === undefined
      ? previous.inventoryValue
      : previous.inventoryValue - quantity * resolvedUnitCost;
    return {
      state: {
        quantity: nextQuantity,
        inventoryValue: nextValue,
        unitCost: nextQuantity > 0 && nextValue > 0 ? nextValue / nextQuantity : undefined,
      },
      resolvedUnitCost,
    };
  }

  const nextQuantity = previous.quantity + quantity;
  return {
    state: {
      quantity: nextQuantity,
      inventoryValue: previous.inventoryValue,
      unitCost: nextQuantity > 0 && previous.inventoryValue > 0 ? previous.inventoryValue / nextQuantity : undefined,
    },
  };
};

export const replayMovingAverageMoves = (
  moves: CostMove[],
  recalculateExitCosts = false,
): { state: CostState; moves: AppliedCostMove[] } => {
  let state: CostState = { quantity: 0, inventoryValue: 0, unitCost: undefined };
  const appliedMoves: AppliedCostMove[] = [];

  for (const move of moves.filter(isEffectiveInventoryMove)) {
    const applied = applyMovingAverageMove(state, move, recalculateExitCosts);
    state = applied.state;
    appliedMoves.push({ ...move, resolvedUnitCost: applied.resolvedUnitCost });
  }

  return { state, moves: appliedMoves };
};
