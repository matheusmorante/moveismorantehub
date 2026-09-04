import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  Flame,
  MoreVertical,
  Pencil,
  Truck,
} from 'lucide-react-native';
import { useMobileProductMetadata } from '../hooks/useMobileProductMetadata';
import { MobileProductVariationList } from './MobileProductVariationList';
import { MobileChannelBadges } from './MobileChannelBadges';
import { MobileProductActionsMenu } from './MobileProductActionsMenu';

interface Props {
  product: any;
  dark: boolean;
  onEdit: (product: any) => void;
  onToggleCatalog: (productId: string, currentStatus: string, isVariation?: boolean, varId?: string) => void;
  onToggleActive: (productId: string, currentActive: boolean) => void;
  onDelete: (productId: string, isDraft?: boolean) => void;
}

export const MobileProductCard: React.FC<Props> = ({
  product,
  dark,
  onEdit,
  onToggleCatalog,
  onToggleActive,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const variations = product.allVariations || [];
  const hasVars = variations.length > 0;
  const isParent = Boolean(product.isParent || hasVars);
  const isDraft = Boolean(product.isDraft || product.is_draft || product.status === 'draft');
  const isPublished = !isDraft && product.status === 'published';
  const isActive = !isDraft && product.active !== false && !product.deleted;

  const { oppName, supplierNames } = useMobileProductMetadata(product);

  const parentCode = product.code || product.sku || '-';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => hasVars && setExpanded(prev => !prev)}
      style={[
        styles.card,
        dark && styles.darkCard,
        isParent && (dark ? styles.darkParentCard : styles.parentCard),
        !isActive && !isDraft && styles.deactivatedCard,
      ]}
    >
      {/* Linha Superior: Botão Variações + Código + Atalhos de Ação */}
      <View style={styles.topRow}>
        <View style={styles.codeRow}>
          {hasVars && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpanded(prev => !prev)}
              style={[styles.varToggleBtn, dark && styles.darkVarToggleBtn]}
            >
              {expanded ? (
                <ChevronDown size={14} color={dark ? '#93c5fd' : '#2563eb'} />
              ) : (
                <ChevronRight size={14} color={dark ? '#93c5fd' : '#2563eb'} />
              )}
              <Text style={[styles.varToggleText, dark && styles.darkVarToggleText]}>
                Variações ({variations.length})
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.codeBadge, dark && styles.darkCodeBadge]}>
            {parentCode}
          </Text>

          {isDraft && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>Rascunho</Text>
            </View>
          )}

          {!isActive && !isDraft && (
            <View style={styles.deactivatedBadge}>
              <Text style={styles.deactivatedBadgeText}>Desativado</Text>
            </View>
          )}
        </View>

        {/* Atalhos: Editar Rápido e Menu de 3 Pontinhos */}
        <View style={styles.headerActions} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
            style={[styles.actionIconBtn, dark && styles.darkBtn]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Pencil size={14} color={dark ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              setMenuVisible(true);
            }}
            style={[styles.actionIconBtn, dark && styles.darkBtn]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MoreVertical size={15} color={dark ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Título do Produto Pai / Simples */}
      <View style={styles.titleCol}>
        <Text style={[styles.title, dark && styles.lightText, isParent && styles.parentTitle]} numberOfLines={2}>
          {product.name || product.description || 'Produto sem título'}
        </Text>

        <View style={styles.tagsRow}>
          {oppName && (
            <View style={styles.oppBadge}>
              <Flame size={10} color="#d97706" />
              <Text style={styles.oppText}>{oppName}</Text>
            </View>
          )}

          {supplierNames.map((sName, sIdx) => (
            <View key={sIdx} style={[styles.supplierBadge, dark && styles.darkBadge]}>
              <Truck size={10} color="#64748b" />
              <Text style={styles.supplierText}>{sName}</Text>
            </View>
          ))}

          {product.category && (
            <Text style={[styles.categoryBadge, dark && styles.darkCategory]}>
              {product.category}
            </Text>
          )}
        </View>
      </View>

      {/* Linha Inferior: Preço/Estoque e Status de Canais Bipartido */}
      <View style={styles.bottomRow}>
        <View style={styles.priceCol}>
          {!isParent && (
            <>
              {product.promoPrice > 0 && product.promoPrice < product.unitPrice && (
                <Text style={styles.oldPrice}>
                  R$ {product.unitPrice.toFixed(2).replace('.', ',')}
                </Text>
              )}
              <Text style={[styles.price, dark && styles.priceDark]}>
                R$ {(product.promoPrice > 0 ? product.promoPrice : product.unitPrice).toFixed(2).replace('.', ',')}
              </Text>
              <Text style={styles.stockText}>
                Estoque: <Text style={styles.stockVal}>{product.stock ?? 0}</Text>
              </Text>
            </>
          )}
        </View>

        {/* Status de Canais Bipartido */}
        <MobileChannelBadges
          dark={dark}
          isActive={isActive}
          isPublished={isPublished}
          isDraft={isDraft}
          showCatalog={!isParent}
          onToggleActive={() => onToggleActive(product.id, isActive)}
          onToggleCatalog={() => onToggleCatalog(product.id, product.status || 'published')}
        />
      </View>

      {/* Variações Filhas Expandidas */}
      {hasVars && expanded && (
        <MobileProductVariationList
          variations={variations}
          dark={dark}
          isParentDraft={isDraft}
          onToggleCatalog={(varId, st) => onToggleCatalog(product.id, st, true, varId)}
          onToggleActive={(varId, act) => onToggleActive(varId, act)}
        />
      )}

      {/* Modal de Ações dos 3 Pontinhos */}
      <MobileProductActionsMenu
        visible={menuVisible}
        dark={dark}
        product={product}
        isDraft={isDraft}
        isActive={isActive}
        onClose={() => setMenuVisible(false)}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  parentCard: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  darkParentCard: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  deactivatedCard: {
    opacity: 0.75,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  varToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  darkVarToggleBtn: {
    backgroundColor: '#1e3a8a30',
    borderColor: '#1e3a8a60',
  },
  varToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  darkVarToggleText: {
    color: '#93c5fd',
  },
  codeBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCodeBadge: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#94a3b8',
  },
  draftBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  draftBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  deactivatedBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deactivatedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtn: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  titleCol: {
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  parentTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  lightText: {
    color: '#f8fafc',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  oppBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  oppText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkBadge: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  supplierText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  darkCategory: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceCol: {
    justifyContent: 'center',
  },
  oldPrice: {
    fontSize: 10,
    color: '#ef4444',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
  },
  priceDark: {
    color: '#60a5fa',
  },
  stockText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  stockVal: {
    fontWeight: '800',
    color: '#0f172a',
  },
});
