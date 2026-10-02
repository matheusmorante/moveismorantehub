import { CheckCircle2, FilterX, Plus } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  isDarkMode: boolean;
  hasFilters: boolean;
  canManageStock: boolean;
  onClearFilters: () => void;
  onNewUnavailability: () => void;
}

export const UnavailabilityEmptyState: React.FC<Props> = ({
  isDarkMode,
  hasFilters,
  canManageStock,
  onClearFilters,
  onNewUnavailability,
}) => {
  if (hasFilters) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
          <FilterX size={28} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </View>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Nenhum registro encontrado
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Não foram encontradas indisponibilidades com os filtros selecionados.
        </Text>
        <TouchableOpacity
          style={[styles.actionBtn, styles.clearBtn]}
          onPress={onClearFilters}
          activeOpacity={0.7}
        >
          <Text style={styles.clearBtnText}>Limpar filtros</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' }]}>
        <CheckCircle2 size={32} color="#10b981" />
      </View>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        Nenhuma indisponibilidade registrada
      </Text>
      <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
        O estoque está 100% liberado. Não há itens com avarias, defeitos ou bloqueios de saída no
        momento.
      </Text>
      {canManageStock && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={onNewUnavailability}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Nova indisponibilidade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  containerDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  titleDark: {
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  primaryBtn: {
    backgroundColor: '#dc2626',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: {
    backgroundColor: '#eff6ff',
  },
  clearBtnText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
});
