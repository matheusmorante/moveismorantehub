import { useState } from 'react';
import { Alert } from 'react-native';
import type { StockMove } from '../../types/stock.types';
import type { StockMoveUpdate } from '../domain/stockMoveTypes';
import { isOrderLinked } from '../domain/inventoryTimelineBalance';
import { reverseStockMove, updateStockMove } from '../../../../services/stock/stockMovesService';

export const useStockMoveActions = (reloadPage: () => void) => {
  const [editingMove, setEditingMove] = useState<StockMove | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [moveToDelete, setMoveToDelete] = useState<StockMove | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const requestReverse = (move: StockMove) => {
    if (isOrderLinked(move)) {
      Alert.alert('Estorno bloqueado', 'Esta movimentação pertence a um pedido e seu estorno ocorre pelo status do pedido.');
      return;
    }
    setMoveToDelete(move);
  };

  const confirmReverse = async (reason: string) => {
    if (!moveToDelete?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      await reverseStockMove(moveToDelete.id, reason);
      Alert.alert('Sucesso', 'Movimentação estornada com sucesso.');
      setMoveToDelete(null);
      reloadPage();
    } catch (error) {
      Alert.alert('Não foi possível estornar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const saveEdit = async (updates: StockMoveUpdate) => {
    if (!editingMove || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateStockMove(editingMove.id, updates);
      setEditingMove(null);
      Alert.alert('Sucesso', 'Movimentação atualizada com sucesso.');
      reloadPage();
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSavingEdit(false);
    }
  };

  return {
    editingMove, setEditingMove, savingEdit, moveToDelete, setMoveToDelete,
    isDeleting, requestReverse, confirmReverse, saveEdit,
  };
};
