import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Package } from 'lucide-react-native';

interface Props {
  variations: any[];
  dark: boolean;
  isParentDraft?: boolean;
  onToggleCatalog: (varId: string, currentStatus: string) => void;
  onToggleActive?: (varId: string, currentActive: boolean) => void;
}

export const MobileProductVariationList: React.FC<Props> = ({
  variations,
  dark,
  isParentDraft = false,
  onToggleCatalog,
  onToggleActive,
}) => {
  if (!variations || variations.length === 0) return null;

  const handleToggleActive = (varId: string, currentActive: boolean) => {
    if (isParentDraft) {
      Alert.alert(
        'Cadastro Pendente',
        'Este produto é um rascunho. Você deve concluir o cadastramento do produto antes de ativar ou publicar suas variações.'
      );
      return;
    }
    if (onToggleActive) {
      onToggleActive(varId, currentActive);
    }
  };

  const handleToggleCatalog = (varId: string, currentStatus: string) => {
    if (isParentDraft) {
      Alert.alert(
        'Cadastro Pendente',
        'Este produto é um rascunho. Você deve concluir o cadastramento do produto antes de ativar ou publicar suas variações.'
      );
      return;
    }
    onToggleCatalog(varId, currentStatus);
  };

  return (
    <View style={[styles.container, dark && styles.darkContainer]}>
      <Text style={[styles.headerText, dark && styles.lightHeaderText]}>
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
        const isActive = v.active !== false;
        const imgUrl = Array.isArray(v.images) && v.images[0] ? v.images[0] : (v.imageUrl || null);
        const normalPrice = Number(v.price ?? v.unit_price ?? 0);
        const promoPrice = Number(v.promo_price ?? v.promoPrice ?? 0);
        const hasPromo = promoPrice > 0 && promoPrice < normalPrice;
        const displayPrice = hasPromo ? promoPrice : normalPrice;
        const stock = Number(v.stock ?? 0);

        return (
          <View key={v.id || index} style={[styles.varCard, dark && styles.darkVarCard]}>
            {/* Linha Superior: Foto e Info da Variação */}
            <View style={styles.topRow}>
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
                    <Text style={[styles.stock, dark && styles.darkStock]}>Estoque: {stock}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Linha Inferior: Status de Canais Bipartido (ERP e Catálogo) */}
            <View style={styles.channelsRow}>
              {/* Botão ERP Variação */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleToggleActive(v.id, isActive)}
                style={[
                  styles.bipartiteBtn,
                  isActive && !isParentDraft ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
                  dark && styles.darkBipartiteBorder,
                ]}
              >
                <View style={[styles.bipartiteTag, styles.erpTag, dark && styles.darkErpTag]}>
                  <Text style={[styles.bipartiteTagText, styles.erpTagText, dark && styles.darkErpTagText]}>ERP</Text>
                </View>
                <View style={[styles.bipartiteStatus, isActive && !isParentDraft ? styles.statusActiveBg : styles.statusInactiveBg, dark && (isActive && !isParentDraft ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg)]}>
                  <View style={[styles.statusDot, { backgroundColor: isActive && !isParentDraft ? '#10b981' : '#94a3b8' }]} />
                  <Text style={[styles.bipartiteStatusText, { color: isActive && !isParentDraft ? '#047857' : '#64748b' }]}>
                    {isActive && !isParentDraft ? 'Ativo' : 'Inativo'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Botão Catálogo Variação */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleToggleCatalog(v.id, v.status || 'published')}
                style={[
                  styles.bipartiteBtn,
                  isPublished && !isParentDraft ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
                  dark && styles.darkBipartiteBorder,
                ]}
              >
                <View style={[styles.bipartiteTag, styles.catTag, dark && styles.darkCatTag]}>
                  <Text style={[styles.bipartiteTagText, styles.catTagText, dark && styles.darkCatTagText]}>Catálogo</Text>
                </View>
                <View style={[styles.bipartiteStatus, isPublished && !isParentDraft ? styles.statusActiveBg : styles.statusInactiveBg, dark && (isPublished && !isParentDraft ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg)]}>
                  <View style={[styles.statusDot, { backgroundColor: isPublished && !isParentDraft ? '#10b981' : '#94a3b8' }]} />
                  <Text style={[styles.bipartiteStatusText, { color: isPublished && !isParentDraft ? '#047857' : '#64748b' }]}>
                    {isPublished && !isParentDraft ? 'Publicado' : 'Oculto'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  darkContainer: {
    backgroundColor: '#090d16',
    borderTopColor: '#1e293b',
  },
  headerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  lightHeaderText: {
    color: '#94a3b8',
  },
  lightText: {
    color: '#f8fafc',
  },
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
  sku: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
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
  channelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  /* Botões bipartidos */
  bipartiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bipartiteActiveBorder: {
    borderColor: '#bbf7d0',
  },
  bipartiteInactiveBorder: {
    borderColor: '#e2e8f0',
  },
  darkBipartiteBorder: {
    borderColor: '#334155',
  },
  bipartiteTag: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  erpTag: {
    backgroundColor: '#eff6ff',
    borderRightWidth: 1,
    borderRightColor: '#dbeafe',
  },
  darkErpTag: {
    backgroundColor: '#1e3a8a30',
    borderRightColor: '#1e3a8a60',
  },
  bipartiteTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  erpTagText: {
    color: '#2563eb',
  },
  darkErpTagText: {
    color: '#93c5fd',
  },
  catTag: {
    backgroundColor: '#faf5ff',
    borderRightWidth: 1,
    borderRightColor: '#f3e8ff',
  },
  darkCatTag: {
    backgroundColor: '#581c8730',
    borderRightColor: '#581c8760',
  },
  catTagText: {
    color: '#7c3aed',
  },
  darkCatTagText: {
    color: '#c084fc',
  },
  bipartiteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  statusActiveBg: {
    backgroundColor: '#f0fdf4',
  },
  darkStatusActiveBg: {
    backgroundColor: '#064e3b30',
  },
  statusInactiveBg: {
    backgroundColor: '#f8fafc',
  },
  darkStatusInactiveBg: {
    backgroundColor: '#1e293b',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  bipartiteStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
