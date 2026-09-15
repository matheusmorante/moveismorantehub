import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from '../../types/inventoryMove.type';
import { INVENTORY_TABLE_NAME } from './inventoryTypeRules';
import { mapInventoryMoveFromDB } from './inventoryMapper';

let currentMoves: InventoryMove[] = [];
let listeners: Array<(moves: InventoryMove[]) => void> = [];

export const notifyListeners = (): void => {
    listeners.forEach(listener => {
        try {
            listener([...currentMoves]);
        } catch (e) {
            console.error("Erro ao notificar listener de movimentações:", e);
        }
    });
};

export const getCurrentMoves = (): InventoryMove[] => [...currentMoves];

export const setCurrentMoves = (moves: InventoryMove[]): void => {
    currentMoves = moves;
    notifyListeners();
};

export const prependMoveToState = (move: InventoryMove): void => {
    currentMoves = [move, ...currentMoves];
    notifyListeners();
};

export const removeMoveFromState = (id: string): void => {
    currentMoves = currentMoves.filter(m => m.id !== id);
    notifyListeners();
};

export const updateMoveInState = (id: string, updates: Partial<InventoryMove>): void => {
    currentMoves = currentMoves.map(m => m.id === id ? { ...m, ...updates } : m);
    notifyListeners();
};

export const subscribeToInventoryMoves = (callback: (moves: InventoryMove[]) => void) => {
    listeners.push(callback);

    const fetchAll = () => {
        supabase.from(INVENTORY_TABLE_NAME)
            .select('*')
            .order('date', { ascending: false })
            .then(({ data, error }: { data: any, error: any }) => {
                if (data && !error) {
                    currentMoves = data.map(mapInventoryMoveFromDB);
                    notifyListeners();
                } else if (error) {
                    console.error("Erro ao buscar lançamentos iniciais:", error);
                    callback([]);
                }
            });
    };

    if (currentMoves.length > 0) {
        callback([...currentMoves]);
    }
    fetchAll();

    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
};
