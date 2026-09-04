import React, { useState, useEffect } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { ChevronDown, ChevronRight, Pencil, Trash2, Power, Flame, Truck, MoreVertical, FileText } from 'lucide-react-native';
import { MobileProductVariationList } from './MobileProductVariationList';
import { fetchOppMap, fetchSupplierMap } from '../services/mobileProductHelpers';

interface Props {
  product: any;
  dark: boolean;
  onEdit: (product: any) => void;
  onToggleCatalog: (productId: string, currentStatus: string, isVar?: boolean, varId?: string) => void;
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
  const [oppName, setOppName] = useState<string | null>(product.opportunityName || null);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);

  const variations = product.allVariations || [];
  const hasVars = variations.length > 0;
  const isParent = Boolean(product.isParent || hasVars);
  const isDraft = Boolean(product.isDraft || product.is_draft || product.status === 'draft');
  const isPublished = !isDraft && product.status === 'published';
  const isActive = !isDraft && product.active !== false && !product.deleted;

  useEffect(() => {
    let mounted = true;
    const oppId = product.opportunity_id || product.opportunityId;
    if (oppId) {
      fetchOppMap().then(map => {
        if (mounted && map[oppId]) setOppName(map[oppId]);
      });
    }

    const rawIds = [
      product.mainSupplierId,
      product.supplierId,
      product.main_supplier_id,
      product.supplier_id,
      ...(product.supplierIds || product.supplier_ids || [])
    ];
    const sIds = Array.from(new Set(rawIds.filter(Boolean))).map(String);

    if (sIds.length > 0) {
      fetchSupplierMap().then(map => {
        if (!mounted) return;
        const names: string[] = [];
        sIds.forEach(id => {
          if (map && map[id]) names.push(map[id]);
        });
        if (names.length === 0) {
          const fallback = product.supplierName || product.supplier_name || product.supplier?.name || product.supplier;
          if (fallback) names.push(String(fallback));
        }
        setSupplierNames(Array.from(new Set(names)));
      });
    } else {
      const fallback = product.supplierName || product.supplier_name || product.supplier?.name || product.supplier;
      setSupplierNames(fallback ? [String(fallback)] : []);
    }

    return () => { mounted = false; };
  }, [
    product.opportunity_id,
    product.opportunityId,
    product.mainSupplierId,
    product.supplierId,
    product.main_supplier_id,
    product.supplier_id,
    JSON.stringify(product.supplierIds || product.supplier_ids || [])
  ]);

  const handleToggleERP = (e: any) => {
    e?.stopPropagation?.();
    if (isDraft) {
      Alert.alert(
        'Produto em Rascunho',
        'Termine o cadastramento deste produto para poder ativá-lo no ERP.'
      );
      return;
    }
    onToggleActive(product.id, isActive);
  };

  const handleToggleCat = (e: any) => {
    e?.stopPropagation?.();
    if (isDraft) {
      Alert.alert(
        'Produto em Rascunho',
        'Termine o cadastramento deste produto para poder publicá-lo no Catálogo.'
      );
      return;
    }
    onToggleCatalog(product.id, product.status || 'published');
  };

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

          {isDraft && (
            <View style={styles.draftBadge}>
              <FileText size={10} color="#b45309" />
              <Text style={styles.draftText}>Rascunho</Text>
            </View>
          )}

          {!isDraft && !isActive && (
            <View style={styles.deactivatedBadge}>
              <Text style={styles.deactivatedBadgeText}>Desativado</Text>
            </View>
          )}

          {product.item_type === 'service' && <Text style={styles.serviceBadge}>Serviço</Text>}
          {product.is_combo && <Text style={styles.comboBadge}>Combo</Text>}
        </View>

        {/* Botões de Ação: Atalho Lápis + Menu de 3 Pontinhos */}
        <View style={styles.actionBtns}>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onEdit(product); }}
            style={[styles.actionIconBtn, dark && styles.darkBtn]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Pencil size={13} color={dark ? '#93c5fd' : '#2563eb'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); setMenuVisible(true); }}
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

      {/* Linha Inferior: Preço/Estoque e Status de Canais Bipartido (Alinhado ao ERP) */}
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

        {/* Status de Canais Bipartido (ERP e Catálogo) */}
        <View style={styles.channelsGroup}>
          {/* Botão ERP */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggleERP}
            style={[
              styles.bipartiteBtn,
              isActive && !isDraft ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
              dark && styles.darkBipartiteBorder,
            ]}
          >
            <View style={[styles.bipartiteTag, styles.erpTag, dark && styles.darkErpTag]}>
              <Text style={[styles.bipartiteTagText, styles.erpTagText, dark && styles.darkErpTagText]}>ERP</Text>
            </View>
            <View style={[styles.bipartiteStatus, isActive && !isDraft ? styles.statusActiveBg : styles.statusInactiveBg, dark && (isActive && !isDraft ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg)]}>
              <View style={[styles.statusDot, { backgroundColor: isActive && !isDraft ? '#10b981' : '#94a3b8' }]} />
              <Text style={[styles.bipartiteStatusText, { color: isActive && !isDraft ? '#047857' : '#64748b' }]}>
                {isActive && !isDraft ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Botão Catálogo (apenas para não-pai) */}
          {!isParent && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleCat}
              style={[
                styles.bipartiteBtn,
                isPublished && !isDraft ? styles.bipartiteActiveBorder : styles.bipartiteInactiveBorder,
                dark && styles.darkBipartiteBorder,
              ]}
            >
              <View style={[styles.bipartiteTag, styles.catTag, dark && styles.darkCatTag]}>
                <Text style={[styles.bipartiteTagText, styles.catTagText, dark && styles.darkCatTagText]}>Catálogo</Text>
              </View>
              <View style={[styles.bipartiteStatus, isPublished && !isDraft ? styles.statusActiveBg : styles.statusInactiveBg, dark && (isPublished && !isDraft ? styles.darkStatusActiveBg : styles.darkStatusInactiveBg)]}>
                <View style={[styles.statusDot, { backgroundColor: isPublished && !isDraft ? '#10b981' : '#94a3b8' }]} />
                <Text style={[styles.bipartiteStatusText, { color: isPublished && !isDraft ? '#047857' : '#64748b' }]}>
                  {isPublished && !isDraft ? 'Publicado' : 'Oculto'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
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
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuContainer, dark && styles.darkMenuContainer]}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    onEdit(product);
                  }}
                >
                  <Pencil size={18} color={dark ? '#93c5fd' : '#2563eb'} />
                  <Text style={[styles.menuItemText, dark && styles.lightText]}>Editar Produto</Text>
                </TouchableOpacity>

                {isDraft ? (
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemDanger]}
                    onPress={() => {
                      setMenuVisible(false);
                      Alert.alert(
                        'Descartar Rascunho',
                        'Deseja descartar este rascunho permanentemente?\n\nEsta ação não poderá ser desfeita.',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Descartar',
                            style: 'destructive',
                            onPress: () => onDelete(product.id, true),
                          },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={18} color="#ef4444" />
                    <Text style={[styles.menuItemText, styles.dangerText]}>Descartar Rascunho</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuVisible(false);
                        onToggleActive(product.id, isActive);
                      }}
                    >
                      <Power size={18} color={isActive ? '#dc2626' : '#16a34a'} />
                      <Text style={[styles.menuItemText, dark && styles.lightText]}>
                        {isActive ? 'Desativar Produto' : 'Reativar Produto'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.menuItem, styles.menuItemDanger]}
                      onPress={() => {
                        setMenuVisible(false);
                        Alert.alert(
                          'Excluir Produto',
                          'Deseja mover este produto para a lixeira?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: () => onDelete(product.id, false),
                            },
                          ]
                        );
                      }}
                    >
                      <Trash2 size={18} color="#ef4444" />
                      <Text style={[styles.menuItemText, styles.dangerText]}>Excluir Produto</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  varsDropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  darkVarsBtn: { backgroundColor: '#1e3a8a', borderColor: '#2563eb' },
  varsDropdownText: { fontSize: 10, fontWeight: '900', color: '#1d4ed8', textTransform: 'uppercase' },
  darkVarsText: { color: '#93c5fd' },
  codeBadge: { fontSize: 10, fontFamily: 'monospace', fontWeight: '800', color: '#64748b', backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  darkBadge: { backgroundColor: '#1e293b', color: '#cbd5e1' },
  draftBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' },
  draftText: { fontSize: 9, fontWeight: '900', color: '#b45309', textTransform: 'uppercase' },
  deactivatedBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fecdd3' },
  deactivatedBadgeText: { fontSize: 9, fontWeight: '900', color: '#dc2626', textTransform: 'uppercase' },
  serviceBadge: { fontSize: 9, fontWeight: '800', color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, textTransform: 'uppercase' },
  comboBadge: { fontSize: 9, fontWeight: '800', color: '#7c3aed', backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, textTransform: 'uppercase' },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  priceCol: { gap: 1 },
  oldPrice: { fontSize: 10, color: '#ef4444', textDecorationLine: 'line-through', fontWeight: '700' },
  price: { fontSize: 15, fontWeight: '900', color: '#2563eb' },
  priceDark: { color: '#60a5fa' },
  stockText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  stockVal: { fontWeight: '800', color: '#0f172a' },
  channelsGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  bipartiteBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  bipartiteActiveBorder: { borderColor: '#a7f3d0' },
  bipartiteInactiveBorder: { borderColor: '#cbd5e1' },
  darkBipartiteBorder: { borderColor: '#334155' },
  bipartiteTag: { paddingHorizontal: 6, paddingVertical: 3, borderRightWidth: 1 },
  erpTag: { backgroundColor: '#eff6ff', borderRightColor: '#dbeafe' },
  darkErpTag: { backgroundColor: '#1e3a8a40', borderRightColor: '#1e3a8a' },
  erpTagText: { fontSize: 9, fontWeight: '900', color: '#1e40af' },
  darkErpTagText: { color: '#93c5fd' },
  catTag: { backgroundColor: '#faf5ff', borderRightColor: '#f3e8ff' },
  darkCatTag: { backgroundColor: '#581c8740', borderRightColor: '#581c87' },
  catTagText: { fontSize: 9, fontWeight: '900', color: '#6b21a8' },
  darkCatTagText: { color: '#d8b4fe' },
  bipartiteTagText: { textTransform: 'uppercase' },
  bipartiteStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3 },
  statusActiveBg: { backgroundColor: '#ecfdf5' },
  darkStatusActiveBg: { backgroundColor: '#064e3b40' },
  statusInactiveBg: { backgroundColor: '#f1f5f9' },
  darkStatusInactiveBg: { backgroundColor: '#1e293b' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  bipartiteStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menuContainer: { width: '80%', maxWidth: 320, backgroundColor: '#ffffff', borderRadius: 16, padding: 12, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  darkMenuContainer: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  menuItemDanger: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 4, paddingTop: 12 },
  menuItemText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  dangerText: { color: '#ef4444' },
});


