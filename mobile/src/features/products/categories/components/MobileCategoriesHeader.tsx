import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Tag,
  LayoutGrid,
  Plus,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react-native';
import { ActiveViewType } from '../types/mobileCategory.types';

interface Props {
  dark: boolean;
  activeView: ActiveViewType;
  onViewChange: (view: ActiveViewType) => void;
  onNewEnvironment: () => void;
  onNewCategory: () => void;
  totalOrphans: number;
  onViewOrphans: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const MobileCategoriesHeader: React.FC<Props> = ({
  dark,
  activeView,
  onViewChange,
  onNewEnvironment,
  onNewCategory,
  totalOrphans,
  onViewOrphans,
  searchTerm,
  onSearchChange,
}) => {
  const searchPlaceholder = activeView === 'ambiente' ? 'Buscar ambiente...' : 'Buscar categoria...';

  return (
    <View style={styles.container}>

      {/* Alerta de Categorias Sem Ambiente */}
      {totalOrphans > 0 && (
        <View style={[styles.orphanAlert, dark && styles.orphanAlertDark]}>
          <View style={styles.orphanAlertContent}>
            <AlertTriangle size={15} color="#d97706" />
            <Text style={[styles.orphanAlertText, dark && styles.orphanAlertTextDark]}>
              <Text style={{ fontWeight: '800' }}>{totalOrphans}</Text>{' '}
              {totalOrphans === 1 ? 'categoria sem ambiente vinculado.' : 'categorias sem ambiente vinculado.'}
            </Text>
          </View>
          <TouchableOpacity onPress={onViewOrphans} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.orphanAlertLink}>Ver categorias →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Alternância de Abas: Por ambiente vs Por categoria */}
      <View style={[styles.tabsWrapper, dark && styles.tabsWrapperDark]}>
        <TouchableOpacity
          style={[styles.tabButton, activeView === 'ambiente' && styles.tabButtonActive, activeView === 'ambiente' && dark && styles.tabButtonActiveDark]}
          onPress={() => onViewChange('ambiente')}
        >
          <LayoutGrid size={14} color={activeView === 'ambiente' ? '#2563eb' : (dark ? '#94a3b8' : '#64748b')} />
          <Text style={[
            styles.tabButtonText,
            dark && styles.textMuted,
            activeView === 'ambiente' && styles.tabButtonTextActive,
          ]}>
            Por ambiente
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeView === 'categoria' && styles.tabButtonActive, activeView === 'categoria' && dark && styles.tabButtonActiveDark]}
          onPress={() => onViewChange('categoria')}
        >
          <Tag size={14} color={activeView === 'categoria' ? '#2563eb' : (dark ? '#94a3b8' : '#64748b')} />
          <Text style={[
            styles.tabButtonText,
            dark && styles.textMuted,
            activeView === 'categoria' && styles.tabButtonTextActive,
          ]}>
            Por categoria
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão Contextual: Visível apenas para a aba ativa e posicionado embaixo das abas */}
      {activeView === 'ambiente' ? (
        <TouchableOpacity
          style={[styles.btnAction, styles.btnEnvironment]}
          onPress={onNewEnvironment}
          accessibilityRole="button"
        >
          <Plus size={15} color="#ffffff" />
          <Text style={styles.btnActionText}>Novo ambiente</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.btnAction, styles.btnCategory]}
          onPress={onNewCategory}
          accessibilityRole="button"
        >
          <Plus size={15} color="#ffffff" />
          <Text style={styles.btnActionText}>Nova categoria</Text>
        </TouchableOpacity>
      )}

      {/* Barra de Busca */}
      <View style={[styles.searchBox, dark && styles.searchBoxDark]}>
        <Search size={15} color="#94a3b8" />
        <TextInput
          value={searchTerm}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor="#94a3b8"
          style={[styles.searchInput, dark && styles.textLight]}
        />
        {Boolean(searchTerm) && (
          <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 6,
  },

  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  btnAction: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnEnvironment: {
    backgroundColor: '#059669',
  },
  btnCategory: {
    backgroundColor: '#2563eb',
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orphanAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  orphanAlertDark: {
    backgroundColor: 'rgba(120, 53, 15, 0.25)',
    borderColor: 'rgba(217, 119, 6, 0.4)',
  },
  orphanAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  orphanAlertText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
    flexShrink: 1,
  },
  orphanAlertTextDark: {
    color: '#fde68a',
  },
  orphanAlertLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
    textDecorationLine: 'underline',
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabsWrapperDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonActiveDark: {
    backgroundColor: '#0f172a',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
});
