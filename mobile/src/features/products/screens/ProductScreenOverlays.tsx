import type React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AttributesManagerModal } from '../modals/AttributesManagerModal';
import { MobileMergeVariationModal } from '../modals/MobileMergeVariationModal';
import { MobileMoveVariationModal } from '../modals/MobileMoveVariationModal';
import { MobileProductDetailsModal } from '../modals/MobileProductDetailsModal';
import { ProductFormModal } from '../modals/ProductFormModal';
import { ProductLinkedOrdersModal } from '../modals/ProductLinkedOrdersModal';
import { styles } from './nativeProductsScreen.styles';

interface Props {
  productForm: React.ComponentProps<typeof ProductFormModal>;
  loadingProductForEdit: boolean;
  attributesManager: React.ComponentProps<typeof AttributesManagerModal>;
  linkedOrders: React.ComponentProps<typeof ProductLinkedOrdersModal>;
  productDetails: React.ComponentProps<typeof MobileProductDetailsModal>;
  moveVariation: React.ComponentProps<typeof MobileMoveVariationModal>;
  mergeVariation: React.ComponentProps<typeof MobileMergeVariationModal>;
}

export const ProductScreenOverlays: React.FC<Props> = ({
  productForm,
  loadingProductForEdit,
  attributesManager,
  linkedOrders,
  productDetails,
  moveVariation,
  mergeVariation,
}) => (
  <>
    <ProductFormModal {...productForm} />
    {loadingProductForEdit && (
      <View style={[styles.editLoadingOverlay, productForm.dark && styles.dark]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loading}>Carregando variações do produto…</Text>
      </View>
    )}
    <AttributesManagerModal {...attributesManager} />
    <ProductLinkedOrdersModal {...linkedOrders} />
    <MobileProductDetailsModal {...productDetails} />
    <MobileMoveVariationModal {...moveVariation} />
    <MobileMergeVariationModal {...mergeVariation} />
  </>
);
