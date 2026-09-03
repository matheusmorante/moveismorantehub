import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Package, Tag, AlertCircle } from 'lucide-react-native';

interface Props {
  variations: any[];
  dark: boolean;
  onToggleCatalog: (varId: string, currentStatus: string) => void;
}

export const MobileProductVariationList: React.FC<Props> = ({
  variations,
  dark,
  onToggleCatalog,
}) => {
  if (!variations || variations.length === 0) return null;

  return (
    <View style={[styles.container, dark && styles.darkContainer]}>
      <Text style={[styles.headerText, dark && styles.lightText]}>
        Variações ({variations.length})
      </Text>

      {variations.map((v: any, index: number) => {
        let varName = '';
        if (v.attributes && Array.isArray(v.attributes)) {
          varName = v.attributes.map((a: any) => a.value).filter(Boolean).join(' · ');
        } else if (v.attributes && typeof v.attributes === 'object') {
          varName = Object.values(v.attributes).filter(Boolean).join(' · ');
        }
        if (!varName) varName = v.name || v.displayName || `Variação #${index + 1}`;

        const isPublished = v.status === 'published';
        const imgUrl = Array.isArray(v.images) && v.images[0] ? v.images[0] : (v.imageUrl || null);
        const normalPrice = Number(v.price ?? v.unit_price ?? 0);
        const promoPrice = Number(v.promo_price ?? v.promoPrice ?? 0);
        const hasPromo = promoPrice > 0 && promoPrice < normalPrice;
        const displayPrice = hasPromo ? promoPrice : normalPrice;
        const stock = Number(v.stock ?? 0);
        const isOutOfStock = stock <= 0;

        return (
          <View key={v.id || index} style={[styles.varItem, dark && styles.darkVarItem]}>
            <View style={styles.leftRow}>
              {imgUrl ? (
                <Image source={{ uri: imgUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.placeholder, dark && styles.darkPlaceholder]}>
                  <Package size={14} color="#94a3b8" />
                </View>
              )}

              <View style={styles.infoCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.name, dark && styles.lightText]} numberOfLines={1}>
                    {varName}
                  </Text>
                  {v.active === false && (
                    <Text style={styles.disabledBadge}>Inativa</Text>
                  )}
                </View>

                <Text style={styles.sku}>
                  SKU: {v.sku && String(v.sku).includes('-') ? v.sku : (v.sku ? `${v.sku}-${String(index + 1).padStart(2, '0')}` : '-')}
                </Text>

                <View style={styles.priceStockRow}>
                  {hasPromo && (
                    <Text style={styles.oldPrice}>
                      R$ {normalPrice.toFixed(2).replace('.', ',')}
                    </Text>
                  )}
                  <Text style={[styles.price, dark && styles.priceDark]}>
                    R$ {displayPrice.toFixed(2).replace('.', ',')}
                  </Text>

                  <View style={styles.stockWrapper}>
                    {isOutOfStock ? (
                      <View style={styles.outOfStockBadge}>
                        <AlertCircle size={9} color="#ef4444" />
                        <Text style={styles.outOfStockText}>Sem estoque</Text>
                      </View>
                    ) : (
                      <Text style={styles.stock}>Estoque: {stock}</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => onToggleCatalog(v.id, v.status || 'published')}
              style={[
                styles.catalogBadge,
                isPublished ? styles.publishedBadge : styles.hiddenBadge,
              ]}
            >
              <Tag size={10} color={isPublished ? '#059669' : '#e11d48'} />
              <Text style={[styles.badgeText, { color: isPublished ? '#059669' : '#e11d48' }]}>
                {isPublished ? 'No Catálogo' : 'Oculto'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginHorizontal: -12,
    marginBottom: -12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  darkContainer: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  lightText: {
    color: '#f8fafc',
  },
  varItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  darkVarItem: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  placeholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  disabledBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  sku: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  priceStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  oldPrice: {
    fontSize: 9,
    color: '#ef4444',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  price: {
    fontSize: 11,
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
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  outOfStockText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ef4444',
  },
  catalogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  publishedBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  hiddenBadge: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
