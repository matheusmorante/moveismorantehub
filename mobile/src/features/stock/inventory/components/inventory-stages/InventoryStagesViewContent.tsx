// InventoryStagesViewContent.tsx
// Full implementation extracted from InventoryStagesView.tsx to separate UI/logic.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ChevronRight, PackageOpen } from 'lucide-react-native';
import type { AuditItem } from '../../hooks/useInventoryAuditWorkflow';

interface Stage {
  supplierName: string;
  counted: number;
  countedQuantityTotal: number;
  total: number;
  started: boolean;
}

interface Props {
  items: AuditItem[];
  isDarkMode: boolean;
  variant?: 'stages' | 'summary' | 'selection';
  onStartStage?: (supplierName: string) => Promise<void>;
  onSelectSupplier?: (supplierName: string) => void;
}

export const InventoryStagesViewContent: React.FC<Props> = ({ items, isDarkMode, variant = 'stages', onStartStage, onSelectSupplier }) => {
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';
  const [startingStage, setStartingStage] = React.useState<string | null>(null);
  const [startError, setStartError] = React.useState('');

  const stages = useMemo(() => {
    const stageMap = new Map<string, Stage>();

    for (const item of items) {
      const supplier = item.assignedSupplier || 'Sem fornecedor';
      if (!stageMap.has(supplier)) {
        stageMap.set(supplier, {
          supplierName: supplier,
          counted: 0,
          countedQuantityTotal: 0,
          total: 0,
          started: false,
        });
      }
      const stage = stageMap.get(supplier)!;
      stage.total++;
      if (typeof item.physicalCount === 'number') {
        stage.counted++;
        stage.countedQuantityTotal += Number.isFinite(item.physicalCount) ? item.physicalCount : 0;
        stage.started = true;
      }
      if (item.supplierStageStarted === true) stage.started = true;
    }

    const stagesArray = Array.from(stageMap.values());
    for (const stage of stagesArray) {
      if (variant === 'stages' && stage.started) stage.counted = stage.total;
    }

    // Produtos sem fornecedor ficam disponíveis no scanner geral, mas sem cartão próprio.
    const filteredStagesArray = stagesArray.filter(
      (stage) => stage.supplierName !== 'Sem fornecedor'
    );
    filteredStagesArray.sort((a, b) => a.supplierName.localeCompare(b.supplierName));

    return filteredStagesArray;
  }, [items, variant]);

  const startStage = async (supplierName: string) => {
    if (startingStage || !onStartStage) return;
    setStartingStage(supplierName);
    setStartError('');
    try {
      await onStartStage(supplierName);
    } catch {
      setStartError('Não foi possível salvar o início desta etapa. Tente novamente.');
    } finally {
      setStartingStage(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>
        {variant === 'summary'
          ? 'Quantidades contadas por fornecedor'
          : variant === 'selection'
            ? 'Escolha o fornecedor para contar'
            : `Livre: Etapas por Fornecedor (${stages.length})`}
      </Text>
      {variant === 'selection' && (
        <Text style={{ color: muted, fontSize: 13, marginBottom: 12 }}>
          Toque em um cartão para abrir a contagem desse fornecedor.
        </Text>
      )}
      {variant === 'stages' && (
        <Text style={{ color: muted, fontSize: 13, marginBottom: 12 }}>
          Etapas não iniciadas ficam fora do ajuste. Toque em Iniciar ou Retomar para abrir a contagem; ao iniciar, campos sem quantidade valem 0.
        </Text>
      )}
      {variant !== 'summary' && startError ? <Text accessibilityRole="alert" style={{ color: '#dc2626', fontWeight: '700', marginBottom: 12 }}>{startError}</Text> : null}

      {/* Stages List */}
      <View style={styles.stagesList}>
        {variant === 'selection' && stages.length === 0 && (
          <Text style={{ color: muted, padding: 16, textAlign: 'center' }}>
            Nenhum fornecedor com produtos disponíveis para este inventário.
          </Text>
        )}
        {stages.map((stage) => {
          const isLightCard = variant === 'summary' || variant === 'selection' || stage.started;
          const cardContent = (
            <View style={styles.stageHeader}>
              <View style={styles.stageInfo}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(100,116,139,0.1)' }]}>
                  <PackageOpen size={20} color={muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stageName, { color: isLightCard ? textPrimary : '#f8fafc' }]} numberOfLines={2}>
                    {stage.supplierName}
                  </Text>
                  {variant !== 'selection' && (
                    <Text style={[styles.stageDesc, { color: isLightCard ? muted : '#cbd5e1' }]}>
                      <Text style={{ fontWeight: '800', color: isLightCard ? textPrimary : '#ffffff' }}>
                        {variant === 'summary'
                          ? stage.countedQuantityTotal.toLocaleString('pt-BR')
                          : stage.counted}
                      </Text>{' '}
                      {variant === 'summary'
                        ? stage.countedQuantityTotal === 1 ? 'quantidade contada' : 'quantidades contadas'
                        : stage.counted === 1 ? 'produto considerado' : 'produtos considerados'}
                    </Text>
                  )}
                </View>
              </View>
              {variant === 'selection' ? (
                startingStage === stage.supplierName
                  ? <ActivityIndicator size="small" color="#2563eb" />
                  : <ChevronRight size={20} color={muted} />
              ) : variant === 'summary' && onSelectSupplier ? (
                <ChevronRight size={20} color={muted} />
              ) : variant === 'stages' ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${stage.started ? 'Retomar' : 'Iniciar'} contagem de ${stage.supplierName}`}
                  style={[styles.stageActionButton, { backgroundColor: stage.started ? '#059669' : '#f8fafc' }]}
                  disabled={startingStage !== null}
                  onPress={() => void startStage(stage.supplierName)}
                >
                  {startingStage === stage.supplierName
                    ? <ActivityIndicator size="small" color={stage.started ? '#ffffff' : '#020617'} />
                    : <Text style={[styles.stageActionText, { color: stage.started ? '#ffffff' : '#020617' }]}>{stage.started ? 'Retomar' : 'Iniciar'}</Text>}
                </TouchableOpacity>
              ) : null}
            </View>
          );

          return variant === 'selection' || (variant === 'summary' && onSelectSupplier) ? (
            <TouchableOpacity
              key={stage.supplierName}
              testID="stage-card"
              accessibilityRole="button"
              accessibilityLabel={`${variant === 'selection' ? 'Abrir contagem' : 'Abrir itens'} do fornecedor ${stage.supplierName}`}
              disabled={variant === 'selection' && startingStage !== null}
              onPress={() => variant === 'selection'
                ? void startStage(stage.supplierName)
                : onSelectSupplier?.(stage.supplierName)}
              style={[styles.stageCard, styles.selectionCard, { backgroundColor: surface, borderColor: border }]}
            >
              {cardContent}
            </TouchableOpacity>
          ) : (
            <View
              key={stage.supplierName}
              testID="stage-card"
              style={[styles.stageCard, { backgroundColor: isLightCard ? surface : '#020617', borderColor: isLightCard ? border : '#1e293b' }]}
            >
              {cardContent}
            </View>
          );
        })}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, paddingHorizontal: 4 },
  stagesList: { gap: 12 },
  stageCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  selectionCard: { minHeight: 76, justifyContent: 'center' },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  stageDesc: { fontSize: 13 },
  stageActionButton: {
    minWidth: 76,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageActionText: { fontSize: 13, fontWeight: '700' },
});
