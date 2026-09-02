import React, { useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Search,
  MoreVertical,
  PlusCircle,
  Settings,
  X,
} from 'lucide-react-native';

interface Props {
  dark: boolean;
  search: string;
  totalCount: number;
  onSearch: (value: string) => void;
  onNewProduct: () => void;
  onOpenConfigs: () => void;
}

export function ProductsHeader({
  dark,
  search,
  totalCount,
  onSearch,
  onNewProduct,
  onOpenConfigs,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
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
          <Text style={[styles.title, dark && styles.light]}>Produtos</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{totalCount}</Text>
          </View>
        </View>

        <TouchableOpacity
          ref={menuBtnRef as any}
          onPress={handleOpenMenu}
          style={[styles.menuBtn, dark && styles.darkMenuBtn]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa / Busca de Produtos */}
      <View style={[styles.searchBox, dark && styles.darkSearch]}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Buscar por nome, código, SKU..."
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.light, { outlineStyle: 'none' } as any]}
        />
        {Boolean(search) && (
          <TouchableOpacity onPress={() => onSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

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
                onPress={() => { setShowMenu(false); onNewProduct(); }}
              >
                <PlusCircle size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>Novo Produto</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { setShowMenu(false); onOpenConfigs(); }}
              >
                <Settings size={18} color="#475569" />
                <Text style={[styles.menuItemText, dark && styles.light]}>Configurações de Produto</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
