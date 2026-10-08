import { MoreVertical, Package } from 'lucide-react-native';
import React from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WEB_URL } from '../../../services/supabaseClient';
import { toMobileVariationAttributes } from '../services/mobileProductVariationActionsService';
import { MobileChannelBadges } from './MobileChannelBadges';
import { MobileProductVariationActionsMenu } from './MobileProductVariationActionsMenu';

interface MobileProductVariationCardProps {
  variation: any;
  index: number;
  dark: boolean;
  parentImage?: string | null;
  isParentDraft?: boolean;
  onToggleActive?: (varId: string, currentActive: boolean) => void;
  onToggleCatalog: (varId: string, currentStatus: string) => void;
  parentProduct?: any;
  onEdit?: (product: any) => void;
  onMoveVariation?: (variation: any, parentProduct: any) => void;
  onMergeVariation?: (variation: any, parentProduct: any) => void;
  onShowHistory?: (product: any) => void;
  onLaunchStock?: (product: any) => void;
  canChangeCatalog?: boolean;
  showCatalogStatus?: boolean;
  canPrintLabel?: boolean;
}

export const MobileProductVariationCard: React.FC<MobileProductVariationCardProps> = ({
  variation: v,
  index,
  dark,
  parentImage,
  isParentDraft = false,
  onToggleActive,
  onToggleCatalog,
  parentProduct,
  onEdit,
  onMoveVariation,
  onMergeVariation,
  canChangeCatalog = false,
  showCatalogStatus = true,
  canPrintLabel = false,
}) => {
  const [menuVisible, setMenuVisible] = React.useState(false);
  let varName = '';
  if (v.attributes && Array.isArray(v.attributes)) {
    varName = v.attributes
      .map((a: any) => a.value)
      .filter(Boolean)
      .join(' · ');
  } else if (v.attributes && typeof v.attributes === 'object') {
    varName = Object.values(v.attributes).filter(Boolean).join(' · ');
  }
  if (!varName) varName = v.name || v.displayName || `Variação #${index + 1}`;

  const isPublished = v.status === 'published';
  const isActive = v.active !== false;
  const isMerged = Boolean(v.merged_to_variation_id || v.mergedToVariationId);
  const isSalvado =
    parentProduct?.productKind === 'salvado' ||
    parentProduct?.product_kind === 'salvado' ||
    v.productKind === 'salvado' ||
    v.product_kind === 'salvado';
  const imgUrl =
    Array.isArray(v.images) && v.images[0] ? v.images[0] : v.imageUrl || parentImage || null;
  const normalPrice = Number(v.price ?? v.unit_price ?? 0);
  const promoPrice = Number(v.promo_price ?? v.promoPrice ?? 0);
  const hasPromo = promoPrice > 0 && promoPrice < normalPrice;
  const displayPrice = hasPromo ? promoPrice : normalPrice;
  const stock = Number(v.stock ?? 0);

  const handleToggleActive = () => {
    if (isSalvado) {
      Alert.alert(
        'Origem do Estoque: Salvados',
        'Produtos de origem do estoque Salvados não podem ser ativos no ERP.'
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
    if (isParentDraft) {
      Alert.alert(
        'Cadastro Pendente',
        'Este produto é um rascunho. Você deve concluir o cadastramento do produto antes de ativar ou publicar suas variações.'
      );
      return;
    }
    onToggleCatalog(v.id, v.status || 'published');
  };

  const handlePrintLabel = () => {
    const parentId = parentProduct?.id || v.productId || v.id;
    const url = `${WEB_URL}/estoque/etiquetas?cat=identificacao&productId=${parentId}&variationId=${v.id}&fillSheet=1`;
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
          <Image source={{ uri: imgUrl }} style={styles.image} resizeMode="cover" />
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
            SKU:{' '}
            {v.sku && String(v.sku).includes('-')
              ? v.sku
              : v.sku
                ? `${v.sku}-${String(index + 1).padStart(2, '0')}`
                : '-'}
          </Text>
          {isMerged && <Text style={styles.mergedBadge}>Mesclado — somente histórico</Text>}

          <View style={styles.priceStockRow}>
            {hasPromo && (
              <Text style={styles.oldPrice}>R$ {normalPrice.toFixed(2).replace('.', ',')}</Text>
            )}
            <Text style={[styles.price, dark && styles.priceDark]}>
              R$ {displayPrice.toFixed(2).replace('.', ',')}
            </Text>

            <View style={styles.stockWrapper}>
              <Text style={[styles.stock, dark && styles.darkStock]}>Estoque: {stock}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Ações da variação ${varName}`}
        >
          <MoreVertical size={17} color={dark ? '#cbd5e1' : '#64748b'} />
        </TouchableOpacity>
      </View>
      <MobileProductVariationActionsMenu
        visible={menuVisible}
        dark={dark}
        variationName={varName}
        isMerged={isMerged}
        onClose={() => setMenuVisible(false)}
        onPrintLabel={canPrintLabel && !isMerged ? handlePrintLabel : undefined}
        onEdit={onEdit && !isMerged ? () => onEdit(parentProduct || {}) : undefined}
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
      />

      {/* Linha Inferior: Status de Canais Bipartido */}
      <View style={styles.channelsRow}>
        <MobileChannelBadges
          dark={dark}
          isSalvado={isSalvado}
          isActive={isActive && !isParentDraft}
          isPublished={isPublished && !isParentDraft}
          isDraft={isParentDraft}
          disabled={isMerged}
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
