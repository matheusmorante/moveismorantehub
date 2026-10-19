import { useState } from 'react';
import { Alert } from 'react-native';
import type { InventorySession } from '../../types/stock.types';
import {
  reverseInventorySession,
  unreverseInventorySession,
  deleteInventoryDraft,
  fetchInventorySessionDetails,
} from '../../../../services/stockService';

export function useInventoryScreenActions(onReload: () => void | Promise<void>) {
  const [showCount, setShowCount] = useState(false);
  const [editingSession, setEditingSession] = useState<InventorySession | null>(null);
  const [copiedItems, setCopiedItems] = useState<any[] | null>(null);
  const [selectedSession, setSelectedSession] = useState<InventorySession | null>(null);
  const [viewDetailsSession, setViewDetailsSession] = useState<InventorySession | null>(null);

  const startNewInventory = () => {
    setEditingSession(null);
    setCopiedItems(null);
    setShowCount(true);
  };

  const closeAuditFlow = () => {
    setShowCount(false);
    setEditingSession(null);
    setCopiedItems(null);
    void onReload();
  };

  const handleOptionsPress = (session: InventorySession) => {
    setSelectedSession(session);
  };

  const handleContinueInventory = (session: InventorySession) => {
    setSelectedSession(null);
    setEditingSession(session);
    setCopiedItems(null);
    setShowCount(true);
  };

  const handleDuplicateInventory = async (session: InventorySession) => {
    setSelectedSession(null);
    try {
      const details = await fetchInventorySessionDetails(session.id);
      const items = details?.items || [];
      if (!items.length) {
        Alert.alert('Aviso', 'Este inventário não possui itens para duplicar.');
        return;
      }
      setEditingSession(null);
      setCopiedItems(items);
      setShowCount(true);
    } catch (error) {
      console.error('Erro ao buscar itens para duplicar:', error);
      Alert.alert('Erro', 'Não foi possível carregar os itens do inventário.');
    }
  };

  const handleReverseInventory = (session: InventorySession) => {
    setSelectedSession(null);
    const code =
      session.inventoryCode ||
      session.name?.replace('Inventário #', '') ||
      session.id.split('-')[0];
    Alert.alert(
      'Desfazer inventário',
      `Deseja estornar todos os ajustes gerados pelo Inventário #${code}? Os saldos de estoque dos produtos retornarão aos valores anteriores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, estornar',
          style: 'destructive',
          onPress: async () => {
            try {
              await reverseInventorySession(session);
              Alert.alert('Sucesso', `Inventário #${code} estornado com sucesso!`);
              void onReload();
            } catch (error) {
              console.error('Erro ao estornar inventário:', error);
              Alert.alert('Erro', 'Não foi possível estornar os ajustes do inventário.');
            }
          },
        },
      ]
    );
  };

  const handleApplyAdjustments = (session: InventorySession) => {
    setSelectedSession(null);
    const code =
      session.inventoryCode ||
      session.name?.replace('Inventário #', '') ||
      session.id.split('-')[0];
    Alert.alert(
      'Aplicar ajuste',
      `Deseja reaplicar os ajustes do Inventário #${code}? O estoque será atualizado com as quantidades contadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar ajustes',
          onPress: async () => {
            try {
              await unreverseInventorySession(session);
              Alert.alert('Sucesso', `Ajustes do Inventário #${code} aplicados com sucesso!`);
              void onReload();
            } catch (error) {
              console.error('Erro ao aplicar ajustes:', error);
              Alert.alert('Erro', 'Não foi possível reaplicar os ajustes do inventário.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteDraft = (session: InventorySession) => {
    setSelectedSession(null);
    const code =
      session.inventoryCode ||
      session.name?.replace('Inventário #', '') ||
      session.id.split('-')[0];
    Alert.alert(
      'Excluir contagem',
      `Excluir a contagem #${code}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInventoryDraft(session.id);
              Alert.alert('Sucesso', 'Contagem em andamento excluída.');
              void onReload();
            } catch (error) {
              console.error('Erro ao excluir contagem:', error);
              Alert.alert('Erro', 'Não foi possível excluir a contagem.');
            }
          },
        },
      ]
    );
  };

  return {
    showCount,
    editingSession,
    copiedItems,
    selectedSession,
    viewDetailsSession,
    setSelectedSession,
    setViewDetailsSession,
    startNewInventory,
    closeAuditFlow,
    handleOptionsPress,
    handleContinueInventory,
    handleDuplicateInventory,
    handleReverseInventory,
    handleApplyAdjustments,
    handleDeleteDraft,
  };
}
