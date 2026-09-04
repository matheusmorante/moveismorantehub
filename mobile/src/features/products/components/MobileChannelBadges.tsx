import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MobileChannelBadgesProps {
  dark: boolean;
  isActive: boolean;
  isPublished: boolean;
  isDraft: boolean;
  showCatalog?: boolean;
  onToggleActive: () => void;
  onToggleCatalog?: () => void;
}

export const MobileChannelBadges: React.FC<MobileChannelBadgesProps> = ({
  dark,
  isActive,
  isPublished,
  isDraft,
  showCatalog = true,
  onToggleActive,
  onToggleCatalog,
}) => {
  const handleToggleERP = () => {
    if (isDraft) {
      Alert.alert(
        'Produto em Rascunho',
        'Termine o cadastramento deste produto para poder ativá-lo no ERP.'
      );
      return;
    }
    onToggleActive();
  };

  const handleToggleCat = () => {
    if (isDraft) {
      Alert.alert(
        'Produto em Rascunho',
        'Termine o cadastramento deste produto para poder publicá-lo no Catálogo.'
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
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleToggleERP}
        style={[
          styles.bipartiteBtn,
          isActive && !isDraft ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
          dark && styles.darkBipartiteBorder,
        ]}
      >
        <View style={[styles.bipartiteTag, styles.erpTag, dark && styles.darkErpTag]}>
          <Text style={[styles.bipartiteTagText, styles.erpTagText, dark && styles.darkErpTagText]}>ERP</Text>
        </View>
        <View style={[styles.bipartiteStatus, isActive && !isDraft ? styles.statusActiveBg : styles.statusInactiveBg, dark && (isActive && !isDraft ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg)]}>
          <View style={[styles.statusDot, { backgroundColor: isActive && !isDraft ? '#10b981' : '#94a3b8' }]} />
          <Text style={[styles.bipartiteStatusText, { color: isActive && !isDraft ? '#047857' : '#64748b' }]}>
            {isActive && !isDraft ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Botão Catálogo */}
      {showCatalog && onToggleCatalog && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleCat}
          style={[
            styles.bipartiteBtn,
            isPublished && !isDraft ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
            dark && styles.darkBipartiteBorder,
          ]}
        >
          <View style={[styles.bipartiteTag, styles.catTag, dark && styles.darkCatTag]}>
            <Text style={[styles.bipartiteTagText, styles.catTagText, dark && styles.darkCatTagText]}>Catálogo</Text>
          </View>
          <View style={[styles.bipartiteStatus, isPublished && !isDraft ? styles.statusActiveBg : styles.statusInactiveBg, dark && (isPublished && !isDraft ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg)]}>
            <View style={[styles.statusDot, { backgroundColor: isPublished && !isDraft ? '#10b981' : '#94a3b8' }]} />
            <Text style={[styles.bipartiteStatusText, { color: isPublished && !isDraft ? '#047857' : '#64748b' }]}>
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
