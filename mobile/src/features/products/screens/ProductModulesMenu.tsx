import { ChevronRight, FolderTree, Globe2, Package, Sliders } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ProductListMode } from '../components/header/ProductsHeaderModeSelector';

interface Props {
  availableModes: ProductListMode[];
  isDarkMode: boolean;
  selectMode: (mode: ProductListMode) => void;
  canViewCharacteristics: boolean;
  canViewMetaCatalog: boolean;
  onOpenCharacteristics: () => void;
  onOpenMetaCatalog: () => void;
}

export const ProductModulesMenu = ({
  availableModes,
  isDarkMode,
  selectMode,
  canViewCharacteristics,
  canViewMetaCatalog,
  onOpenCharacteristics,
  onOpenMetaCatalog,
}: Props) => {
  const productModules = [
    {
      key: 'products',
      title: 'Produtos',
      description: 'Consulte produtos e produtos compostos na mesma lista.',
      Icon: Package,
      available: availableModes.includes('standard') || availableModes.includes('composition'),
      onPress: () =>
        selectMode(availableModes.includes('standard') ? 'standard' : 'composition'),
    },
    {
      key: 'characteristics',
      title: 'Características',
      description: 'Gerencie as características e os valores usados nos produtos.',
      Icon: Sliders,
      available: canViewCharacteristics,
      onPress: onOpenCharacteristics,
    },
    {
      key: 'categories',
      title: 'Ambientes e Categorias',
      description: 'Organize os ambientes e as categorias de produtos.',
      Icon: FolderTree,
      available: availableModes.includes('categories'),
      onPress: () => selectMode('categories'),
    },
    {
      key: 'meta-catalog',
      title: 'Catálogo Meta',
      description: 'Consulte a integração do catálogo com a Meta.',
      Icon: Globe2,
      available: canViewMetaCatalog,
      onPress: onOpenMetaCatalog,
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.moduleMenuContent}>
      <Text style={[styles.moduleMenuTitle, isDarkMode && styles.lightText]}>Produtos</Text>
      <Text style={[styles.moduleMenuSubtitle, isDarkMode && styles.mutedTextDark]}>
        Escolha a área que deseja consultar.
      </Text>
      {productModules
        .filter(({ available }) => available)
        .map(({ key, title, description, Icon, onPress }) => (
          <TouchableOpacity
            key={key}
            testID={`products-module-${key}`}
            onPress={onPress}
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
