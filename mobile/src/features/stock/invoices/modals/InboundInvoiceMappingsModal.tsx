import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Link2, Plus, Search, Trash2, X } from 'lucide-react-native';
import * as stockService from '../../../../services/stockService';
import { SupplierFormModal } from '../../suppliers/SupplierFormModal';
import { ProductFormScreen } from '../../../products/screens/ProductFormScreen';
import { saveMobileProduct } from '../../../products/services/mobileProductMutationService';
import { Invoice } from '../../types/stock.types';
import { createInboundScorerContext, rankInboundSuggestions, type InboundScorerProduct } from '../utils/inboundDeterministicScorer';

type MappingItem = {
  itemNumber: number;
  productCode: string;
  productDescription: string;
  matchedProductId?: string;
  matchedVariationId?: string;
  productErpName?: string;
  linkedProductCode?: string;
  [key: string]: any;
};

type Supplier = { id: string; full_name: string; cpf_cnpj?: string | null };
type Product = InboundScorerProduct;
type ProductSuggestion = Product & { confidence: number; reason: string; matches: string[]; divergences: string[] };
type CompositionLink = { id: string; productId: string; variationId?: string; productErpName: string; linkedProductCode: string; sellingPrice: number; quantityMultiplier: number };

const amount = (value: unknown) => Math.max(0, Number(value) || 0);
const formatMoney = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const landedUnitCost = (item: MappingItem) => {
  const quantity = Math.max(1, amount(item.quantity));
  const extra = amount(item.ipiValue) + amount(item.icmsStValue) + amount(item.freightValue)
    + amount(item.insuranceValue) + amount(item.otherExpensesValue)
    + amount(item.totalAdditionalCosts ?? item.allocatedAdditionalCosts);
  return amount(item.unitCost) + extra / quantity;
};

interface Props {
  invoice: Invoice | null;
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const InboundInvoiceMappingsModal: React.FC<Props> = ({ invoice, visible, isDarkMode, onClose, onSaved }) => {
  const [details, setDetails] = useState<any>(null);
  const [items, setItems] = useState<MappingItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchError, setSupplierSearchError] = useState('');
  const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
  const [queries, setQueries] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<Record<number, Product[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Record<number, boolean>>({});
  const [productSearchErrors, setProductSearchErrors] = useState<Record<number, string>>({});
  const [suggestions, setSuggestions] = useState<Record<number, ProductSuggestion[]>>({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<number, boolean>>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [suggestionRetryVersion, setSuggestionRetryVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const [registrationItem, setRegistrationItem] = useState<MappingItem | null>(null);
  const [registrationDefaults, setRegistrationDefaults] = useState<Record<string, any>>();
  const [registrationParent, setRegistrationParent] = useState<any | null>(null);
  const [registrationFormVisible, setRegistrationFormVisible] = useState(false);
  const [registrationOptionsVisible, setRegistrationOptionsVisible] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<any[]>([]);
  const [parentSearchError, setParentSearchError] = useState('');
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const suggestionCache = useRef(new Map<string, Promise<Product[]>>());
  const suggestionRunKey = useRef('');

  useEffect(() => {
    if (!visible || !invoice) return;
    let active = true;
    setLoading(true);
    setErrorMessage('');
    void stockService.fetchInboundInvoiceForMappings(invoice.id)
      .then(async (result) => {
        if (!active) return;
        let mappings = new Map<string, any>();
        if (result.supplier_id && result.items.length) {
          try {
            mappings = await stockService.findInboundSupplierProductCodes(
              result.supplier_id,
              result.items.map((item: MappingItem) => item.productCode),
            );
          } catch (error) {
            console.warn('[InboundInvoiceMappings] existing supplier mappings could not be loaded', error);
          }
        }
        const linkedRefs = result.items.flatMap((item: MappingItem) => [
          ...(item.matchedProductId ? [{ productId: item.matchedProductId, variationId: item.matchedVariationId }] : []),
          ...((item.compositionLinks || []).map((link: CompositionLink) => ({ productId: link.productId, variationId: link.variationId }))),
          ...(mappings.has(item.productCode.trim().toLocaleUpperCase('pt-BR')) ? [mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'))] : []),
        ]);
        try {
          const productDetails = await stockService.fetchInboundInvoiceProductDetails(linkedRefs);
          result.items = result.items.map((item: MappingItem) => {
            const knownMapping = mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
            const itemReference = item.matchedProductId
              ? productDetails.get(`${item.matchedProductId}:${item.matchedVariationId || ''}`)
              : undefined;
            const savedMapping = knownMapping && productDetails.get(`${knownMapping.productId}:${knownMapping.variationId || ''}`);
            const compositionLinks = (item.compositionLinks || []).map((link: CompositionLink) => ({
              ...link,
              ...(productDetails.get(`${link.productId}:${link.variationId || ''}`) || {}),
            }));
            if (itemReference || savedMapping || (!item.matchedProductId && knownMapping)) {
              const detail = itemReference || savedMapping || knownMapping;
              return {
                ...item,
                ...(item.matchedProductId ? {} : { matchedProductId: detail.productId, matchedVariationId: detail.variationId }),
                productErpName: detail.name || item.productErpName,
                linkedProductCode: detail.sku || item.linkedProductCode,
                sellingPrice: detail.sellingPrice ?? item.sellingPrice,
                compositionLinks,
              };
            }
            return { ...item, compositionLinks };
          });
        } catch (error) {
          console.warn('[InboundInvoiceMappings] linked product details could not be loaded', error);
        }
        if (!active) return;
        setDetails(result);
        setItems(result.items);
        setSupplierId(result.supplier_id || '');
        setSuppliers(result.supplier ? [result.supplier as Supplier] : []);
      })
      .catch((error: any) => setErrorMessage(error?.message || 'Não foi possível carregar os dados da nota.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [visible, invoice?.id]);

  useEffect(() => {
    if (!visible || supplierSearch.trim().length < 2 || supplierId) {
      setSuppliers([]);
      setSupplierSearchError('');
      setSupplierSearchLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setSupplierSearchLoading(true);
      setSuppliers([]);
      void stockService.searchInboundInvoiceSuppliers(supplierSearch)
        .then((rows) => { if (active) { setSuppliers(rows as Supplier[]); setSupplierSearchError(''); } })
        .catch((error) => {
          console.warn('[InboundInvoiceMappings] supplier search failed', error);
          if (active) { setSuppliers([]); setSupplierSearchError('Não foi possível buscar fornecedores. Tente novamente.'); }
        })
        .finally(() => { if (active) setSupplierSearchLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [visible, supplierSearch, supplierId]);

  useEffect(() => {
    if (!registrationOptionsVisible || parentSearch.trim().length < 2) {
      setParentResults([]);
      setParentSearchError('');
      setParentSearchLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setParentSearchLoading(true);
      setParentResults([]);
      void stockService.searchInboundInvoiceProductParents(parentSearch)
        .then((rows) => { if (active) { setParentResults(rows); setParentSearchError(''); } })
        .catch((error) => {
          console.warn('[InboundInvoiceMappings] parent product search failed', error);
          if (active) { setParentResults([]); setParentSearchError('Não foi possível buscar produtos-pai. Tente novamente.'); }
        })
        .finally(() => { if (active) setParentSearchLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [registrationOptionsVisible, parentSearch]);

  useEffect(() => {
    if (!visible || !supplierId) return;
    let active = true;
    const timers = Object.entries(queries).map(([itemNumber, query]) => {
      if (query.trim().length < 2) {
        setProducts((current) => ({ ...current, [itemNumber]: [] }));
        setProductSearchErrors((current) => ({ ...current, [itemNumber]: '' }));
        setProductSearchLoading((current) => ({ ...current, [itemNumber]: false }));
        return null;
      }
      return setTimeout(() => {
        setProductSearchErrors((current) => ({ ...current, [itemNumber]: '' }));
        setProductSearchLoading((current) => ({ ...current, [itemNumber]: true }));
        setProducts((current) => ({ ...current, [itemNumber]: [] }));
        void stockService.searchInboundInvoiceProducts(query.trim())
          .then((rows) => { if (active) setProducts((current) => ({ ...current, [itemNumber]: rows as Product[] })); })
          .catch((error) => {
            console.warn('[InboundInvoiceMappings] product search failed', error);
            if (active) setProductSearchErrors((current) => ({ ...current, [itemNumber]: 'Não foi possível buscar produtos. Tente novamente.' }));
          })
          .finally(() => { if (active) setProductSearchLoading((current) => ({ ...current, [itemNumber]: false })); });
      }, 250);
    }).filter(Boolean);
    return () => { active = false; timers.forEach((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>)); };
  }, [visible, supplierId, queries]);

  useEffect(() => {
    const unresolved = items.filter((item) => !item.matchedProductId && !item.compositionLinks?.length);
    if (!visible || !supplierId || unresolved.length === 0) {
      setSuggestionsLoading(false);
      setSuggestions({});
      return;
    }
    const runKey = `${supplierId}:${JSON.stringify(unresolved.map((item) => [item.itemNumber, item.productCode, item.productDescription]))}`;
    if (suggestionRunKey.current === runKey) return;
    suggestionRunKey.current = runKey;
    setSuggestionsLoading(true);
    setSuggestionsError('');
    setDismissedSuggestions({});
    const cached = suggestionCache.current.get(supplierId);
    const catalogPromise = cached || stockService.fetchInboundInvoiceSupplierCatalog(supplierId);
    if (!cached) suggestionCache.current.set(supplierId, catalogPromise);
    let active = true;
    void catalogPromise.then((catalog) => {
      if (!active) return;
      const context = createInboundScorerContext(catalog as InboundScorerProduct[]);
      const ranked: Record<number, ProductSuggestion[]> = {};
      unresolved.forEach((item) => {
        ranked[item.itemNumber] = rankInboundSuggestions(item.productDescription || '', item.productCode, context);
      });
      setSuggestions(ranked);
    }).catch((error) => {
      suggestionCache.current.delete(supplierId);
      if (active) setSuggestionsError(error?.message || 'Falha na consulta do catálogo.');
      console.warn('[InboundInvoiceMappings] deterministic suggestions failed', error);
    }).finally(() => { if (active) setSuggestionsLoading(false); });
    return () => { active = false; };
  }, [visible, supplierId, items, suggestionRetryVersion]);

  const persist = async (nextItems: MappingItem[], nextSupplierId = supplierId) => {
    if (!details) return false;
    setSaving(true);
    setErrorMessage('');
    try {
      await stockService.updateInboundInvoiceMappings(details.id, nextSupplierId || null, nextItems);
      setItems(nextItems);
      setSupplierId(nextSupplierId);
      onSaved();
      return true;
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível salvar os vínculos.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const chooseSupplier = async (supplier: Supplier) => {
    const cleared = items.map((item) => ({
      ...item,
      matchedProductId: undefined,
      matchedVariationId: undefined,
      productErpName: undefined,
      linkedProductCode: undefined,
      sellingPrice: undefined,
      compositionLinks: [],
      linkMode: 'single' as const,
    }));
    if (await persist(cleared, supplier.id)) {
      setSupplierSearch('');
      setSuppliers([supplier]);
      return true;
    }
    return false;
  };

  const createSupplier = async (supplierData: any) => {
    const created = await stockService.saveSupplier(supplierData);
    if (!created?.id) throw new Error('O fornecedor foi salvo sem retornar um identificador.');
    if (!await chooseSupplier(created as Supplier)) throw new Error('Fornecedor criado, mas não foi possível vinculá-lo à NF-e.');
    setSupplierFormVisible(false);
  };

  const linkProduct = async (item: MappingItem, product: Product) => {
    const nextItems = items.map((current) => {
      if (current.itemNumber !== item.itemNumber) return current;
      if (current.linkMode === 'composition') {
        const links: CompositionLink[] = current.compositionLinks || [];
        if (links.some((link) => link.productId === product.productId && link.variationId === product.variationId)) return current;
        return {
          ...current,
          compositionLinks: [...links, {
            id: `${Date.now()}-${product.id}`,
            productId: product.productId,
            variationId: product.variationId,
            productErpName: product.name,
            linkedProductCode: product.sku || '',
            sellingPrice: Number(product.sellingPrice || 0),
            quantityMultiplier: 1,
          }],
        };
      }
      return { ...current, matchedProductId: product.productId, matchedVariationId: product.variationId, productErpName: product.name, linkedProductCode: product.sku || '', sellingPrice: Number(product.sellingPrice || 0) };
    });
    if (await persist(nextItems)) {
      if (item.linkMode !== 'composition') {
        try {
          await stockService.saveInboundSupplierProductCode(supplierId, item.productCode, product.productId, item.productDescription, product.variationId);
        } catch (error) {
          setErrorMessage(`Vínculo salvo, mas não foi possível memorizar o código ${item.productCode} para este fornecedor. Tente vincular novamente.`);
          console.warn('[InboundInvoiceMappings] supplier product code could not be saved', error);
        }
      }
      setQueries((current) => ({ ...current, [item.itemNumber]: '' }));
      return true;
    }
    return false;
  };

  const openQuickRegister = (item: MappingItem) => {
    setRegistrationItem(item);
    setRegistrationOptionsVisible(true);
    setParentSearch('');
    setRegistrationParent(null);
    setRegistrationDefaults({
      name: item.productDescription?.trim() || '',
      description: item.additionalDescription || '',
      itemType: 'product',
      mainSupplierId: supplierId,
      costPrice: String(landedUnitCost(item)),
      unitPrice: '',
      stock: '0',
      hasVariations: false,
      variations: [],
    });
  };

  const startNewProductRegistration = () => {
    setRegistrationParent(null);
    setRegistrationOptionsVisible(false);
    setRegistrationFormVisible(true);
  };

  const startVariationRegistration = (parent: any) => {
    setRegistrationParent({ ...parent, allVariations: parent.product_variations || [] });
    setRegistrationDefaults(undefined);
    setRegistrationOptionsVisible(false);
    setRegistrationFormVisible(true);
  };

  const saveQuickRegisteredProduct = async (productData: any) => {
    if (!registrationItem) return;
    if (registrationParent && (productData.variations || []).length <= (registrationParent.allVariations || []).length) {
      throw new Error('Adicione uma nova variação na aba Variações antes de salvar o produto existente.');
    }
    const productId = await saveMobileProduct(productData);
    if (!productId) throw new Error('Produto salvo sem identificador; atualize a busca para vinculá-lo.');
    const newVariationName = productData.variations?.[productData.variations.length - 1]?.name;
    const createdProduct = await stockService.getInboundInvoiceProductById(String(productId), newVariationName);
    const linked = await linkProduct(registrationItem, createdProduct);
    if (!linked) throw new Error('Produto cadastrado, mas não foi possível concluir o vínculo com a NF-e. Ele continua disponível na busca de produtos.');
    setRegistrationItem(null);
    setRegistrationDefaults(undefined);
    setRegistrationParent(null);
    setRegistrationFormVisible(false);
    return String(productId);
  };

  const toggleLinkMode = async (item: MappingItem, mode: 'single' | 'composition') => {
    if (item.linkMode === mode) return;
    if (mode === 'composition') {
      const links: CompositionLink[] = item.compositionLinks || [];
      const migrated = item.matchedProductId && !links.some((link) => link.productId === item.matchedProductId)
        ? [{
            id: `${Date.now()}-${item.matchedProductId}`,
            productId: item.matchedProductId,
            variationId: item.matchedVariationId,
            productErpName: item.productErpName || 'Produto vinculado',
            linkedProductCode: item.linkedProductCode || '',
            sellingPrice: amount(item.sellingPrice),
            quantityMultiplier: 1,
          }, ...links]
        : links;
      await persist(items.map((current) => current.itemNumber === item.itemNumber
        ? { ...current, linkMode: mode, compositionLinks: migrated }
        : current));
      return;
    }

    const links: CompositionLink[] = item.compositionLinks || [];
    if (links.length > 1) {
      setErrorMessage('Remova produtos da composição até restar apenas um para voltar ao modo Único.');
      return;
    }
    const first = links[0];
    await persist(items.map((current) => current.itemNumber === item.itemNumber
      ? {
          ...current,
          linkMode: mode,
          compositionLinks: [],
          matchedProductId: first?.productId || current.matchedProductId,
          matchedVariationId: first?.variationId || current.matchedVariationId,
          productErpName: first?.productErpName || current.productErpName,
          linkedProductCode: first?.linkedProductCode || current.linkedProductCode,
          sellingPrice: first?.sellingPrice || current.sellingPrice,
        }
      : current));
  };

  const removeCompositionLink = async (item: MappingItem, linkId: string) => {
    const nextItems = items.map((current) => current.itemNumber === item.itemNumber
      ? { ...current, compositionLinks: (current.compositionLinks || []).filter((link: CompositionLink) => link.id !== linkId) }
      : current);
    await persist(nextItems);
  };

  const saveCompositionMultiplier = async (item: MappingItem, linkId: string, rawValue: string) => {
    const parsed = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErrorMessage('A quantidade na composição precisa ser maior que zero.');
      return;
    }
    const nextItems = items.map((current) => current.itemNumber === item.itemNumber
      ? { ...current, compositionLinks: (current.compositionLinks || []).map((link: CompositionLink) => link.id === linkId ? { ...link, quantityMultiplier: parsed } : link) }
      : current);
    await persist(nextItems);
  };

  const removeLink = async (item: MappingItem) => {
    try {
      await stockService.deleteInboundSupplierProductCode(supplierId, item.productCode);
    } catch (error) {
      setErrorMessage('Não foi possível remover a memória do código do fornecedor. O vínculo permanece intacto. Tente novamente.');
      console.warn('[InboundInvoiceMappings] supplier product code could not be removed', error);
      return;
    }
    const nextItems = items.map((current) => current.itemNumber === item.itemNumber
      ? { ...current, matchedProductId: undefined, matchedVariationId: undefined, productErpName: undefined, linkedProductCode: undefined, sellingPrice: undefined, compositionLinks: [] }
      : current);
    await persist(nextItems);
  };

  if (!invoice) return null;
  const linkedCount = items.filter((item) => Boolean(item.matchedProductId || item.compositionLinks?.length)).length;
  const hasMatches = linkedCount > 0;
  const currentSupplier = suppliers.find((supplier) => supplier.id === supplierId);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <View style={styles.headerText}>
            <Text style={[styles.title, isDarkMode && styles.textDark]}>Gerenciar vínculos</Text>
            <Text style={[styles.subtitle, isDarkMode && styles.muted]}>NF-e #{details?.numero_nfe || invoice.number}</Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar vínculos" style={styles.closeButton}>
            <X size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator style={styles.loader} size="large" color="#2563eb" /> : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Fornecedor</Text>
              {supplierId ? (
                <>
                  <View style={styles.supplierRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.itemName, isDarkMode && styles.textDark]}>{currentSupplier?.full_name || details?.emitente_nome || 'Fornecedor vinculado'}</Text>
                      <Text style={[styles.muted, { marginTop: 3 }]}>{currentSupplier?.cpf_cnpj || details?.emitente_cnpj || ''}</Text>
                    </View>
                    {hasMatches ? <Text style={styles.lockedText}>Desvincule os itens para alterar</Text> : (
                      <TouchableOpacity onPress={() => setSupplierId('')}><Text style={styles.changeText}>Alterar</Text></TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity style={styles.createAction} disabled={hasMatches} onPress={() => setSupplierFormVisible(true)}>
                    <Text style={[styles.changeText, hasMatches && styles.disabledAction]}>+ Novo fornecedor</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.muted, { marginBottom: 10 }]}>Selecione o fornecedor para habilitar os vínculos dos produtos.</Text>
                  <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
                    <Search size={17} color="#94a3b8" />
                    <TextInput value={supplierSearch} onChangeText={setSupplierSearch} placeholder="Buscar fornecedor" placeholderTextColor="#94a3b8" style={[styles.input, isDarkMode && styles.textDark]} />
                  </View>
                  {supplierSearchLoading ? <ActivityIndicator style={{ margin: 12 }} color="#2563eb" /> : null}
                  {supplierSearchError ? <Text style={styles.errorText}>{supplierSearchError}</Text> : null}
                  {suppliers.map((supplier) => (
                    <TouchableOpacity key={supplier.id} style={styles.resultRow} onPress={() => void chooseSupplier(supplier)}>
                      <Text style={[styles.itemName, isDarkMode && styles.textDark]}>{supplier.full_name}</Text>
                      <Text style={styles.muted}>{supplier.cpf_cnpj || ''}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.createAction} onPress={() => setSupplierFormVisible(true)}>
                    <Text style={styles.changeText}>+ Novo fornecedor</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Itens da NF ({items.length})</Text>
              <Text style={styles.muted}>{linkedCount} vinculados · {items.length - linkedCount} sem vínculo</Text>
            </View>

            {items.map((item) => {
              const composition: CompositionLink[] = item.compositionLinks || [];
              const isComposition = item.linkMode === 'composition';
              const hasItemLink = Boolean(item.matchedProductId || composition.length);
              const quantity = Math.max(1, amount(item.quantity));
      const totalLandedCost = landedUnitCost(item) * quantity;
              const totalBaseCost = amount(item.unitCost) * quantity;
              const compositionWeight = composition.reduce((total, link) => total + amount(link.sellingPrice) * Math.max(1, amount(link.quantityMultiplier)), 0);
              let apportionedBeforeLast = 0;

              return (
                <View key={item.itemNumber} style={[styles.section, isDarkMode && styles.sectionDark]}>
                  <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>{item.itemNumber}. {item.productDescription}</Text>
                  {item.additionalDescription ? <Text style={[styles.muted, styles.description]}>{item.additionalDescription}</Text> : null}
                  <Text style={[styles.muted, styles.description]}>{quantity} {item.unit || 'UN'} · Cód. forn.: {item.productCode || '—'}</Text>
                  <View style={styles.costRow}>
                    <View style={styles.costCell}>
                      <Text style={styles.costLabel}>Unitário</Text>
                      <Text style={styles.costValue}>{formatMoney(amount(item.unitCost))} → <Text style={styles.costLanded}>{formatMoney(landedUnitCost(item))}</Text></Text>
                    </View>
                    <View style={styles.costCell}>
                      <Text style={styles.costLabel}>Total</Text>
                      <Text style={styles.costValue}>{formatMoney(amount(item.totalCost))} → <Text style={styles.costLanded}>{formatMoney(totalLandedCost)}</Text></Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.detailsToggle}
                    onPress={() => setExpandedItems((current) => ({ ...current, [item.itemNumber]: !current[item.itemNumber] }))}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: Boolean(expandedItems[item.itemNumber]) }}
                  >
                    <Text style={styles.detailsToggleText}>{expandedItems[item.itemNumber] ? 'Ocultar detalhes da NF' : 'Ver detalhes da NF'}</Text>
                  </TouchableOpacity>
                  {expandedItems[item.itemNumber] ? (
                    <View style={[styles.detailsPanel, isDarkMode && styles.detailsPanelDark]}>
                      <Text style={[styles.detailsTitle, isDarkMode && styles.textDark]}>Dados fiscais e financeiros</Text>
                      <Text style={[styles.detailsSubtitle, isDarkMode && styles.muted]}>Valores do item</Text>
                      {[
                        ['Mercadoria', amount(item.unitCost), amount(item.totalCost)],
                        ['Desconto', amount(item.discountValue) / quantity, amount(item.discountValue)],
                        ['Frete', amount(item.freightValue) / quantity, amount(item.freightValue)],
                        ['IPI', amount(item.ipiValue) / quantity, amount(item.ipiValue)],
                        ['Seguro', amount(item.insuranceValue) / quantity, amount(item.insuranceValue)],
                        ['Outras despesas acessórias', amount(item.otherExpensesValue) / quantity, amount(item.otherExpensesValue)],
                        ['Valor final', (amount(item.totalCost) + amount(item.ipiValue) + amount(item.freightValue) + amount(item.insuranceValue) + amount(item.otherExpensesValue) - amount(item.discountValue)) / quantity,
                          amount(item.totalCost) + amount(item.ipiValue) + amount(item.freightValue) + amount(item.insuranceValue) + amount(item.otherExpensesValue) - amount(item.discountValue)],
                      ].map(([label, unitValue, totalValue]) => (
                        <View key={String(label)} style={styles.detailLine}>
                          <Text style={[styles.muted, String(label) === 'Valor final' && styles.detailEmphasis]}>{String(label)}</Text>
                          <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{String(label) === 'Desconto' ? `− ${formatMoney(Number(unitValue))} / − ${formatMoney(Number(totalValue))}` : `${formatMoney(Number(unitValue))} / ${formatMoney(Number(totalValue))}`}</Text>
                        </View>
                      ))}
                      <Text style={[styles.detailsSubtitle, isDarkMode && styles.muted]}>Classificação fiscal</Text>
                      {[
                        ['EAN', item.ean || item.eanTrib], ['NCM', item.ncm], ['CEST', item.cest], ['CFOP', item.cfop],
                      ].map(([label, value]) => (
                        <View key={String(label)} style={styles.detailLine}><Text style={styles.muted}>{label}</Text><Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{String(value || '—')}</Text></View>
                      ))}
                      <Text style={[styles.detailsSubtitle, isDarkMode && styles.muted]}>Tributos extraídos da NF-e</Text>
                      {[
                        ['ICMS', item.icmsCst, item.icmsPercent, item.icmsValue], ['ICMS ST', null, item.icmsStPercent, item.icmsStValue],
                        ['IPI', item.ipiCst, item.ipiPercent, item.ipiValue], ['PIS', item.pisCst, item.pisPercent, item.pisValue],
                        ['COFINS', item.cofinsCst, item.cofinsPercent, item.cofinsValue], ['IBS', item.ibsCst, null, item.ibsValue],
                        ['CBS', item.cbsCst, null, item.cbsValue], ['FCP', null, null, item.fcpValue], ['FCP ST', null, null, item.fcpStValue],
                      ].map(([label, cst, percent, value]) => (
                        <View key={String(label)} style={styles.detailLine}>
                          <Text style={styles.muted}>{label}</Text>
                          <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{[cst, percent !== undefined ? `${Number(percent || 0).toFixed(2)}%` : null, formatMoney(amount(value))].filter(Boolean).join(' · ') || '—'}</Text>
                        </View>
                      ))}
                      <View style={styles.detailLine}><Text style={styles.muted}>Origem ICMS · base ICMS / ST</Text><Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{[item.icmsOrigem || '—', formatMoney(amount(item.icmsBaseValue)), formatMoney(amount(item.icmsStBaseValue))].join(' · ')}</Text></View>
                      <View style={styles.detailLine}><Text style={styles.muted}>Total de tributos</Text><Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{formatMoney(amount(item.totalTaxes))}</Text></View>
                      <View style={styles.detailLine}><Text style={styles.muted}>Custos adicionais rateados</Text><Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{formatMoney(amount(item.totalAdditionalCosts ?? item.allocatedAdditionalCosts))}</Text></View>
                    </View>
                  ) : null}

                  <View style={[styles.linkSection, isDarkMode && styles.linkSectionDark]}>
                    <View style={styles.linkHeader}>
                      <Text style={[styles.linkTitle, isDarkMode && styles.textDark]}>{isComposition ? 'Vincular produtos' : 'Vincular produto'}</Text>
                      <View style={styles.modeSwitch}>
                        <TouchableOpacity disabled={saving || (isComposition && composition.length > 1)} onPress={() => void toggleLinkMode(item, 'single')} style={[styles.modeButton, !isComposition && styles.modeButtonActive]}>
                          <Text style={[styles.modeText, !isComposition && styles.modeTextActive]}>Único</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={saving} onPress={() => void toggleLinkMode(item, 'composition')} style={[styles.modeButton, isComposition && styles.modeButtonActive]}>
                          <Text style={[styles.modeText, isComposition && styles.modeTextActive]}>Composição</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!supplierId ? <Text style={styles.lockedText}>Vincule o fornecedor antes de identificar ou cadastrar produtos.</Text> : (
                      <>
                        {isComposition ? composition.map((link, index) => {
                          const share = compositionWeight > 0 ? amount(link.sellingPrice) * Math.max(1, amount(link.quantityMultiplier)) / compositionWeight : 0;
                          const allocated = index === composition.length - 1
                          ? Math.max(0, totalBaseCost - apportionedBeforeLast)
                            : Math.round(totalBaseCost * share * 100) / 100;
                          if (index < composition.length - 1) apportionedBeforeLast += allocated;
                          return (
                            <View key={link.id} style={styles.linkedRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.linkedName}>{link.productErpName}</Text>
                                <Text style={styles.linkedCode}>SKU: {link.linkedProductCode || '—'} · Venda {formatMoney(amount(link.sellingPrice))} · Custo rateado {formatMoney(allocated)}</Text>
                              </View>
                              <TextInput
                                key={`${item.itemNumber}:${link.id}:${link.quantityMultiplier}`}
                                defaultValue={String(link.quantityMultiplier || 1)}
                                keyboardType="decimal-pad"
                                accessibilityLabel={`Quantidade de ${link.productErpName} na composição`}
                                style={[styles.multiplierInput, isDarkMode && styles.multiplierInputDark]}
                                onEndEditing={(event) => void saveCompositionMultiplier(item, link.id, event.nativeEvent.text)}
                              />
                              <TouchableOpacity disabled={saving} onPress={() => void removeCompositionLink(item, link.id)} style={styles.removeButton} accessibilityLabel={`Remover ${link.productErpName} da composição`}>
                                <Trash2 size={18} color="#dc2626" />
                              </TouchableOpacity>
                            </View>
                          );
                        }) : item.matchedProductId ? (
                          <View style={styles.linkedRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.linkedName}>{item.productErpName || 'Produto vinculado'}</Text>
                              <Text style={styles.linkedCode}>SKU: {item.linkedProductCode || '—'} · Venda: {formatMoney(amount(item.sellingPrice))} · Custo: {formatMoney(totalBaseCost)}</Text>
                            </View>
                            <TouchableOpacity disabled={saving} onPress={() => void removeLink(item)} style={styles.removeButton} accessibilityLabel={`Remover vínculo do item ${item.itemNumber}`}>
                              <Trash2 size={18} color="#dc2626" />
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        {(!hasItemLink || isComposition) ? (
                          <>
                            {!isComposition ? (
                              <TouchableOpacity style={styles.registerButton} onPress={() => openQuickRegister(item)} disabled={saving}>
                                <Plus size={16} color="#2563eb" /><Text style={styles.registerButtonText}>Cadastrar produto</Text>
                              </TouchableOpacity>
                            ) : null}
                            {!isComposition && (suggestions[item.itemNumber] || []).length > 0 && !dismissedSuggestions[item.itemNumber] ? (
                              <View style={[styles.suggestionCard, isDarkMode && styles.suggestionCardDark]}>
                                <Text style={styles.suggestionEyebrow}>Sugestão automática · confirme antes de vincular</Text>
                                {suggestions[item.itemNumber].map((candidate, index) => (
                                  <View key={`${candidate.productId}:${candidate.variationId || ''}`} style={styles.suggestionRow}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.itemName, isDarkMode && styles.textDark]}>{candidate.name}</Text>
                                      <Text style={styles.muted}>SKU: {candidate.sku || '—'} · Venda: {formatMoney(amount(candidate.sellingPrice))} · Confiança {candidate.confidence}%{index === 0 ? ' · Melhor correspondência' : ''}</Text>
                                      {candidate.divergences.length ? <Text style={styles.error}>{candidate.divergences[0]}</Text> : null}
                                    </View>
                                    <TouchableOpacity disabled={saving} onPress={() => void linkProduct(item, candidate)} style={styles.suggestionLinkButton}>
                                      <Link2 size={15} color="#fff" /><Text style={styles.suggestionLinkText}>Vincular</Text>
                                    </TouchableOpacity>
                                  </View>
                                ))}
                                <TouchableOpacity onPress={() => setDismissedSuggestions((current) => ({ ...current, [item.itemNumber]: true }))} style={styles.ignoreButton}>
                                  <Text style={styles.muted}>Ignorar sugestões</Text>
                                </TouchableOpacity>
                              </View>
                            ) : null}
                            <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
                              <Search size={17} color="#94a3b8" />
                              <TextInput
                                value={queries[item.itemNumber] || ''}
                                onChangeText={(value) => setQueries((current) => ({ ...current, [item.itemNumber]: value }))}
                                placeholder={isComposition ? 'Adicionar produto à composição...' : 'Buscar produto por nome ou SKU'}
                                placeholderTextColor="#94a3b8"
                                style={[styles.input, isDarkMode && styles.textDark]}
                              />
                            </View>
                            {productSearchErrors[item.itemNumber] ? <Text style={[styles.error, { marginTop: 8 }]}>{productSearchErrors[item.itemNumber]}</Text> : null}
                            {productSearchLoading[item.itemNumber] ? <ActivityIndicator style={{ margin: 12 }} color="#2563eb" /> : null}
                            {(products[item.itemNumber] || []).map((product) => (
                              <TouchableOpacity key={`${product.productId}:${product.variationId || 'product'}`} disabled={saving} style={styles.resultRow} onPress={() => void linkProduct(item, product)}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.itemName, isDarkMode && styles.textDark]}>{product.name}</Text>
                                  <Text style={styles.muted}>SKU: {product.sku || '—'} · Venda: {formatMoney(amount(product.sellingPrice))}</Text>
                                </View>
                                <Link2 size={18} color="#2563eb" />
                              </TouchableOpacity>
                            ))}
                            {(queries[item.itemNumber] || '').trim().length >= 2 && !productSearchLoading[item.itemNumber] && !productSearchErrors[item.itemNumber] && (products[item.itemNumber] || []).length === 0 && !saving ? (
                              <Text style={[styles.muted, { marginTop: 10 }]}>Nenhum produto encontrado.</Text>
                            ) : null}
                            {isComposition && composition.length === 0 ? <Text style={styles.lockedText}>Adicione ao menos um produto para formar a composição.</Text> : null}
                          </>
                        ) : null}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {suggestionsLoading ? <Text style={[styles.muted, { textAlign: 'center' }]}>Analisando sugestões de vínculo...</Text> : null}
            {suggestionsError ? <TouchableOpacity onPress={() => { suggestionRunKey.current = ''; setSuggestionRetryVersion((current) => current + 1); }} style={styles.retrySuggestion}><Text style={styles.changeText}>Não foi possível analisar sugestões · Tentar novamente</Text><Text style={styles.muted}>{suggestionsError}</Text></TouchableOpacity> : null}
            {saving ? <ActivityIndicator style={{ margin: 12 }} color="#2563eb" /> : null}
            <TouchableOpacity style={styles.doneButton} onPress={onClose}><Check size={18} color="#fff" /><Text style={styles.doneText}>Concluir</Text></TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
      <SupplierFormModal
        visible={supplierFormVisible}
        isDarkMode={isDarkMode}
        onClose={() => setSupplierFormVisible(false)}
        onSave={createSupplier}
      />
      <Modal visible={registrationOptionsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setRegistrationOptionsVisible(false); setRegistrationItem(null); }}>
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
          <View style={[styles.header, isDarkMode && styles.headerDark]}>
            <Text style={[styles.title, isDarkMode && styles.textDark]}>Cadastrar produto vinculado à NF-e</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => { setRegistrationOptionsVisible(false); setRegistrationItem(null); }}><X size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.muted, isDarkMode && styles.textDark]}>Item {registrationItem?.itemNumber}: {registrationItem?.productDescription}</Text>
            <TouchableOpacity style={styles.registrationChoice} onPress={startNewProductRegistration}>
              <Plus size={18} color="#2563eb" /><View style={{ flex: 1 }}><Text style={[styles.itemName, isDarkMode && styles.textDark]}>Cadastrar produto novo</Text><Text style={styles.muted}>Abre o cadastro completo do app já com fornecedor e custo preenchidos.</Text></View>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark, { marginTop: 16 }]}>Adicionar variação a um produto existente</Text>
            <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}><Search size={17} color="#94a3b8" /><TextInput value={parentSearch} onChangeText={setParentSearch} placeholder="Buscar produto pai por nome ou SKU" placeholderTextColor="#94a3b8" style={[styles.input, isDarkMode && styles.textDark]} /></View>
            {parentSearchLoading ? <ActivityIndicator style={{ margin: 12 }} color="#2563eb" /> : null}
            {parentSearchError ? <Text style={styles.errorText}>{parentSearchError}</Text> : null}
            {parentResults.map((parent) => <TouchableOpacity key={parent.id} style={styles.resultRow} onPress={() => startVariationRegistration(parent)}><View style={{ flex: 1 }}><Text style={[styles.itemName, isDarkMode && styles.textDark]}>{parent.name}</Text><Text style={styles.muted}>SKU: {parent.code || '—'} · {(parent.product_variations || []).length} variações</Text></View><Plus size={18} color="#2563eb" /></TouchableOpacity>)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <ProductFormScreen
        visible={registrationFormVisible}
        product={registrationParent}
        initialData={registrationDefaults}
        dark={isDarkMode}
        onClose={() => { setRegistrationItem(null); setRegistrationDefaults(undefined); setRegistrationParent(null); setRegistrationFormVisible(false); }}
        onSave={saveQuickRegisteredProduct}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  header: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  headerDark: { backgroundColor: '#0f172a', borderBottomColor: '#334155' },
  headerText: { flex: 1 },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  textDark: { color: '#f8fafc' },
  muted: { color: '#64748b', fontSize: 12 },
  closeButton: { padding: 8 },
  loader: { marginTop: 40 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  section: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14 },
  sectionDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  sectionTitle: { color: '#334155', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10 },
  supplierRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  itemName: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  lockedText: { color: '#b45309', fontSize: 12, fontWeight: '600' },
  changeText: { color: '#2563eb', fontWeight: '800' },
  createAction: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 2 },
  disabledAction: { color: '#94a3b8' },
  registerButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#eff6ff', marginTop: 8 },
  registerButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  registrationChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#eff6ff', padding: 14, borderRadius: 12, marginTop: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  suggestionCard: { borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', borderRadius: 12, padding: 10, marginTop: 10 },
  suggestionCardDark: { backgroundColor: '#172554', borderColor: '#1d4ed8' },
  suggestionEyebrow: { color: '#1d4ed8', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#bfdbfe' },
  suggestionLinkButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563eb', paddingVertical: 7, paddingHorizontal: 9, borderRadius: 8 },
  suggestionLinkText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  ignoreButton: { alignSelf: 'flex-end', padding: 6 },
  retrySuggestion: { alignSelf: 'center', padding: 10 },
  searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10, marginTop: 6 },
  searchBoxDark: { borderColor: '#475569', backgroundColor: '#0f172a' },
  input: { flex: 1, color: '#0f172a', paddingVertical: 8 },
  resultRow: { minHeight: 48, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#cbd5e1', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  description: { marginTop: 4, marginBottom: 8 },
  costRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, marginBottom: 4 },
  costCell: { flexGrow: 1, flexBasis: 150, minWidth: 0 },
  costLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', marginBottom: 3 },
  costValue: { color: '#334155', fontSize: 12, fontWeight: '700' },
  costLanded: { color: '#15803d' },
  detailsToggle: { alignSelf: 'flex-start', paddingVertical: 8 },
  detailsToggleText: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  detailsPanel: { padding: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  detailsPanelDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  detailsTitle: { color: '#334155', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  detailsSubtitle: { color: '#64748b', fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  detailLine: { minHeight: 26, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#cbd5e1', paddingVertical: 4 },
  detailValue: { color: '#334155', fontSize: 11, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  detailEmphasis: { color: '#047857', fontWeight: '800' },
  linkSection: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  linkSectionDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  linkHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  linkTitle: { color: '#334155', fontSize: 12, fontWeight: '800' },
  modeSwitch: { flexDirection: 'row', gap: 4 },
  modeButton: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#e2e8f0' },
  modeButtonActive: { backgroundColor: '#2563eb' },
  modeText: { color: '#475569', fontSize: 11, fontWeight: '800' },
  modeTextActive: { color: '#fff' },
  linkedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4', borderRadius: 12 },
  linkedName: { color: '#166534', fontWeight: '800', fontSize: 13 },
  linkedCode: { color: '#15803d', fontSize: 11, marginTop: 3 },
  multiplierInput: { width: 54, minHeight: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, color: '#334155', textAlign: 'center', fontSize: 13, fontWeight: '700' },
  multiplierInputDark: { color: '#f8fafc', borderColor: '#475569', backgroundColor: '#0f172a' },
  removeButton: { padding: 9 },
  error: { color: '#dc2626', padding: 8 },
  errorText: { color: '#dc2626', fontSize: 12, marginTop: 8 },
  doneButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#2563eb', borderRadius: 12, marginTop: 8 },
  doneText: { color: '#fff', fontWeight: '800' },
});
