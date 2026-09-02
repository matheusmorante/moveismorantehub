import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronRight, Pencil, Trash2, Tag, Power, Flame, Truck } from 'lucide-react-native';
import { MobileProductVariationList } from './MobileProductVariationList';
import { fetchOppMap, fetchSupplierMap } from '../services/mobileProductHelpers';

interface Props {
  product: any;
  dark: boolean;
  onEdit: (product: any) => void;
  onToggleCatalog: (productId: string, currentStatus: string, isVar?: boolean, varId?: string) => void;
  onToggleActive: (productId: string, currentActive: boolean) => void;
  onDelete: (productId: string) => void;
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
  const [oppName, setOppName] = useState<string | null>(product.opportunityName || null);
  const [supplierName, setSupplierName] = useState<string | null>(product.supplierName || null);

  const variations = product.allVariations || [];
  const hasVars = variations.length > 0;
  const isParent = Boolean(product.isParent || hasVars);
  const isPublished = product.status === 'published';
  const isActive = product.active !== false && !product.deleted;
  const isDraft = Boolean(product.isDraft);

  useEffect(() => {
    let mounted = true;
    const oppId = product.opportunity_id || product.opportunityId;
    if (oppId) {
      fetchOppMap().then(map => {
        if (mounted && map[oppId]) setOppName(map[oppId]);
      });
    }
    const supId = product.supplier_id || product.supplierId || product.main_supplier_id;
    if (supId) {
      fetchSupplierMap().then(map => {
        if (mounted && map[supId]) setSupplierName(map[supId]);
      });
    }
    return () => { mounted = false; };
  }, [product.opportunity_id, product.opportunityId, product.supplier_id, product.supplierId]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => hasVars && setExpanded(prev => !prev)}
      style={[
        styles.card,
        dark && styles.darkCard,
        isParent && (dark ? styles.darkParentCard : styles.parentCard),
        !isActive && styles.deactivatedCard,
      ]}
    >
      {/* Linha Superior: Botão Variações (X) + Código do Pai + Badges de Tipo e Ações */}
      <View style={styles.topRow}>
        <View style={styles.codeRow}>
          {hasVars && (
            <TouchableOpacity
              onPress={() => setExpanded(prev => !prev)}
              style={[styles.varsDropdownBtn, dark && styles.darkVarsBtn]}
            >
              {expanded ? (
                <ChevronDown size={13} color={dark ? '#93c5fd' : '#1d4ed8'} />
              ) : (
                <ChevronRight size={13} color={dark ? '#93c5fd' : '#1d4ed8'} />
              )}
              <Text style={[styles.varsDropdownText, dark && styles.darkVarsText]}>
                Variações ({variations.length})
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.codeBadge, dark && styles.darkBadge]}>
            {product.code || product.sku || 'SEM CÓDIGO'}
          </Text>

          {product.item_type === 'service' && <Text style={styles.serviceBadge}>Serviço</Text>}
          {product.is_combo && <Text style={styles.comboBadge}>Combo</Text>}
        </View>

        <View style={styles.actionBtns}>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onEdit(product); }}
            style={[styles.actionIconBtn, dark && styles.darkBtn]}
          >
            <Pencil size={14} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onToggleActive(product.id, isActive); }}
            style={[styles.actionIconBtn, dark && styles.darkBtn]}
          >
            <Power size={14} color={isActive ? '#059669' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onDelete(product.id); }}
            style={[styles.actionIconBtn, dark && styles.darkBtn]}
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Título do Produto Pai */}
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

          {supplierName && (
            <View style={[styles.supplierBadge, dark && styles.darkBadge]}>
              <Truck size={10} color="#64748b" />
              <Text style={styles.supplierText}>{supplierName}</Text>
            </View>
          )}

          {product.category && (
            <Text style={[styles.categoryBadge, dark && styles.darkCategory]}>
              {product.category}
            </Text>
          )}
        </View>
      </View>

      {/* Linha Inferior: Preço/Estoque e Status (Alinhado ao ERP) */}
      <View style={styles.bottomRow}>
        <View style={styles.priceCol}>
          {isParent ? (
            <View style={styles.parentPriceStock}>
              <Text style={styles.dashText}>Preço: <Text style={styles.dashVal}>-</Text></Text>
              <Text style={styles.dashText}>Estoque: <Text style={styles.dashVal}>-</Text></Text>
            </View>
          ) : (
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
                Estoque: <Text style={styles.stockVal}>{product.stock}</Text>
              </Text>
            </>
          )}
        </View>

        <View style={styles.statusCol}>
          {isDraft ? (
            <View style={styles.draftBadge}><Text style={styles.draftText}>Rascunho</Text></View>
          ) : !isActive ? (
            <View style={styles.disabledBadge}><Text style={styles.disabledText}>Desativado</Text></View>
          ) : (
            <View style={styles.activeBadge}><Text style={styles.activeText}>Ativo</Text></View>
          )}

          {!isParent && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onToggleCatalog(product.id, product.status || 'published'); }}
              style={[styles.catalogBtn, isPublished ? styles.pubBtn : styles.hidBtn]}
            >
              <Tag size={11} color={isPublished ? '#059669' : '#e11d48'} />
              <Text style={[styles.catalogBtnText, { color: isPublished ? '#059669' : '#e11d48' }]}>
                {isPublished ? 'Publicado' : 'Oculto'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Variações Filhas Expandidas (Foto exibida aqui!) */}
      {hasVars && expanded && (
        <MobileProductVariationList
          variations={variations}
          dark={dark}
          onToggleCatalog={(varId, st) => onToggleCatalog(product.id, st, true, varId)}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { padding: 13, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10, gap: 9 },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  parentCard: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  darkParentCard: { backgroundColor: '#0f172a', borderColor: '#334155' },
  deactivatedCard: { opacity: 0.7 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  varsDropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  darkVarsBtn: { backgroundColor: '#1e3a8a', borderColor: '#2563eb' },
  varsDropdownText: { fontSize: 10, fontWeight: '900', color: '#1d4ed8', textTransform: 'uppercase' },
  darkVarsText: { color: '#93c5fd' },
  codeBadge: { fontSize: 10, fontFamily: 'monospace', fontWeight: '800', color: '#64748b', backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  darkBadge: { backgroundColor: '#1e293b', color: '#cbd5e1' },
  serviceBadge: { fontSize: 9, fontWeight: '800', color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, textTransform: 'uppercase' },
  comboBadge: { fontSize: 9, fontWeight: '800', color: '#7c3aed', backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, textTransform: 'uppercase' },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIconBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  darkBtn: { backgroundColor: '#334155', borderColor: '#475569' },
  titleCol: { gap: 6 },
  title: { fontSize: 14, fontWeight: '800', color: '#0f172a', lineHeight: 19 },
  parentTitle: { color: '#0f172a', fontWeight: '900' },
  lightText: { color: '#f8fafc' },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  oppBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' },
  oppText: { fontSize: 9, fontWeight: '900', color: '#b45309', textTransform: 'uppercase' },
  supplierBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  supplierText: { fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  categoryBadge: { fontSize: 9, fontWeight: '700', color: '#64748b', backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  darkCategory: { backgroundColor: '#1e293b', color: '#94a3b8' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  priceCol: { gap: 1 },
  parentPriceStock: { flexDirection: 'row', gap: 8 },
  dashText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  dashVal: { fontWeight: '900', color: '#94a3b8' },
  oldPrice: { fontSize: 10, color: '#ef4444', textDecorationLine: 'line-through', fontWeight: '700' },
  price: { fontSize: 15, fontWeight: '900', color: '#2563eb' },
  priceDark: { color: '#60a5fa' },
  stockText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  stockVal: { fontWeight: '800', color: '#0f172a' },
  statusCol: { alignItems: 'flex-end', gap: 4 },
  activeBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  activeText: { fontSize: 9, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  disabledBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  disabledText: { fontSize: 9, fontWeight: '800', color: '#dc2626', textTransform: 'uppercase' },
  draftBadge: { backgroundColor: '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  draftText: { fontSize: 9, fontWeight: '800', color: '#d97706', textTransform: 'uppercase' },
  catalogBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  pubBtn: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  hidBtn: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  catalogBtnText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});
