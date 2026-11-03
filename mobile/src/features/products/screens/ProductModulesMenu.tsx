import { Blocks, ChevronRight, FolderTree, Package } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ProductListMode } from '../components/header/ProductsHeaderModeSelector';

interface Props {
  availableModes: ProductListMode[];
  isDarkMode: boolean;
  selectMode: (mode: ProductListMode) => void;
}

export const ProductModulesMenu = ({ availableModes, isDarkMode, selectMode }: Props) => {
  const productModules = [
    {
      key: 'standard' as const,
      title: 'Produtos',
      description: 'Consulte e gerencie os produtos do catálogo.',
      Icon: Package,
    },
    {
      key: 'composition' as const,
      title: 'Produto composto',
      description: 'Acesse os produtos compostos cadastrados.',
      Icon: Blocks,
    },
    {
      key: 'categories' as const,
      title: 'Ambientes e Categorias',
      description: 'Organize os ambientes e as categorias de produtos.',
      Icon: FolderTree,
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.moduleMenuContent}>
      <Text style={[styles.moduleMenuTitle, isDarkMode && styles.lightText]}>Produtos</Text>
      <Text style={[styles.moduleMenuSubtitle, isDarkMode && styles.mutedTextDark]}>
        Escolha a área que deseja consultar.
      </Text>
      {productModules
        .filter(({ key }) => availableModes.includes(key))
        .map(({ key, title, description, Icon }) => (
          <TouchableOpacity
            key={key}
            testID={`products-module-${key}`}
            onPress={() => selectMode(key)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${title}`}
            style={[styles.moduleMenuCard, isDarkMode && styles.moduleMenuCardDark]}
          >
            <View style={[styles.moduleIconBox, isDarkMode && styles.moduleIconBoxDark]}>
              <Icon size={21} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
            </View>
            <View style={styles.moduleMenuCardText}>
              <Text style={[styles.moduleMenuCardTitle, isDarkMode && styles.lightText]}>
                {title}
              </Text>
              <Text
                style={[styles.moduleMenuCardDescription, isDarkMode && styles.mutedTextDark]}
              >
                {description}
              </Text>
            </View>
            <ChevronRight size={19} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  moduleMenuContent: { padding: 16, paddingBottom: 32, gap: 12 },
  moduleMenuTitle: { fontSize: 21, fontWeight: '900', color: '#0f172a' },
  moduleMenuSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: -6,
    marginBottom: 4,
  },
  moduleMenuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moduleMenuCardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  moduleIconBoxDark: { backgroundColor: 'rgba(30, 58, 138, 0.35)' },
  moduleMenuCardText: { flex: 1, gap: 3 },
  moduleMenuCardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  moduleMenuCardDescription: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  lightText: { color: '#f8fafc' },
  mutedTextDark: { color: '#94a3b8' },
});
