import React, { useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import {
  Search,
  MoreVertical,
  PlusCircle,
  Settings,
  X,
  Tag,
} from 'lucide-react-native';

interface Props {
  mode?: 'standard' | 'composition' | 'categories';
  onModeChange?: (mode: 'standard' | 'composition' | 'categories') => void;
  dark: boolean;
  search: string;
  totalCount: number;
  onSearch: (value: string) => void;
  onNewProduct: () => void;
  onNewComposition?: () => void;
  onOpenConfigs: () => void;
  showDeactivated: boolean;
  showMerged: boolean;
  onToggleDeactivated: () => void;
  onToggleMerged: () => void;
  categories: any[];
  statusFilter: 'all' | 'active' | 'disabled' | 'draft';
  categoryFilter: string;
  catalogStatusFilter: 'all' | 'published' | 'hidden';
  onStatusFilterChange: (value: 'all' | 'active' | 'disabled' | 'draft') => void;
  onCategoryFilterChange: (value: string) => void;
  onCatalogStatusFilterChange: (value: 'all' | 'published' | 'hidden') => void;
}

export function ProductsHeader({
  mode = 'standard',
  onModeChange,
  dark,
  search,
  totalCount,
  onSearch,
  onNewProduct,
  onNewComposition,
  onOpenConfigs,
  showDeactivated,
  showMerged,
  onToggleDeactivated,
  onToggleMerged,
  categories,
  statusFilter,
  categoryFilter,
  catalogStatusFilter,
  onStatusFilterChange,
  onCategoryFilterChange,
  onCatalogStatusFilterChange,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<View>(null);

  const handleOpenMenu = () => {
    menuBtnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      // Dropdown logo abaixo do botão, ancorado à direita da tela
      setMenuAnchor({ top: pageY + height + 4, right: 16 });
      setShowMenu(true);
    });
  };

  return (
    <View style={styles.container}>
      {/* Topo com Título, Contador e Menu de 3 Pontinhos */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <Text style={[styles.title, dark && styles.light]}>{mode === 'composition' ? 'Composições' : mode === 'categories' ? 'Ambientes e Categorias' : 'Produtos'}</Text>
          <View style={[styles.counterBadge, mode === 'categories' && { display: 'none' }]}>
            {mode !== 'categories' && <Text style={styles.counterText}>{totalCount}</Text>}
          </View>
        </View>

        <TouchableOpacity
          ref={menuBtnRef as any}
          onPress={handleOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Opções de produtos"
          style={[styles.menuBtn, dark && styles.darkMenuBtn]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {onModeChange && (
        <View style={styles.modeRow}>
          {([
            { key: 'standard', label: 'Produtos' },
            { key: 'composition', label: 'Composições' },
            { key: 'categories', label: 'Ambientes e Categorias' },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity key={key} onPress={() => onModeChange(key)} style={[styles.modeButton, mode === key && styles.modeButtonActive]}>
              <Text style={[styles.modeText, mode === key && styles.modeTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {mode !== 'categories' && (
        <>
          {/* Barra de Pesquisa / Busca de Produtos */}
      <View style={[styles.searchBox, dark && styles.darkSearch]}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder={mode === 'composition' ? 'Buscar composições...' : 'Buscar por nome, código, SKU...'}
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.light, { outlineStyle: 'none' } as any]}
        />
        {Boolean(search) && (
          <TouchableOpacity onPress={() => onSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.visibilityFilters}>
        <TouchableOpacity
          onPress={onToggleDeactivated}
          style={[styles.visibilityButton, dark && styles.darkVisibilityButton, showDeactivated && styles.deactivatedSelected]}
        >
          <Text style={[styles.visibilityText, dark && styles.light, showDeactivated && styles.selectedVisibilityText]}>
            {showDeactivated ? '☑' : '☐'} Mostrar desativados
          </Text>
        </TouchableOpacity>
      </View>
        </>
      )}

      {/* Dropdown ancorado ao botão — NÃO bloqueia a tela */}
      <Modal
        visible={showMenu && menuAnchor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        {/* Backdrop invisível cobre a tela inteira para fechar ao tocar fora */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          {menuAnchor && (
            <View
              style={[
                styles.menuDropdown,
                dark && styles.darkMenu,
                { position: 'absolute', top: menuAnchor.top, right: menuAnchor.right },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  if (mode === 'composition' && onNewComposition) onNewComposition();
                  else onNewProduct();
                }}
              >
                <PlusCircle size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>{mode === 'composition' ? 'Nova Composição' : 'Novo Produto'}</Text>
              </TouchableOpacity>

              {onNewComposition && mode === 'standard' && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setShowMenu(false); onNewComposition(); }}
                >
                  <PlusCircle size={18} color="#10b981" />
                  <Text style={[styles.menuItemText, dark && styles.light]}>Nova Composição</Text>
                </TouchableOpacity>
              )}

              <View style={styles.menuDivider} />

              {onModeChange && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onModeChange('categories');
                  }}
                >
                  <Tag size={18} color="#2563eb" />
                  <Text style={[styles.menuItemText, dark && styles.light]}>Ambientes e Categorias</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { setShowMenu(false); onOpenConfigs(); }}
              >
                <Settings size={18} color="#475569" />
                <Text style={[styles.menuItemText, dark && styles.light]}>Configurações de Produto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { setShowMenu(false); setShowFilters(true); }}
              >
                <Settings size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>Filtros avançados</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, dark && styles.darkMenu]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, dark && styles.light]}>Filtros de produtos</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}><X size={20} color={dark ? '#cbd5e1' : '#475569'} /></TouchableOpacity>
            </View>
            <Text style={[styles.filterLabel, dark && styles.light]}>Situação no ERP</Text>
            <View style={styles.choiceRow}>
              {([
                ['all', 'Todos'], ['active', 'Ativos'], ['disabled', 'Desativados'], ['draft', 'Rascunhos'],
              ] as const).map(([value, label]) => (
                <TouchableOpacity key={value} onPress={() => onStatusFilterChange(value)} style={[styles.choice, statusFilter === value && styles.choiceActive]}>
                  <Text style={[styles.choiceText, statusFilter === value && styles.choiceTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, dark && styles.light]}>Catálogo digital</Text>
            <View style={styles.choiceRow}>
              {([
                ['all', 'Todos'], ['published', 'Publicados'], ['hidden', 'Ocultados'],
              ] as const).map(([value, label]) => (
                <TouchableOpacity key={value} onPress={() => onCatalogStatusFilterChange(value)} style={[styles.choice, catalogStatusFilter === value && styles.choiceActive]}>
                  <Text style={[styles.choiceText, catalogStatusFilter === value && styles.choiceTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, dark && styles.light]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
              <TouchableOpacity onPress={() => onCategoryFilterChange('')} style={[styles.choice, !categoryFilter && styles.choiceActive]}><Text style={[styles.choiceText, !categoryFilter && styles.choiceTextActive]}>Todas</Text></TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity key={category.id} onPress={() => onCategoryFilterChange(String(category.id))} style={[styles.choice, categoryFilter === String(category.id) && styles.choiceActive]}>
                  <Text style={[styles.choiceText, categoryFilter === String(category.id) && styles.choiceTextActive]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}><Text style={styles.applyButtonText}>Aplicar filtros</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  modeButton: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  modeButtonActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  modeText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  modeTextActive: { color: '#2563eb' },
  container: {
    paddingVertical: 6,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  light: {
    color: '#f8fafc',
  },
  counterBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563eb',
  },
  menuBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  darkMenuBtn: {
    backgroundColor: '#1e3a8a30',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkSearch: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  visibilityFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  visibilityButton: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  darkVisibilityButton: { borderColor: '#334155', backgroundColor: '#1e293b' },
  deactivatedSelected: { borderColor: '#fda4af', backgroundColor: '#fff1f2' },
  mergedSelected: { borderColor: '#c4b5fd', backgroundColor: '#f5f3ff' },
  visibilityText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  selectedVisibilityText: { color: '#6d28d9' },
  // Backdrop TOTALMENTE transparente — não escurece a tela
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuDropdown: {
    width: 240,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 6,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  darkMenu: {
    backgroundColor: '#1e293b',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  filterBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  filterSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    maxHeight: '82%',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  filterTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  filterLabel: { fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#f8fafc' },
  choiceActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  choiceText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  choiceTextActive: { color: '#1d4ed8' },
  applyButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, marginTop: 4 },
  applyButtonText: { color: '#fff', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
});
