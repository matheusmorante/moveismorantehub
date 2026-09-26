import React, { useState } from 'react';
import {
  Modal,

  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, Link2, Unlink, Info, Settings, FileText, Images, Package, Network, X, Check, Camera, Pencil } from 'lucide-react-native';
import { generateVariationSku, parseLocalizedPrice } from '../../services/mobileProductHelpers';
import { ProductFormTechnicalTab } from './ProductFormTechnicalTab';
import { ProductVariationPhotosEditor } from '../components/ProductVariationPhotosEditor';
import { ProductFormCompositionTab } from './ProductFormCompositionTab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type VariationTabId = 'identificacao' | 'tecnico' | 'descricao' | 'fotos' | 'compostos' | 'estoque';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

export const ProductFormVariationsTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeVariationTab, setActiveVariationTab] = useState<VariationTabId>('identificacao');
  const insets = useSafeAreaInsets();

  const variations: any[] = Array.isArray(formData.variations) ? formData.variations : [];

  const handleAdd = () => {
    const parentCode = (formData.code || '000000').trim();
    const resolvedSku = generateVariationSku(parentCode, variations);
    const parentName = String(formData.name || '').trim();
    const name = `${parentName || 'Produto'} Variação ${variations.length + 1}`.trim();

    const v = {
      name,
      title: name,
      marketplaceTitle: name,
      differentiateTitle: false,
      sku: resolvedSku,
      price: parseLocalizedPrice(formData.unitPrice),
      promoPrice: parseLocalizedPrice(formData.promoPrice) || undefined,
      costPrice: parseLocalizedPrice(formData.costPrice),
      stock: 0,
      description: formData.description || '',
      width: formData.width || '',
      height: formData.height || '',
      depth: formData.depth || '',
      weight: formData.weight || '',
      status: 'hidden',
      active: true,
      syncUnitPrice: true,
      syncPromoPrice: true,
      syncCostPrice: true,
      syncFiscal: true,
      syncDescription: true,
      syncWidth: true,
      syncHeight: true,
      syncDepth: true,
      syncWeight: true,
      attributes: [],
      technicalValues: {},
      images: [],
      comboItems: [],
    };

    setFormData(prev => ({
      ...prev,
      hasVariations: true,
      variations: [...(prev.variations || []), v],
    }));
    setExpanded(variations.length);
    setActiveVariationTab('identificacao');
  };


  const updateVar = (idx: number, field: string, val: any) => {
    setFormData(prev => {
      const vars = [...(prev.variations || [])];
      vars[idx] = {
        ...vars[idx],
        [field]: val,
        ...(['price', 'promoPrice'].includes(field) ? { syncUnitPrice: false, syncPromoPrice: false } : {}),
      };
      return { ...prev, variations: vars };
    });
  };

  const toggleVariationDescription = (idx: number) => {
    setFormData(prev => {
      const vars = [...(prev.variations || [])];
      const current = vars[idx];
      const nextSyncDescription = current.syncDescription === false;
      vars[idx] = {
        ...current,
        syncDescription: nextSyncDescription,
        description: prev.description || current.description || '',
      };
      return { ...prev, variations: vars };
    });
  };

  const updateVarName = (idx: number, name: string) => {
    setFormData(prev => {
      const vars = [...(prev.variations || [])];
      const current = vars[idx];
      const titleIsSynced = current.differentiateTitle !== true;
      vars[idx] = {
        ...current,
        name,
        ...(titleIsSynced ? { title: name, marketplaceTitle: name } : {}),
      };
      return { ...prev, variations: vars };
    });
  };

  const parentCategoryIds: string[] = formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);
  const isComposition = formData.itemType === 'composition' || formData.item_type === 'composition';
  const variationTabs = [
    { id: 'identificacao' as const, label: 'Identificação', Icon: Info },
    { id: 'tecnico' as const, label: 'Características', Icon: Settings },
    { id: 'descricao' as const, label: 'Descrição', Icon: FileText },
    { id: 'fotos' as const, label: 'Fotos da Variação', Icon: Images },
    ...(isComposition ? [{ id: 'compostos' as const, label: 'Produtos Componentes', Icon: Network }] : []),
    { id: 'estoque' as const, label: 'Estoque e Precificação', Icon: Package },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.variationOverview}>
          <View style={styles.variationOverviewIcon}><Network size={19} color="#ffffff" /></View>
          <View style={styles.flex1}>
            <Text style={[styles.cardTitle, dark && styles.lightText]}>VARIAÇÕES DO PRODUTO</Text>
            <Text style={[styles.toggleDesc, dark && styles.dimText]}>
              Cada variação herda as características do produto pai e pode definir valores próprios ao editar a variação.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, dark && styles.lightText]}>Variações ({variations.length})</Text>
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!String(formData.name || '').trim()}
          style={[styles.addVariationButton, !String(formData.name || '').trim() && styles.addBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Adicionar variação"
        >
          <Plus size={14} color="#ffffff" />
          <Text style={styles.addBtnText}>Adicionar variação</Text>
        </TouchableOpacity>
      </View>

      <>
          {/* Lista de Variações */}
          {variations.length === 0 ? (
            <View style={[styles.emptyBox, dark && styles.darkCard]}>
              <Text style={styles.emptyText}>Nenhuma variação ainda. Adicione acima.</Text>
            </View>
          ) : (
            variations.map((v: any, idx: number) => {
              const parentPrice = parseLocalizedPrice(formData.unitPrice);
              const regularPrice = parseLocalizedPrice(v.syncUnitPrice !== false ? parentPrice : v.price);
              const promoPrice = parseLocalizedPrice(v.syncUnitPrice !== false ? formData.promoPrice : v.promoPrice);
              const finalPrice = promoPrice > 0 && promoPrice < regularPrice ? promoPrice : regularPrice;
              const hasDiscount = finalPrice < regularPrice;
              const variationFormData = { ...v, categoryIds: parentCategoryIds };
              const setVariationTechnicalData = (updater: (previous: any) => any) => setFormData(previous => {
                const currentVariation = previous.variations[idx];
                const updatedVariation = updater({ ...currentVariation, categoryIds: parentCategoryIds });
                const persistedVariation = { ...updatedVariation };
                delete persistedVariation.categoryIds;
                const nextVariations = [...previous.variations];
                nextVariations[idx] = persistedVariation;
                return { ...previous, variations: nextVariations };
              });
              const isOpen = expanded === idx;
              const variationImage = Array.isArray(v.images) ? v.images[0] : null;
              const openVariation = () => {
                setExpanded(idx);
                setActiveVariationTab('identificacao');
              };
              const erpReady = String(formData.name || formData.description || '').trim().length >= 2
                && parentCategoryIds.length > 0
                && Boolean(formData.mainSupplierId || formData.supplierId)
                && variations.length > 0;
              const catalogPublished = formData.status === 'published';
              const discountPercent = regularPrice > 0 && promoPrice > 0 && promoPrice < regularPrice
                ? ((regularPrice - promoPrice) / regularPrice * 100).toFixed(1)
                : '';
              const discountFixed = regularPrice > 0 && promoPrice > 0 && promoPrice < regularPrice
                ? (regularPrice - promoPrice).toFixed(2)
                : '';
              const setDiscountPercent = (value: string) => {
                const percentage = Number(value.replace(',', '.'));
                if (!value || !Number.isFinite(percentage) || percentage < 0 || regularPrice <= 0) {
                  updateVar(idx, 'promoPrice', undefined);
                  return;
                }
                updateVar(idx, 'promoPrice', Number(Math.max(0, regularPrice - regularPrice * percentage / 100).toFixed(2)));
              };
              const setDiscountFixed = (value: string) => {
                const fixed = parseLocalizedPrice(value);
                if (!value || fixed < 0 || regularPrice <= 0) {
                  updateVar(idx, 'promoPrice', undefined);
                  return;
                }
                updateVar(idx, 'promoPrice', Number(Math.max(0, regularPrice - fixed).toFixed(2)));
              };
              return (
                <View key={idx} style={[styles.varItem, dark && styles.darkCard]}>
                  {/* Header da variação */}
                  <View style={styles.varHeader}>
                    <TouchableOpacity
                      onPress={openVariation}
                      style={[styles.variationThumbnail, dark && styles.darkVariationThumbnail]}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar detalhes da variação ${v.name || v.sku}`}
                    >
                      {variationImage
                        ? <RNImage source={{ uri: variationImage }} style={styles.variationImage} resizeMode="cover" />
                        : <Camera size={17} color={dark ? '#94a3b8' : '#94a3b8'} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openVariation} style={styles.varHeaderLeft} accessibilityRole="button">
                      <View style={[styles.skuBadge, dark && styles.darkSkuBadge]}>
                        <Text style={[styles.varSku, dark && styles.lightText]}>{v.sku}</Text>
                      </View>
                      <Text style={styles.variationNameLabel}>NOME DA VARIAÇÃO</Text>
                      <Text style={[styles.varAttr, dark && styles.lightText]} numberOfLines={2}>{v.name || 'Variação'}</Text>
                    </TouchableOpacity>
                    <View style={styles.varHeaderRight}>
                      <Text style={styles.variationPriceLabel}>PREÇO VENDA</Text>
                      {hasDiscount && <Text style={styles.varRegularPrice}>R$ {regularPrice.toFixed(2).replace('.', ',')}</Text>}
                      <Text style={styles.varPrice}>R$ {finalPrice.toFixed(2).replace('.', ',')}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={openVariation}
                      style={[styles.editVariationButton, dark && styles.darkEditVariationButton]}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar características da variação ${v.name || v.sku}`}
                    >
                      <Pencil size={16} color={dark ? '#cbd5e1' : '#64748b'} />
                    </TouchableOpacity>
                  </View>

                  {/* Modal de edição da variação, equivalente ao ERP */}
                  {isOpen && (
                    <Modal
                      visible={isOpen}
                      animationType="slide"
                      presentationStyle="fullScreen"
                      onRequestClose={() => setExpanded(null)}
                    >
                    <View style={[styles.variationModalRoot, dark && styles.darkModalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <View style={styles.varEdit}>
                      <View style={styles.variationFormHeader}>
                        <View style={styles.variationHeaderTitle}>
                          <Text style={[styles.variationHeaderTitleText, dark && styles.lightText]} numberOfLines={2}>
                            Editar Variação | {formData.name || formData.description || 'Produto pai'}
                          </Text>
                          <Text style={[styles.helperText, dark && styles.dimText]}>Configure os dados específicos desta variação.</Text>
                        </View>
                        <TouchableOpacity onPress={() => setExpanded(null)} accessibilityRole="button" accessibilityLabel="Fechar edição da variação" style={styles.closeVariationButton}>
                          <X size={18} color={dark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.statusPills}>
                        <View style={[styles.statusPill, erpReady ? styles.erpReadyPill : styles.erpPendingPill]}>
                          <Text style={[styles.statusPillText, erpReady ? styles.erpReadyText : styles.erpPendingText]}>
                            ERP: {erpReady ? 'Ativo' : 'Pendente'}
                          </Text>
                        </View>
                        <View style={[styles.statusPill, catalogPublished ? styles.catalogPublishedPill : styles.catalogHiddenPill]}>
                          <Text style={[styles.statusPillText, catalogPublished ? styles.catalogPublishedText : styles.catalogHiddenText]}>
                            Catálogo: {catalogPublished ? 'Publicado' : 'Ocultado'}
                          </Text>
                        </View>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variationTabs} accessibilityRole="tablist">
                        {variationTabs.map(({ id, label, Icon }) => {
                          const selected = activeVariationTab === id;
                          return (
                            <TouchableOpacity
                              key={id}
                              onPress={() => setActiveVariationTab(id)}
                              accessibilityRole="tab"
                              accessibilityState={{ selected }}
                              style={[styles.variationTab, selected && styles.activeVariationTab]}
                            >
                              <Icon size={14} color={selected ? '#2563eb' : dark ? '#94a3b8' : '#64748b'} />
                              <Text style={[styles.variationTabText, dark && styles.dimText, selected && styles.activeVariationTabText]}>{label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                    <ScrollView
                      style={styles.variationModalBody}
                      contentContainerStyle={styles.variationModalBodyContent}
                      keyboardShouldPersistTaps="handled"
                    >

                      {activeVariationTab === 'identificacao' && (
                        <View style={styles.tabContent}>
                          {(() => {
                            const hasDistinctTitle = Boolean(v.differentiateTitle || (v.title && v.title !== v.name) || (v.marketplaceTitle && v.marketplaceTitle !== v.name));
                            return (
                              <>
                          <View style={styles.cardHeader}>
                            <Text style={[styles.sectionTitle, dark && styles.lightText]}>Identificação</Text>
                            <Text style={[styles.varSku, dark && styles.lightText]}>{v.sku}</Text>
                          </View>
                          <View style={styles.cardHeader}>
                            <Text style={[styles.label, dark && styles.dimText]}>Nome *</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const shouldDifferentiate = !hasDistinctTitle;
                                updateVar(idx, 'differentiateTitle', shouldDifferentiate);
                                updateVar(idx, 'title', shouldDifferentiate ? '' : v.name);
                                updateVar(idx, 'marketplaceTitle', shouldDifferentiate ? '' : v.name);
                              }}
                              style={[styles.titleToggle, hasDistinctTitle && styles.distinctTitleToggle]}
                              accessibilityRole="switch"
                              accessibilityState={{ checked: hasDistinctTitle }}
                            >
                              <Text style={styles.titleToggleText}>
                                {hasDistinctTitle ? 'Usando título diferente' : 'Diferenciar título no catálogo'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {(() => {
                            const parentPrefix = String(formData.name || formData.description || 'Produto').trim();
                            const currentName = String(v.name || '');
                            const suffix = currentName.toLocaleLowerCase('pt-BR').startsWith(parentPrefix.toLocaleLowerCase('pt-BR'))
                              ? currentName.slice(parentPrefix.length).replace(/^[\s\-_:]+/, '')
                              : currentName;
                            return (
                              <View style={[styles.nameInputRow, dark && styles.darkInput]}>
                                <Text style={[styles.parentName, dark && styles.dimText]} numberOfLines={1}>{parentPrefix}</Text>
                                <TextInput
                                  value={suffix}
                                  onChangeText={value => updateVarName(idx, value.trimStart() ? `${parentPrefix} ${value.trimStart()}` : parentPrefix)}
                                  placeholder="Complemento da variação"
                                  placeholderTextColor="#94a3b8"
                                  style={[styles.nameSuffixInput, dark && styles.lightText]}
                                  accessibilityLabel="Sufixo do nome da variação"
                                />
                              </View>
                            );
                          })()}
                          {hasDistinctTitle && (
                            <View>
                              <Text style={[styles.label, dark && styles.dimText]}>Título no Catálogo</Text>
                              <TextInput
                                value={String(v.title || v.marketplaceTitle || '')}
                                onChangeText={value => {
                                  updateVar(idx, 'title', value);
                                  updateVar(idx, 'marketplaceTitle', value);
                                }}
                                placeholder="Título exibido no catálogo digital"
                                placeholderTextColor="#94a3b8"
                                style={[styles.catalogTitleInput, dark && styles.darkInput, dark && styles.lightText]}
                                accessibilityLabel="Título da variação no catálogo"
                              />
                            </View>
                          )}
                              </>
                            );
                          })()}
                        </View>
                      )}

                      {activeVariationTab === 'tecnico' && (
                        <View style={styles.tabContent}>
                          <Text style={[styles.sectionTitle, dark && styles.lightText]}>Características</Text>
                          <ProductFormTechnicalTab formData={variationFormData} setFormData={setVariationTechnicalData} parentData={formData} dark={dark} />
                        </View>
                      )}

                      {activeVariationTab === 'descricao' && (
                        <View style={[styles.card, dark && styles.darkCard]}>
                          <View style={styles.cardHeader}>
                            <View style={styles.flex1}>
                              <Text style={[styles.sectionTitle, dark && styles.lightText]}>Descrição da Variação</Text>
                              <Text style={[styles.helperText, dark && styles.dimText]}>
                                {v.syncDescription !== false ? 'Sincronizada com a descrição do produto pai' : 'Descrição própria desta variação'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => toggleVariationDescription(idx)}
                              style={[styles.inheritButton, v.syncDescription !== false && styles.inheritButtonActive]}
                              accessibilityRole="switch"
                              accessibilityLabel="Sincronizar descrição com o produto pai"
                              accessibilityState={{ checked: v.syncDescription !== false }}
                            >
                              {v.syncDescription !== false ? <Link2 size={14} color="#ffffff" /> : <Unlink size={14} color="#64748b" />}
                              <Text style={[styles.inheritButtonText, v.syncDescription !== false && styles.inheritButtonTextActive]}>
                                {v.syncDescription !== false ? 'Sincronizado' : 'Manual'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {v.syncDescription !== false ? (
                            <View style={[styles.inheritedDescription, dark && styles.darkInheritedDescription]}>
                              <Text style={[styles.descriptionText, dark && styles.dimText]}>{String(formData.description || 'O produto pai ainda não tem descrição.')}</Text>
                            </View>
                          ) : (
                            <TextInput
                              value={String(v.description || '')}
                              onChangeText={value => updateVar(idx, 'description', value)}
                              placeholder="Descrição específica desta variação..."
                              placeholderTextColor="#94a3b8"
                              multiline
                              textAlignVertical="top"
                              style={[styles.descriptionInput, dark && styles.darkInput, dark && styles.lightText]}
                              accessibilityLabel="Descrição específica da variação"
                            />
                          )}
                        </View>
                      )}

                      {activeVariationTab === 'fotos' && (
                        <ProductVariationPhotosEditor
                          images={Array.isArray(v.images) ? v.images : []}
                          parentImages={Array.isArray(formData.images) ? formData.images : []}
                          onChangeImages={images => updateVar(idx, 'images', images)}
                          dark={dark}
                        />
                      )}

                      {activeVariationTab === 'compostos' && isComposition && (
                        <ProductFormCompositionTab
                          formData={variationFormData}
                          setFormData={setVariationTechnicalData}
                          dark={dark}
                          supplierId={formData.mainSupplierId || formData.supplierId}
                        />
                      )}

                      {activeVariationTab === 'estoque' && (
                        <View style={styles.tabContent}>
                          <View style={styles.cardHeader}>
                            <Text style={[styles.sectionTitle, dark && styles.lightText]}>Precificação de Venda</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const sync = v.syncUnitPrice === false;
                                setFormData(prev => {
                                  const vars = [...(prev.variations || [])];
                                  vars[idx] = {
                                    ...vars[idx],
                                    syncUnitPrice: sync,
                                    syncPromoPrice: sync,
                                    ...(sync ? { price: parseLocalizedPrice(prev.unitPrice), promoPrice: parseLocalizedPrice(prev.promoPrice) || undefined } : {}),
                                  };
                                  return { ...prev, variations: vars };
                                });
                              }}
                              style={[styles.inheritButton, v.syncUnitPrice !== false && styles.inheritButtonActive]}
                              accessibilityRole="switch"
                              accessibilityState={{ checked: v.syncUnitPrice !== false }}
                            >
                              <Text style={[styles.inheritButtonText, v.syncUnitPrice !== false && styles.inheritButtonTextActive]}>
                                {v.syncUnitPrice !== false ? 'Preço Herdado do Pai' : 'Preço Personalizado'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.pricingGrid}>
                            <View style={styles.flex1}>
                              <Text style={[styles.label, dark && styles.dimText]}>Preço de Venda</Text>
                              <TextInput
                                value={String(v.syncUnitPrice !== false ? (formData.unitPrice || 0) : (v.price ?? ''))}
                                onChangeText={val => updateVar(idx, 'price', val)}
                                editable={v.syncUnitPrice === false}
                                keyboardType="numeric"
                                placeholder="Herdado do pai"
                                style={[styles.input, dark && styles.darkInput, dark && styles.lightText, v.syncUnitPrice !== false && styles.inheritedInput]}
                              />
                            </View>
                            <View style={styles.flex1}>
                              <Text style={[styles.label, dark && styles.dimText]}>Desconto (%)</Text>
                              <TextInput
                                value={String(discountPercent)}
                                onChangeText={setDiscountPercent}
                                editable={v.syncUnitPrice === false}
                                keyboardType="numeric"
                                placeholder="0"
                                style={[styles.input, dark && styles.darkInput, dark && styles.lightText, v.syncUnitPrice !== false && styles.inheritedInput]}
                              />
                            </View>
                            <View style={styles.flex1}>
                              <Text style={[styles.label, dark && styles.dimText]}>Desconto (R$)</Text>
                              <TextInput
                                value={String(discountFixed)}
                                onChangeText={setDiscountFixed}
                                editable={v.syncUnitPrice === false}
                                keyboardType="numeric"
                                placeholder="0,00"
                                style={[styles.input, dark && styles.darkInput, dark && styles.lightText, v.syncUnitPrice !== false && styles.inheritedInput]}
                              />
                            </View>
                            <View style={styles.flex1}>
                              <Text style={[styles.label, dark && styles.dimText]}>Preço Promocional</Text>
                              <TextInput
                                value={String(v.syncUnitPrice !== false ? (formData.promoPrice || 0) : (v.promoPrice ?? ''))}
                                onChangeText={val => updateVar(idx, 'promoPrice', val)}
                                editable={v.syncUnitPrice === false}
                                keyboardType="numeric"
                                placeholder="Sem desconto"
                                style={[styles.input, dark && styles.darkInput, dark && styles.lightText, v.syncUnitPrice !== false && styles.inheritedInput]}
                              />
                            </View>
                          </View>
                        </View>
                      )}

                      
                    </ScrollView>
                    <View style={[styles.variationModalFooter, dark && styles.darkModalFooter]}>
                      <TouchableOpacity
                        onPress={() => setExpanded(null)}
                        style={styles.completeVariationButton}
                        accessibilityRole="button"
                        accessibilityLabel="Concluir edição da variação"
                      >
                        <Check size={16} color="#ffffff" />
                        <Text style={styles.completeVariationButtonText}>Concluir</Text>
                      </TouchableOpacity>
                    </View>
                    </View>
                    </Modal>
                  )}
                </View>
              );
            })
          )}
      </>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameInputRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderBottomWidth: 2, borderBottomColor: '#2563eb', backgroundColor: '#ffffff', borderRadius: 8 },
  parentName: { maxWidth: '45%', color: '#64748b', fontSize: 11, fontWeight: '800' },
  nameSuffixInput: { flex: 1, minWidth: 80, height: 40, fontSize: 12, fontWeight: '700', color: '#0f172a', paddingHorizontal: 0 },
  titleToggle: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  titleToggleText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  inheritButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#f1f5f9' },
  inheritButtonActive: { backgroundColor: '#2563eb' },
  inheritButtonText: { fontSize: 9, fontWeight: '900', color: '#64748b' },
  inheritButtonTextActive: { color: '#ffffff' },
  inheritedInput: { opacity: 0.65 },
  variationTabs: { flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: '100%', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  variationFormHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  variationHeaderTitle: { flex: 1, gap: 2 },
  variationHeaderTitleText: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  variationHeaderParent: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  closeVariationButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#f1f5f9' },
  statusPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderRadius: 20 },
  statusPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  erpReadyPill: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  erpReadyText: { color: '#1d4ed8' },
  erpPendingPill: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  erpPendingText: { color: '#b45309' },
  catalogPublishedPill: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  catalogPublishedText: { color: '#047857' },
  catalogHiddenPill: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  catalogHiddenText: { color: '#475569' },
  variationTab: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeVariationTab: { borderBottomColor: '#2563eb' },
  variationTabText: { color: '#64748b', fontSize: 9, fontWeight: '900', letterSpacing: 0.35, textTransform: 'uppercase' },
  activeVariationTabText: { color: '#2563eb' },
  tabContent: { gap: 12 },
  pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  distinctTitleToggle: { backgroundColor: '#f3e8ff' },
  catalogTitleInput: { minHeight: 42, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: '#e2e8f0', color: '#0f172a', fontSize: 12, fontWeight: '700' },
  inheritedDescription: { minHeight: 80, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' },
  darkInheritedDescription: { borderColor: '#334155', backgroundColor: '#0f172a' },
  descriptionText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  descriptionInput: { minHeight: 160, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', color: '#0f172a', fontSize: 13, lineHeight: 19 },
  helperText: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  toggleDesc: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  addVariationButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#2563eb' },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 42, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12, fontWeight: '700', color: '#0f172a' },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 12, backgroundColor: '#2563eb' },
  addBtnDisabled: { backgroundColor: '#93c5fd' },
  addBtnText: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
  emptyBox: { padding: 20, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  varItem: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', backgroundColor: '#f8fafc' },
  variationOverview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  variationOverviewIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#2563eb' },
  varHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  variationThumbnail: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', overflow: 'hidden' },
  darkVariationThumbnail: { borderColor: '#334155', backgroundColor: '#0f172a' },
  variationImage: { width: '100%', height: '100%' },
  varHeaderLeft: { flex: 1 },
  skuBadge: { alignSelf: 'flex-start', marginBottom: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#e2e8f0' },
  darkSkuBadge: { backgroundColor: '#334155' },
  varSku: { fontSize: 10, fontWeight: '900', color: '#334155', fontVariant: ['tabular-nums'] as any },
  variationNameLabel: { color: '#94a3b8', fontSize: 8, fontWeight: '900', letterSpacing: 0.45 },
  varAttr: { fontSize: 11, color: '#334155', fontWeight: '700' },
  varHeaderRight: { alignItems: 'flex-end', minWidth: 78 },
  variationPriceLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.4, color: '#94a3b8' },
  varPrice: { fontSize: 13, fontWeight: '900', color: '#059669' },
  varRegularPrice: { fontSize: 10, fontWeight: '700', color: '#ef4444', textDecorationLine: 'line-through' },
  editVariationButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#e2e8f0' },
  darkEditVariationButton: { backgroundColor: '#334155' },
  variationModalRoot: { flex: 1, backgroundColor: '#ffffff' },
  darkModalRoot: { backgroundColor: '#0f172a' },
  varEdit: { paddingHorizontal: 16, paddingTop: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  variationModalBody: { flex: 1 },
  variationModalBodyContent: { padding: 16, gap: 12 },
  variationModalFooter: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' },
  darkModalFooter: { borderTopColor: '#334155', backgroundColor: '#0f172a' },
  completeVariationButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: '#2563eb' },
  completeVariationButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  
});
