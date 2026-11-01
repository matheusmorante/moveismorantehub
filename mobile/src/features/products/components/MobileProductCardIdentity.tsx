import { Package, Truck } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { ProductImage } from '../../../components/shared/ProductImage';
import { StockOriginBadge } from './StockOriginBadge';
import { styles } from './MobileProductCard.styles';

interface Props {
  product: any;
  dark: boolean;
  isParent: boolean;
  isSingleVariationCard: boolean;
  cardImage: string | null | undefined;
  displayTitle: string;
  compositionCardItems: string[];
  singleVariation: any;
  oppName: string | null;
  supplierNames: string[];
  oppBadgeInfo: { label: string; isSalvado: boolean } | null;
}

export function MobileProductCardIdentity({
  product,
  dark,
  isParent,
  isSingleVariationCard,
  cardImage,
  displayTitle,
  compositionCardItems,
  singleVariation,
  oppName,
  supplierNames,
  oppBadgeInfo,
}: Props) {
  return (
    <View style={styles.productInfoRow}>
      {(!isParent || isSingleVariationCard) &&
        (cardImage ? (
          <ProductImage
            src={cardImage}
            size="thumbnail"
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.productImagePlaceholder, dark && styles.darkProductImagePlaceholder]}
          >
            <Package size={17} color="#94a3b8" />
          </View>
        ))}
      <View style={styles.titleCol}>
        <Text
          style={[styles.title, dark && styles.lightText, isParent && styles.parentTitle]}
          numberOfLines={isSingleVariationCard ? 3 : 2}
        >
          {displayTitle}
        </Text>

        {compositionCardItems.length > 0 ? (
          <Text
            accessibilityLabel={`Componentes da composição: ${compositionCardItems.join(', ')}`}
            numberOfLines={2}
            style={[styles.compositionSummary, dark && styles.darkCompositionSummary]}
          >
            {compositionCardItems.join(' • ')}
          </Text>
        ) : null}

        <View style={styles.tagsRow}>
          {product.itemType !== 'service' && (
            <StockOriginBadge
              product={product}
              singleVariation={singleVariation}
              oppName={oppName}
              dark={dark}
              size="sm"
            />
          )}
          {product.itemType === 'composition' ? (
            <View
              style={[styles.oppBadge, { backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' }]}
            >
              <Text style={[styles.oppText, { color: '#7e22ce' }]}>Composto</Text>
            </View>
          ) : null}
          {product.itemType === 'service' ? (
            <View
              style={[styles.oppBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}
            >
              <Text style={[styles.oppText, { color: '#b45309' }]}>Serviço</Text>
            </View>
          ) : null}
          {oppBadgeInfo && !oppBadgeInfo.isSalvado ? (
            <View style={[styles.oppBadge, dark && styles.darkOppBadge]}>
              <Text style={[styles.oppText, dark && styles.darkOppText]}>
                {oppBadgeInfo.label}
              </Text>
            </View>
          ) : null}
          {supplierNames.map((sName) => (
            <View key={sName} style={[styles.supplierBadge, dark && styles.darkBadge]}>
              <Truck size={10} color="#64748b" />
              <Text style={styles.supplierText}>{sName}</Text>
            </View>
          ))}
          {product.category ? (
            <Text style={[styles.categoryBadge, dark && styles.darkCategory]}>
              {product.category}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
