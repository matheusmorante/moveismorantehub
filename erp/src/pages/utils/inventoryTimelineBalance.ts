import InventoryMove from "../types/inventoryMove.type";

const getTargetStock = (move: InventoryMove): number | null => {
    try {
        const target = JSON.parse(move.observation || "{}").targetStock;
        return Number.isFinite(Number(target)) ? Number(target) : null;
    } catch {
        return null;
    }
};

const isEffective = (move: InventoryMove) => {
    if (["reversed", "cancelled"].includes(move.status || "")) return false;
    try {
        return !["reversed", "cancelled"].includes(JSON.parse(move.observation || "{}").status);
    } catch {
        return true;
    }
};

const chronologicalMoves = (moves: InventoryMove[]) => [...moves]
    .filter(isEffective)
    .sort((left, right) => {
        const dateDifference = new Date(left.date).getTime() - new Date(right.date).getTime();
        if (dateDifference) return dateDifference;
        return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
    });

/** Calcula o saldo no tempo: um ajuste de inventário define o saldo daquele instante. */
export const calculateInventoryTimelineBalance = (moves: InventoryMove[]): number | null => {
    if (!moves.length) return null;

    return chronologicalMoves(moves).reduce((balance, move) => {
        const targetStock = getTargetStock(move);
        if (targetStock !== null) return targetStock;
        if (move.type === "entry") return balance + Number(move.quantity || 0);
        if (move.type === "exit" || move.type === "withdrawal") return balance - Number(move.quantity || 0);
        if (move.type === "adjustment" || move.type === "balance") return balance + Number(move.quantity || 0);
        return balance;
    }, 0);
};
