import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { styles } from './productFormVariationsTab.styles';
import { ProductVariationTabNavigation } from './ProductVariationTabNavigation';
import type { getMobileProductVariationTabs, VariationTabId } from './productVariationTabs';

export type VariationReadinessMode = 'erp' | 'catalog';

interface Props {
  dark: boolean;
  parentName: string;
  onClose: () => void;
  erpReady: boolean;
  catalogPublished: boolean;
  isStockistOnly: boolean;
  openReadiness: VariationReadinessMode | null;
  setOpenReadiness: Dispatch<SetStateAction<VariationReadinessMode | null>>;
  tabs: ReturnType<typeof getMobileProductVariationTabs>;
  activeTab: VariationTabId;
  isInheritedDataTab: (id: VariationTabId) => boolean;
  onTabChange: (id: VariationTabId) => void;
}

export const ProductVariationEditorHeader: React.FC<Props> = ({
  dark,
  parentName,
  onClose,
  erpReady,
  catalogPublished,
  isStockistOnly,
  openReadiness,
  setOpenReadiness,
  tabs,
  activeTab,
  isInheritedDataTab,
  onTabChange,
}) => (
  <View style={styles.varEdit}>
    <View style={styles.variationFormHeader}>
      <View style={styles.variationHeaderTitle}>
        <Text
          style={[styles.variationHeaderTitleText, dark && styles.lightText]}
          numberOfLines={2}
        >
          Editar Variação | {parentName}
        </Text>
        <Text style={[styles.helperText, dark && styles.dimText]}>
          Configure os dados específicos desta variação.
        </Text>
      </View>
      <TouchableOpacity
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar edição da variação"
        style={styles.closeVariationButton}
      >
        <X size={18} color={dark ? '#94a3b8' : '#64748b'} />
      </TouchableOpacity>
    </View>
    <View style={styles.statusPills}>
      <TouchableOpacity
        hitSlop={8}
        onPress={() => setOpenReadiness((current) => (current === 'erp' ? null : 'erp'))}
        accessibilityRole="button"
        accessibilityLabel={`ERP: ${erpReady ? 'Ativo' : 'Pendente'}, abrir requisitos da variação`}
        accessibilityState={{ expanded: openReadiness === 'erp' }}
        style={[styles.statusPill, erpReady ? styles.erpReadyPill : styles.erpPendingPill]}
      >
        <Text style={[styles.statusPillText, erpReady ? styles.erpReadyText : styles.erpPendingText]}>
          ERP: {erpReady ? 'Ativo' : 'Pendente'}
        </Text>
      </TouchableOpacity>
      {!isStockistOnly && (
        <TouchableOpacity
          hitSlop={8}
          onPress={() => setOpenReadiness((current) => (current === 'catalog' ? null : 'catalog'))}
          accessibilityRole="button"
          accessibilityLabel={`Catálogo: ${catalogPublished ? 'Publicado' : 'Ocultado'}, abrir requisitos da variação`}
          accessibilityState={{ expanded: openReadiness === 'catalog' }}
          style={[
            styles.statusPill,
            catalogPublished ? styles.catalogPublishedPill : styles.catalogHiddenPill,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              catalogPublished ? styles.catalogPublishedText : styles.catalogHiddenText,
            ]}
          >
            Catálogo: {catalogPublished ? 'Publicado' : 'Ocultado'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
    <ProductVariationTabNavigation
      tabs={tabs}
      activeTab={activeTab}
      dark={dark}
      isInheritedDataTab={isInheritedDataTab}
      onTabChange={onTabChange}
    />
  </View>
);
