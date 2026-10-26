import { Eye, MoreVertical, Package } from 'lucide-react-native';
import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WEB_URL } from '../../../services/supabaseClient';
import { ProductImage } from '../../../components/shared/ProductImage';
import { toMobileVariationAttributes } from '../services/mobileProductVariationActionsService';
import { normalizeVariationSku } from '../domain/productSku';
import {
  getMobileProductVariationCardActionAvailability,
} from '../domain/mobileProductCardRules';
import { isNonConventionalProduct } from '../../../../../shared-utils/productActivationValidation';
import { formatBrlCurrency } from '../../../../../shared-utils/productCurrencyFormatting';
import { isSalvadoStockOrigin } from '../../../../../shared-utils/productStockOrigin';
import { MobileChannelBadges } from './MobileChannelBadges';
import { MobileProductVariationActionsMenu } from './MobileProductVariationActionsMenu';
import { MergedBadge } from './MergedBadge';
import { buildProductIdentificationLabelUrl } from '../domain/productLabelLinks';
import { canShowProductVariationActionsMenu } from '../../../../../shared-utils/productPermissions';
import { getMobileProductVariationCardName } from '../domain/mobileProductCardDisplay';

interface MobileProductVariationCardProps {
  variation: any;
  opportunityName?: string;
  index: number;
  dark: boolean;
  parentImage?: string | null;
  isParentDraft?: boolean;
  onToggleActive?: (varId: string, currentActive: boolean) => void;
  onToggleCatalog: (varId: string, currentStatus: string) => void;
  parentProduct?: any;
  onEdit?: (product: any) => void;
  canViewDetails?: boolean;
  onViewDetails?: (product: any) => void;
  onMoveVariation?: (variation: any, parentProduct: any) => void;
  onMergeVariation?: (variation: any, parentProduct: any) => void;
  onShowOrders?: (product: any) => void;
  canShowLinkedOrders?: boolean;
  canChangeCatalog?: boolean;
  showCatalogStatus?: boolean;
  canPrintLabel?: boolean;
  isLabelOnlyProfile?: boolean;
}

export const MobileProductVariationCard: React.FC<MobileProductVariationCardProps> = ({
  variation: v,
  opportunityName,
  index,
  dark,
  parentImage,
  isParentDraft = false,
  onToggleActive,
  onToggleCatalog,
  parentProduct,
  onEdit,
  canViewDetails = false,
  onViewDetails,
  onMoveVariation,
  onMergeVariation,
  onShowOrders,
  canShowLinkedOrders = false,
  canChangeCatalog = false,
  showCatalogStatus = true,
  canPrintLabel = false,
  isLabelOnlyProfile = false,
}) => {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const varName = getMobileProductVariationCardName(parentProduct, v, index);

  const isPublished = v.status === 'published';
  const isActive = v.active !== false;
  const isMerged = Boolean(v.merged_to_variation_id || v.mergedToVariationId);
  const canShowActionsMenu = canShowProductVariationActionsMenu({
    isIdentificationLabelOnlyProfile: isLabelOnlyProfile,
    canPrintIdentificationLabel: canPrintLabel,
  });
  const variationActionAvailability = getMobileProductVariationCardActionAvailability({
    canViewDetails: canViewDetails && Boolean(onViewDetails),
    isLabelOnlyProfile,
    canShowActionsMenu,
  });
  const isSalvado = isSalvadoStockOrigin(parentProduct, v, opportunityName);
  const isNonConventional =
    isNonConventionalProduct(parentProduct) || isNonConventionalProduct(v);
  const imgUrl =
    Array.isArray(v.images) && v.images[0] ? v.images[0] : v.imageUrl || parentImage || null;
  const normalPrice = Number(v.price ?? v.unit_price ?? 0);
  const promoPrice = Number(v.promo_price ?? v.promoPrice ?? 0);
  const hasPromo = promoPrice > 0 && promoPrice < normalPrice;
  const displayPrice = hasPromo ? promoPrice : normalPrice;
  const stock = Number(v.stock ?? 0);

  const handleToggleActive = () => {
    if (isNonConventional) {
      Alert.alert(
        'Status ERP indisponível',
        isSalvado
          ? 'Produtos de origem de estoque Salvados não podem ser ativados no ERP, apenas no catálogo digital.'
          : 'Produtos de origem de estoque diferente de Convencional não podem ser ativados no ERP, apenas no catálogo digital.'
      );
      return;
    }
    if (isParentDraft) {
      Alert.alert(
        'Cadastro Pendente',
        'Este produto é um rascunho. Você deve concluir o cadastramento do produto antes de ativar ou publicar suas variações.'
      );
      return;
    }
    if (onToggleActive) {
      onToggleActive(v.id, isActive);
    }
  };

  const handleToggleCatalog = () => {
    onToggleCatalog(v.id, v.status || 'published');
  };

  const handlePrintLabel = () => {
    const parentId = parentProduct?.id || v.productId || v.id;
    const url = buildProductIdentificationLabelUrl(WEB_URL, parentId, v.id);
    Linking.openURL(url).catch((err) => {
      console.warn('Falha ao abrir tela de etiquetas:', err);
      Alert.alert('Erro', 'Não foi possível abrir a tela de etiquetas.');
    });
  };

  return (
    <View style={[styles.varCard, dark && styles.darkVarCard]}>
      {/* Linha Superior: Foto e Informações */}
      <View style={styles.topRow}>
        {imgUrl ? (
          <ProductImage
            src={imgUrl}
            size="thumbnail"
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, dark && styles.darkPlaceholder]}>
            <Package size={14} color="#94a3b8" />
          </View>
        )}

        <View style={styles.infoCol}>
          <Text style={[styles.name, dark && styles.lightText]} numberOfLines={1}>
            {varName}
          </Text>

          <Text style={styles.sku}>
            SKU: {normalizeVariationSku(v.sku) || '-'}
          </Text>
          {isMerged && (
            <MergedBadge
              targetVariationId={v.merged_to_variation_id || v.mergedToVariationId}
              dark={dark}
              size="xs"
            />
          )}

          <View style={styles.priceStockRow}>
            {hasPromo && (
              <Text style={styles.oldPrice}>{formatBrlCurrency(normalPrice)}</Text>
            )}
            <Text style={[styles.price, dark && styles.priceDark]}>
              {formatBrlCurrency(displayPrice)}
            </Text>

            <View style={styles.stockWrapper}>
              <Text style={[styles.stock, dark && styles.darkStock]}>Estoque: {stock}</Text>
            </View>
          </View>
        </View>
        {variationActionAvailability.canViewDetails && onViewDetails ? (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              onViewDetails({
                ...(parentProduct || {}),
                ...v,
                id: v.id || v.variationId || parentProduct?.id,
                name: v.name || v.displayName || parentProduct?.name,
                code: v.sku || parentProduct?.code,
                sku: v.sku || parentProduct?.sku,
                description: parentProduct?.description,
                unitPrice: v.unitPrice ?? parentProduct?.unitPrice,
                promoPrice: v.promoPrice,
                stock: v.stock ?? parentProduct?.stock,
                active: v.active ?? parentProduct?.active,
                isVariation: true,
                isParent: false,
                parentId: parentProduct?.id,
                attributes: v.attributes,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Ver detalhes da variação ${varName}`}
          >
            <Eye size={17} color={dark ? '#93c5fd' : '#2563eb'} />
          </TouchableOpacity>
        ) : variationActionAvailability.canShowActionsMenu ? (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Ações da variação ${varName}`}
          >
            <MoreVertical size={17} color={dark ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>
        ) : null}
      </View>
      <MobileProductVariationActionsMenu
        visible={menuVisible && variationActionAvailability.canShowActionsMenu}
        dark={dark}
        variationName={varName}
        isMerged={isMerged}
        onClose={() => setMenuVisible(false)}
        onPrintLabel={canPrintLabel && !isMerged ? handlePrintLabel : undefined}
        onEdit={
          onEdit && !isMerged
            ? () => onEdit({ ...(parentProduct || {}), selectedVariationId: v.id })
            : undefined
        }
        onMoveToAnotherFamily={
          onMoveVariation && !isMerged && !v.isVirtual
            ? () => onMoveVariation(v, parentProduct || {})
            : undefined
        }
        onMergeWithAnotherVariation={
          onMergeVariation && !isMerged && !v.isVirtual
            ? () => onMergeVariation(v, parentProduct || {})
            : undefined
        }
        hasSupplier={Boolean(
          parentProduct?.supplierId || parentProduct?.supplier_id || parentProduct?.main_supplier_id
        )}
        hasValidAttributes={toMobileVariationAttributes(v.attributes).some(
          (attribute) => attribute.name.trim() && attribute.value.trim()
        )}
        onShowOrders={
          canShowLinkedOrders && onShowOrders && !isMerged && !isParentDraft && !v.isVirtual && v.id
            ? () =>
                onShowOrders({
                  ...parentProduct,
                  ...v,
                  id: v.id,
                  parentId: parentProduct?.id,
                  variationId: v.id,
                  isVariation: true,
                  name: varName,
                })
            : undefined
        }
      />

      {/* Linha Inferior: Status de Canais Bipartido */}
      <View style={styles.channelsRow}>
        <MobileChannelBadges
          dark={dark}
          isSalvado={isSalvado}
          isNonConventional={isNonConventional}
          isActive={isActive && !isParentDraft}
          isPublished={isPublished && !isParentDraft}
          isDraft={isParentDraft}
          disabled={isMerged}
          disabledReason={
            isMerged
              ? 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
              : undefined
          }
          showCatalog={showCatalogStatus}
          canToggleActive={Boolean(onToggleActive)}
          canToggleCatalog={canChangeCatalog}
          onToggleActive={handleToggleActive}
          onToggleCatalog={handleToggleCatalog}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  varCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  darkVarCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  image: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  placeholder: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkPlaceholder: {
    backgroundColor: '#334155',
  },
  infoCol: {
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  sku: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  mergedBadge: {
    color: '#b91c1c',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  priceStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  oldPrice: {
    fontSize: 9,
    color: '#ef4444',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  price: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  priceDark: {
    color: '#60a5fa',
  },
  stockWrapper: {
    marginLeft: 2,
  },
  stock: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  darkStock: {
    color: '#94a3b8',
  },
  lightText: {
    color: '#f8fafc',
  },
  channelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});
