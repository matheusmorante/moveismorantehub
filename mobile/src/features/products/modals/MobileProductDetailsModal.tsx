import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  dark: boolean;
  product: any | null;
  onClose: () => void;
}

const formatCurrency = (value: unknown) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const toAttributes = (value: unknown): Array<{ name?: string; value?: string; showName?: boolean }> => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([name, attributeValue]) => ({
    name,
    value: String(attributeValue ?? ''),
  }));
};

export const MobileProductDetailsModal: React.FC<Props> = ({
  visible,
  dark,
  product,
  onClose,
}) => {
  if (!product) return null;

  const title = product.name || product.title || product.description?.split('\n')[0] || 'Produto';
  const image = Array.isArray(product.images)
    ? product.images[0]
    : typeof product.images === 'string'
      ? product.images
      : null;
  const variations = product.allVariations || product.variations || [];
  const promoPrice = Number(product.promoPrice ?? product.promo_price ?? 0);
  const unitPrice = Number(product.unitPrice ?? product.unit_price ?? product.price ?? 0);
  const hasPromo = promoPrice > 0 && promoPrice < unitPrice;
  const attributes = toAttributes(product.attributes);
  const details = [
    ['Código', product.code || product.sku],
    ['Categoria', product.category],
    ['Marca', product.brand],
    ['Linha', product.line],
    ['Cor', product.colors || product.color],
    ['Material', product.material],
    ['Largura', product.width ? `${product.width} cm` : undefined],
    ['Altura', product.height ? `${product.height} cm` : undefined],
    ['Profundidade', product.depth ? `${product.depth} cm` : undefined],
    ['Peso', product.weight ? `${product.weight} kg` : undefined],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, dark && styles.sheetDark]}>
          <View style={[styles.header, dark && styles.borderDark]}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Detalhes do produto</Text>
              <Text style={[styles.title, dark && styles.textDark]} numberOfLines={2}>
                {title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes do produto"
              style={[styles.closeButton, dark && styles.closeButtonDark]}
            >
              <X size={18} color={dark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.productOverview}>
              <View style={[styles.imageFrame, dark && styles.imageFrameDark]}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
                ) : (
                  <Text style={[styles.noImage, dark && styles.mutedDark]}>Sem imagem</Text>
                )}
              </View>
              <View style={styles.overviewCopy}>
                <Text style={styles.price}>{formatCurrency(hasPromo ? promoPrice : unitPrice)}</Text>
                {hasPromo && (
                  <Text style={styles.oldPrice}>{formatCurrency(unitPrice)}</Text>
                )}
                <View style={styles.badges}>
                  <Text style={[styles.badge, dark && styles.badgeDark]}>
                    Estoque: {product.stock ?? 0} {product.unit || 'UN'}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      product.active === false ? styles.inactiveBadge : styles.activeBadge,
                    ]}
                  >
                    {product.active === false ? 'Inativo' : 'Ativo'}
                  </Text>
                </View>
                {product.description ? (
                  <Text style={[styles.description, dark && styles.textDark]}>
                    {product.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {details.length > 0 && (
              <View style={styles.detailGrid}>
                {details.map(([label, value]) => (
                  <View key={label} style={[styles.detailCell, dark && styles.borderDark]}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={[styles.detailValue, dark && styles.textDark]}>{value}</Text>
                  </View>
                ))}
              </View>
            )}

            {attributes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Características</Text>
                <View style={styles.badges}>
                  {attributes.map((attribute) => (
                    <Text
                      key={`${attribute.name || 'attribute'}-${attribute.value || ''}`}
                      style={styles.attributeBadge}
                    >
                      {attribute.showName === false
                        ? attribute.value
                        : `${attribute.name || 'Atributo'}: ${attribute.value || ''}`}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {variations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Variações</Text>
                {variations.map((variation: any, index: number) => {
                  const variationName =
                    variation.name ||
                    toAttributes(variation.attributes)
                      .map((attribute) => attribute.value)
                      .filter(Boolean)
                      .join(' / ') ||
                    `Variação ${index + 1}`;
                  const variationPrice =
                    variation.promoPrice ||
                    variation.promo_price ||
                    variation.unitPrice ||
                    variation.price ||
                    unitPrice;
                  return (
                    <View
                      key={variation.id || `${variation.sku}-${index}`}
                      style={[styles.variationRow, dark && styles.borderDark]}
                    >
                      <View style={styles.variationInfo}>
                        <Text style={[styles.variationName, dark && styles.textDark]}>
                          {variationName}
                        </Text>
                        <Text style={styles.detailValue}>Código: {variation.sku || '-'}</Text>
                      </View>
                      <View style={styles.variationValues}>
                        <Text style={[styles.variationPrice, dark && styles.textDark]}>
                          {formatCurrency(variationPrice)}
                        </Text>
                        <Text style={styles.detailValue}>Estoque: {variation.stock ?? 0}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.64)',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetDark: { backgroundColor: '#0f172a' },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { color: '#2563eb', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  textDark: { color: '#f1f5f9' },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  closeButtonDark: { backgroundColor: '#1e293b' },
  content: { padding: 18, paddingBottom: 34, gap: 22 },
  productOverview: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  imageFrame: {
    width: 112,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imageFrameDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  image: { width: '100%', height: '100%' },
  noImage: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  mutedDark: { color: '#94a3b8' },
  overviewCopy: { flex: 1, gap: 8 },
  price: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  oldPrice: { color: '#94a3b8', fontSize: 12, textDecorationLine: 'line-through' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    fontSize: 10,
    fontWeight: '800',
  },
  badgeDark: { color: '#cbd5e1', backgroundColor: '#1e293b' },
  activeBadge: { color: '#047857', backgroundColor: '#d1fae5' },
  inactiveBadge: { color: '#64748b', backgroundColor: '#e2e8f0' },
  description: { color: '#475569', fontSize: 12, lineHeight: 18 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  detailCell: {
    width: '50%',
    paddingVertical: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: { color: '#94a3b8', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 3 },
  section: { gap: 10 },
  sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  attributeBadge: {
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '700',
  },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  variationInfo: { flex: 1, gap: 4 },
  variationValues: { alignItems: 'flex-end', gap: 4 },
  variationName: { color: '#334155', fontSize: 12, fontWeight: '800' },
  variationPrice: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  borderDark: { borderColor: '#334155' },
});
