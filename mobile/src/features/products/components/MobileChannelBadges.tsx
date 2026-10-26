import type React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  getMobileCatalogStatusBadgeAccessibilityHint,
  getMobileCatalogStatusBadgeInteraction,
  getMobileErpStatusBadgeInteraction,
} from '../domain/mobileProductCardRules';

const draftStatusHint = 'Termine o cadastramento deste produto para poder ativá-lo no ERP.';

interface MobileChannelBadgesProps {
  dark: boolean;
  isParent?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  isSalvado?: boolean;
  isNonConventional?: boolean;
  isActive: boolean;
  isPublished: boolean;
  isDraft: boolean;
  showCatalog?: boolean;
  canToggleActive?: boolean;
  canToggleCatalog?: boolean;
  onToggleActive: () => void;
  onToggleCatalog?: () => void;
}

export const MobileChannelBadges: React.FC<MobileChannelBadgesProps> = ({
  dark,
  isParent = false,
  disabled = false,
  disabledReason,
  isSalvado = false,
  isNonConventional = false,
  isActive,
  isPublished,
  isDraft,
  showCatalog = true,
  canToggleActive = false,
  canToggleCatalog = false,
  onToggleActive,
  onToggleCatalog,
}) => {
  const erpActive = isActive && !isDraft && !isNonConventional && !isSalvado;
  const erpStatusInteraction = getMobileErpStatusBadgeInteraction({
    canToggleActive,
    isDraft,
    isMerged: disabled,
    isParent,
    isNonConventional,
  });
  const catalogStatusInteraction = getMobileCatalogStatusBadgeInteraction({
    canToggleCatalog,
    isDraft,
    isMerged: disabled,
  });

  const handleToggleERP = () => {
    if (disabled) {
      Alert.alert(
        'Variação Mesclada',
        disabledReason || 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
      );
      return;
    }
    if (isSalvado) {
      Alert.alert(
        'Origem do Estoque: Salvados',
        'Produtos de origem do estoque Salvados não podem ser ativos no ERP.'
      );
      return;
    }
    if (isParent) return;
    if (isDraft) {
      Alert.alert('Produto em Rascunho', draftStatusHint);
      return;
    }
    onToggleActive();
  };

  const handleToggleCat = () => {
    if (isDraft) return;
    if (disabled) {
      Alert.alert(
        'Variação Mesclada',
        disabledReason || 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
      );
      return;
    }
    if (onToggleCatalog) {
      onToggleCatalog();
    }
  };

  return (
    <View style={styles.channelsGroup}>
      {/* Botão ERP */}
      {!isSalvado && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={erpStatusInteraction.canPress ? handleToggleERP : undefined}
          disabled={erpStatusInteraction.disabled}
          accessibilityRole="button"
          accessibilityLabel={
            isNonConventional
              ? 'Status ERP: Desativado'
              : `Status ERP: ${erpActive ? 'Ativo' : 'Desativado'}`
          }
          accessibilityHint={
            isDraft
              ? draftStatusHint
              : isNonConventional
                ? 'Produtos de origem de estoque diferente de Convencional não podem ser ativados no ERP, apenas no catálogo digital.'
                : undefined
          }
          style={[
            styles.bipartiteBtn,
            erpActive ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
            dark && styles.darkBipartiteBorder,
            (disabled || isDraft) && styles.disabledBtn,
            isNonConventional && styles.nonConventionalBtn,
          ]}
        >
          <View style={[styles.bipartiteTag, styles.erpTag, dark && styles.darkErpTag]}>
            <Text
              style={[styles.bipartiteTagText, styles.erpTagText, dark && styles.darkErpTagText]}
            >
              ERP
            </Text>
          </View>
          <View
            style={[
              styles.bipartiteStatus,
              erpActive ? styles.statusActiveBg : styles.statusInactiveBg,
              dark && (erpActive ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg),
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: erpActive ? '#10b981' : '#94a3b8' }]}
            />
            <Text
              style={[styles.bipartiteStatusText, { color: erpActive ? '#047857' : '#64748b' }]}
            >
              {erpActive ? 'Ativo' : 'Desativado'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Botão Catálogo */}
      {showCatalog && onToggleCatalog && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={catalogStatusInteraction.canPress ? handleToggleCat : undefined}
          disabled={catalogStatusInteraction.disabled}
          accessibilityRole="button"
          accessibilityLabel={`Status Catálogo: ${isPublished && !isDraft ? 'Publicado' : 'Oculto'}`}
          accessibilityHint={getMobileCatalogStatusBadgeAccessibilityHint({
            canToggleCatalog,
            isDraft,
            isMerged: disabled,
            disabledReason,
          })}
          style={[
            styles.bipartiteBtn,
            isPublished && !isDraft ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
            dark && styles.darkBipartiteBorder,
            (catalogStatusInteraction.disabled || disabled) && styles.disabledBtn,
          ]}
        >
          <View style={[styles.bipartiteTag, styles.catTag, dark && styles.darkCatTag]}>
            <Text
              style={[styles.bipartiteTagText, styles.catTagText, dark && styles.darkCatTagText]}
            >
              Catálogo
            </Text>
          </View>
          <View
            style={[
              styles.bipartiteStatus,
              isPublished && !isDraft ? styles.statusActiveBg : styles.statusInactiveBg,
              dark &&
                (isPublished && !isDraft ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg),
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isPublished && !isDraft ? '#10b981' : '#94a3b8' },
              ]}
            />
            <Text
              style={[
                styles.bipartiteStatusText,
                { color: isPublished && !isDraft ? '#047857' : '#64748b' },
              ]}
            >
              {isPublished && !isDraft ? 'Publicado' : 'Oculto'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  channelsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bipartiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bipartiteActiveBorder: {
    borderColor: '#bbf7d0',
  },
  bipartiteInactiveBorder: {
    borderColor: '#e2e8f0',
  },
  darkBipartiteBorder: {
    borderColor: '#334155',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  nonConventionalBtn: {
    opacity: 0.5,
  },
  bipartiteTag: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  erpTag: {
    backgroundColor: '#eff6ff',
    borderRightWidth: 1,
    borderRightColor: '#dbeafe',
  },
  darkErpTag: {
    backgroundColor: '#1e3a8a30',
    borderRightColor: '#1e3a8a60',
  },
  bipartiteTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  erpTagText: {
    color: '#2563eb',
  },
  darkErpTagText: {
    color: '#93c5fd',
  },
  catTag: {
    backgroundColor: '#faf5ff',
    borderRightWidth: 1,
    borderRightColor: '#f3e8ff',
  },
  darkCatTag: {
    backgroundColor: '#581c8730',
    borderRightColor: '#581c8760',
  },
  catTagText: {
    color: '#7c3aed',
  },
  darkCatTagText: {
    color: '#c084fc',
  },
  bipartiteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statusActiveBg: {
    backgroundColor: '#f0fdf4',
  },
  darkStatusActiveBg: {
    backgroundColor: '#064e3b30',
  },
  statusInactiveBg: {
    backgroundColor: '#f8fafc',
  },
  darkStatusInactiveBg: {
    backgroundColor: '#1e293b',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bipartiteStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
