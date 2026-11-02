import type React from 'react';
import { Text, View } from 'react-native';
import { formatBrlCurrency } from '../../../../../shared-utils/productCurrencyFormatting';
import { MobileChannelBadges } from './MobileChannelBadges';
import { styles } from './MobileProductCard.styles';

interface Props {
  product: any;
  dark: boolean;
  isParent: boolean;
  isSingleVariationCard: boolean;
  hasCardPromo: boolean;
  cardUnitPrice: number;
  cardPrice: number;
  cardStock: number;
  cardUnit: string;
  isLowStock: boolean;
  isSalvado: boolean;
  isNonConventional: boolean;
  isActive: boolean;
  isPublished: boolean;
  isDraft: boolean;
  showCatalog: boolean;
  canDelete: boolean;
  canChangeCatalog: boolean;
  isMerged: boolean;
  cardStatus: string;
  onToggleActive: () => void;
  onToggleCatalog: () => void;
}

export const MobileProductCardSummary: React.FC<Props> = ({
  product,
  dark,
  isParent,
  isSingleVariationCard,
  hasCardPromo,
  cardUnitPrice,
  cardPrice,
  cardStock,
  cardUnit,
  isLowStock,
  isSalvado,
  isNonConventional,
  isActive,
  isPublished,
  isDraft,
  showCatalog,
  canDelete,
  canChangeCatalog,
  isMerged,
  cardStatus,
  onToggleActive,
  onToggleCatalog,
}) => (
  <View style={styles.bottomRow}>
    {(!isParent || isSingleVariationCard) && (
      <View style={styles.priceCol}>
        {hasCardPromo && (
          <Text style={styles.oldPrice}>{formatBrlCurrency(cardUnitPrice)}</Text>
        )}
        <Text style={[styles.price, dark && styles.priceDark]}>
          {formatBrlCurrency(cardPrice)}
        </Text>
        {product.itemType !== 'service' && (
          <Text style={styles.stockText}>
            Estoque:{' '}
            <Text
              style={[
                styles.stockVal,
                isLowStock && (dark ? styles.stockValLowDark : styles.stockValLow),
              ]}
            >
              {cardStock} {cardUnit}
            </Text>
          </Text>
        )}
      </View>
    )}

    <MobileChannelBadges
      dark={dark}
      isParent={isParent && !isSingleVariationCard}
      isSalvado={isSalvado}
      isNonConventional={isNonConventional}
      isActive={isActive}
      isPublished={isPublished}
      isDraft={isDraft}
      showCatalog={showCatalog}
      canToggleActive={canDelete && !isNonConventional}
      canToggleCatalog={canChangeCatalog}
      disabled={isMerged}
      disabledReason={
        isMerged
          ? 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
          : undefined
      }
      onToggleActive={onToggleActive}
      onToggleCatalog={onToggleCatalog}
    />
  </View>
);
