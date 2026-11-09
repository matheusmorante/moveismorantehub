import { ChevronLeft, X } from 'lucide-react-native';
import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './productFormScreen.styles';

interface ProductFormHeaderProps {
  dark: boolean;
  isExistingProduct: boolean;
  productCode: React.ReactNode;
  erpReady: boolean;
  isSalvado: boolean;
  catalogPublished: boolean;
  hideCatalogPublicationStatus: boolean;
  openReadiness: 'erp' | 'catalog' | null;
  onRequestClose: () => void;
  onToggleReadiness: (readiness: 'erp' | 'catalog') => void;
}

export const ProductFormHeader: React.FC<ProductFormHeaderProps> = ({
  dark,
  isExistingProduct,
  productCode,
  erpReady,
  isSalvado,
  catalogPublished,
  hideCatalogPublicationStatus,
  openReadiness,
  onRequestClose,
  onToggleReadiness,
}) => (
  <View style={[styles.header, dark && styles.darkHeader]}>
    <TouchableOpacity
      onPress={onRequestClose}
      style={[styles.backBtn, dark && styles.darkBtn]}
      accessibilityRole="button"
      accessibilityLabel="Voltar ou fechar formulário de produto"
    >
      <ChevronLeft size={20} color={dark ? '#94a3b8' : '#475569'} />
    </TouchableOpacity>
    <View style={styles.headerCenter}>
      <Text style={[styles.headerTitle, dark && styles.lightText]} numberOfLines={1}>
        {isExistingProduct ? 'Editar Produto' : 'Cadastro de Produto'}
      </Text>
      <View style={styles.headerMeta}>
        {productCode ? <Text style={styles.headerCode}>{productCode}</Text> : null}
        {!isSalvado && (
          <TouchableOpacity
            onPress={() => onToggleReadiness('erp')}
            style={[styles.statusBadge, erpReady ? styles.erpStatusReady : styles.erpStatusPending]}
            accessibilityRole="button"
            accessibilityLabel={`ERP: ${erpReady ? 'Ativo' : 'Pendente'}, abrir requisitos`}
            accessibilityState={{ expanded: openReadiness === 'erp' }}
          >
            <Text
              style={[
                styles.statusBadgeText,
                erpReady ? styles.erpStatusTextReady : styles.erpStatusTextPending,
              ]}
            >
              ERP: {erpReady ? 'Ativo' : 'Pendente'}
            </Text>
          </TouchableOpacity>
        )}
        {!hideCatalogPublicationStatus && (
          <TouchableOpacity
            onPress={() => onToggleReadiness('catalog')}
            style={[
              styles.statusBadge,
              catalogPublished ? styles.catalogStatusPublished : styles.catalogStatusHidden,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Catálogo: ${catalogPublished ? 'Publicado' : 'Ocultado'}, abrir requisitos`}
            accessibilityState={{ expanded: openReadiness === 'catalog' }}
          >
            <Text
              style={[
                styles.statusBadgeText,
                catalogPublished
                  ? styles.catalogStatusTextPublished
                  : styles.catalogStatusTextHidden,
              ]}
            >
              CATÁLOGO: {catalogPublished ? 'Publicado' : 'Ocultado'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    {!isExistingProduct && (
      <TouchableOpacity
        onPress={onRequestClose}
        style={[styles.closeBtn, dark && styles.darkBtn]}
        accessibilityRole="button"
        accessibilityLabel="Fechar formulário de produto"
      >
        <X size={18} color={dark ? '#94a3b8' : '#475569'} />
      </TouchableOpacity>
    )}
  </View>
);
