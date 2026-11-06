import type React from 'react';
import { Image as RNImage, Text, TouchableOpacity, View } from 'react-native';
import { Camera, Pencil, Trash2 } from 'lucide-react-native';
import { MergedBadge } from '../../components/MergedBadge';
import { styles } from './productFormVariationsTab.styles';

interface Props {
  variation: any;
  variationCount: number;
  shouldCheckVariationUsage: boolean;
  variationUsage: boolean | undefined;
  dark: boolean;
  hasDiscount: boolean;
  regularPrice: number;
  finalPrice: number;
  onOpen: () => void;
  onRemove: () => Promise<void>;
}

export const ProductVariationSummaryCard: React.FC<Props> = ({
  variation,
  variationCount,
  shouldCheckVariationUsage,
  variationUsage,
  dark,
  hasDiscount,
  regularPrice,
  finalPrice,
  onOpen,
  onRemove,
}) => {
  const isVariationMerged = Boolean(
    variation.is_merged ||
    variation.isMerged ||
    variation.merged_to_variation_id ||
    variation.mergedToVariationId
  );
  const variationId = String(variation.id || '');
  const usageStatus = shouldCheckVariationUsage && variationId ? variationUsage : false;
  const isUsageBlocked = Boolean(
    shouldCheckVariationUsage && variationId && usageStatus !== false
  );
  const isDeleteDisabled = variationCount <= 1 || isVariationMerged || isUsageBlocked;
  const variationImage = Array.isArray(variation.images) ? variation.images[0] : null;

  return (
    <>
      <View style={styles.varHeader}>
        <TouchableOpacity
          onPress={onOpen}
          style={[styles.variationThumbnail, dark && styles.darkVariationThumbnail]}
          accessibilityRole="button"
          accessibilityLabel={`Editar detalhes da variação ${variation.name || variation.sku}`}
        >
          {variationImage ? (
            <RNImage
              source={{ uri: variationImage }}
              style={styles.variationImage}
              resizeMode="cover"
            />
          ) : (
            <Camera size={17} color={dark ? '#94a3b8' : '#94a3b8'} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpen}
          style={styles.varHeaderLeft}
          accessibilityRole="button"
        >
          <View style={styles.varSkuRow}>
            <View style={[styles.skuBadge, dark && styles.darkSkuBadge]}>
              <Text style={[styles.varSku, dark && styles.lightText]}>{variation.sku}</Text>
            </View>
            {isVariationMerged && (
              <MergedBadge
                targetVariationId={variation.merged_to_variation_id || variation.mergedToVariationId}
                dark={dark}
                size="xs"
              />
            )}
          </View>
          <Text style={styles.variationNameLabel}>NOME DA VARIAÇÃO</Text>
          <Text style={[styles.varAttr, dark && styles.lightText]}>
            {variation.name || 'Variação'}
          </Text>
        </TouchableOpacity>
        <View style={styles.varHeaderRight}>
          <Text style={styles.variationPriceLabel}>PREÇO VENDA</Text>
          {hasDiscount && (
            <Text style={styles.varRegularPrice}>
              R$ {regularPrice.toFixed(2).replace('.', ',')}
            </Text>
          )}
          <Text style={styles.varPrice}>
            R$ {finalPrice.toFixed(2).replace('.', ',')}
          </Text>
        </View>
        <View style={styles.varHeaderActions}>
          <TouchableOpacity
            onPress={onOpen}
            style={[styles.editVariationButton, dark && styles.darkEditVariationButton]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Editar características da variação ${variation.name || variation.sku}`}
          >
            <Pencil size={16} color={dark ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void onRemove()}
            disabled={isDeleteDisabled}
            style={[
              styles.editVariationButton,
              dark && styles.darkEditVariationButton,
              isDeleteDisabled && styles.removeVariationDisabled,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={
              variationCount <= 1
                ? 'A última variação não pode ser removida'
                : isVariationMerged
                ? 'Esta variação está mesclada e não pode ser removida'
                : isUsageBlocked && usageStatus === undefined
                ? `Verificando vínculos de estoque e vendas da variação ${variation.name || variation.sku}`
                : isUsageBlocked
                ? 'A variação possui vínculos de histórico ou não foi possível verificá-los'
                : `Remover variação ${variation.name || variation.sku}`
            }
          >
            <Trash2 size={16} color={isDeleteDisabled ? '#94a3b8' : '#dc2626'} />
          </TouchableOpacity>
        </View>
      </View>
      {shouldCheckVariationUsage &&
        Boolean(variation.id) &&
        usageStatus !== false && (
          <Text style={[styles.variationDeletionStatus, dark && styles.darkVariationDeletionStatus]}>
            {usageStatus === undefined
              ? 'Verificando vínculos de estoque e vendas…'
              : 'Esta variação possui vínculos de histórico ou não foi possível verificá-los.'}
          </Text>
        )}
    </>
  );
};
