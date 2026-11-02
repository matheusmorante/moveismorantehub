import { ChevronRight, X } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  resolveMobileProductReadinessTab,
  type MobileProductFormTabId,
} from '../domain/mobileProductFormErrorNavigation';
import { styles } from './productFormScreen.styles';

export interface ProductFormReadinessItem {
  id: string;
  label: string;
  ready: boolean;
  tab?: MobileProductFormTabId;
}

interface ProductFormReadinessChecklistProps {
  activeReadiness: 'erp' | 'catalog';
  items: ProductFormReadinessItem[];
  dark: boolean;
  enabledTabs: ReadonlyArray<{ id: MobileProductFormTabId }>;
  onClose: () => void;
  onSelectTab: (tab: MobileProductFormTabId) => void;
}

export function ProductFormReadinessChecklist({
  activeReadiness,
  items,
  dark,
  enabledTabs,
  onClose,
  onSelectTab,
}: ProductFormReadinessChecklistProps) {
  return (
    <View style={[styles.readinessPanel, dark && styles.darkReadinessPanel]}>
      <View style={styles.readinessPanelHeader}>
        <View style={styles.readinessPanelTitleGroup}>
          <Text style={[styles.readinessPanelTitle, dark && styles.lightText]}>
            {activeReadiness === 'erp'
              ? 'Requisitos do ERP (Cadastro / Ativação)'
              : 'Requisitos do Catálogo'}
          </Text>
          <Text style={[styles.readinessPanelHint, dark && styles.dimText]}>
            Toque em um item para abrir a aba correspondente.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.readinessCloseButton}
          accessibilityRole="button"
          accessibilityLabel="Fechar checklist de prontidão"
        >
          <X size={16} color={dark ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.readinessList} showsVerticalScrollIndicator nestedScrollEnabled>
        {items.map((item) => {
          const targetTab = resolveMobileProductReadinessTab(
            item.id,
            item.tab,
            enabledTabs.map((enabledTab) => enabledTab.id)
          );
          const contents = (
            <>
              <View
                style={[
                  styles.readinessStatusIcon,
                  item.ready ? styles.readinessStatusIconReady : styles.readinessStatusIconPending,
                ]}
              >
                <Text
                  style={[
                    styles.readinessStatusIconText,
                    item.ready
                      ? styles.readinessStatusIconTextReady
                      : styles.readinessStatusIconTextPending,
                  ]}
                >
                  {item.ready ? '✓' : '!'}
                </Text>
              </View>
              <Text
                style={[
                  styles.readinessItemLabel,
                  item.ready ? styles.readinessItemLabelReady : styles.readinessItemLabelPending,
                  dark && styles.readinessItemLabelDark,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.readinessItemStatus,
                  item.ready ? styles.readinessItemStatusReady : styles.readinessItemStatusPending,
                ]}
              >
                {item.ready ? 'OK' : 'Pendente'}
              </Text>
              {targetTab ? <ChevronRight size={14} color={dark ? '#94a3b8' : '#94a3b8'} /> : null}
            </>
          );

          if (!targetTab) {
            return (
              <View key={item.id} style={styles.readinessItem}>
                {contents}
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelectTab(targetTab)}
              style={styles.readinessItem}
              accessibilityRole="button"
              accessibilityLabel={`${item.ready ? 'Concluído' : 'Pendente'}: ${item.label}`}
              accessibilityHint={`Abre a aba ${targetTab}`}
            >
              {contents}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
