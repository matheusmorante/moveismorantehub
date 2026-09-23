import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X, Save, Check, ChevronLeft, ChevronRight, Lock, Images, Info, FileText, Package, Grid3X3, Receipt } from 'lucide-react-native';
import { ProductFormBasicTab } from '../modals/tabs/ProductFormBasicTab';
import { ProductFormPricesTab } from '../modals/tabs/ProductFormPricesTab';
import { ProductFormTechnicalTab } from '../modals/tabs/ProductFormTechnicalTab';
import { ProductFormVariationsTab } from '../modals/tabs/ProductFormVariationsTab';
import { ProductFormPhotosTab } from '../modals/tabs/ProductFormPhotosTab';
import { ProductFormDescriptionTab } from '../modals/tabs/ProductFormDescriptionTab';
import { ProductFormFiscalTab } from '../modals/tabs/ProductFormFiscalTab';
import { getNextSequentialProductCode, parseLocalizedPrice } from '../services/mobileProductHelpers';
import { supabase } from '../../../services/supabaseClient';

// ─── Tabs ────────────────────────────────────────────────────────────────────
type TabId = 'geral' | 'fotos' | 'technical' | 'description' | 'estoque' | 'variacoes' | 'fiscal';

interface Tab {
  id: TabId;
  label: string;
  Icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  condition?: (formData: any) => boolean;
}

const TABS: Tab[] = [
  { id: 'geral',     label: 'Cadastro Geral' },
  { id: 'fotos',     label: 'Fotos', Icon: Images, condition: (formData) => formData.itemType !== 'service' },
  { id: 'technical', label: 'Características', Icon: Info, condition: (formData) => formData.itemType !== 'service' },
  { id: 'description', label: 'Descrição', Icon: FileText, condition: (formData) => formData.itemType !== 'service' },
  { id: 'estoque',   label: 'Estoque e Precificação', Icon: Package, condition: (formData) => formData.itemType !== 'service' },
  { id: 'variacoes', label: 'Variações', Icon: Grid3X3, condition: (formData) => formData.itemType !== 'service' },
  { id: 'fiscal',    label: 'Tributário / NF', Icon: Receipt, condition: (formData) => formData.itemType !== 'composition' },
];


// ─── Estado inicial ──────────────────────────────────────────────────────────
const INITIAL_FORM = {
  name: '',
  title: '',
  marketplaceTitle: '',
  metaTitle: '',
  metaDescription: '',
  seoDescription: '',
  code: '',
  slug: '',
  itemType: 'product',
  condition: 'novo',
  category: '',
  categoryId: '',
  categoryIds: [],
  opportunityId: null,
  mainSupplierId: '',
  description: '',
  observations: '',
  unitPrice: '',
  promoPrice: '',
  discountPercent: '',
  discountFixed: '',
  costPrice: '',
  ipiPercent: '',
  freightType: 'fixed',
  freightCost: '',
  finalPurchasePrice: 0,
  stock: '',
  minStock: '',
  width: '',
  height: '',
  depth: '',
  weight: '',
  depthUseLength: false,
  images: [],
  variations: [],
  hasVariations: false,
  active: true,
  isDraft: false,
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  product?: any | null;
  initialData?: Record<string, any>;
  dark: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<string | void>;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export const ProductFormScreen: React.FC<Props> = ({
  visible,
  product,
  initialData,
  dark,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('geral');
  const [formData, setFormDataRaw] = useState<any>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [requiredTechnicalNames, setRequiredTechnicalNames] = useState<string[]>([]);
  const [requirementsLoaded, setRequirementsLoaded] = useState(false);
  const [requirementsError, setRequirementsError] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);

  const categoryIds: string[] = Array.isArray(formData.categoryIds) && formData.categoryIds.length
    ? formData.categoryIds
    : (formData.categoryId ? [formData.categoryId] : []);
  const categoryIdsKey = [...new Set(categoryIds.map(String))].sort().join('|');
  const hasCategory = categoryIds.length > 0;
  const hasProductName = String(formData.name || '').trim().length >= 2;
  const hasMissingRequiredTechnical = !requirementsLoaded || requirementsError || requiredTechnicalNames.some(name =>
    !String(formData.technicalValues?.[name] ?? '').trim()
  );

  useEffect(() => {
    let cancelled = false;
    setRequirementsLoaded(false);
    setRequirementsError(false);
    const loadRequiredTechnicalNames = async () => {
      try {
        const requiredNames = new Set<string>();
        const globalQuery = await supabase.from('attributes').select('name')
          .eq('active', true).eq('is_globally_required', true);
        if (globalQuery.error) throw globalQuery.error;
        (globalQuery.data || []).forEach((attribute: any) => attribute.name && requiredNames.add(attribute.name));

        const selectedCategoryIds = categoryIdsKey ? categoryIdsKey.split('|') : [];
        if (selectedCategoryIds.length) {
          const linksQuery = await supabase.from('category_attributes').select('attribute_id')
            .in('category_id', selectedCategoryIds).eq('is_required', true);
          if (linksQuery.error) throw linksQuery.error;
          const attributeIds = [...new Set((linksQuery.data || []).map((link: any) => link.attribute_id).filter(Boolean))];
          if (attributeIds.length) {
            const categoryAttributesQuery = await supabase.from('attributes').select('name')
              .in('id', attributeIds).eq('active', true);
            if (categoryAttributesQuery.error) throw categoryAttributesQuery.error;
            (categoryAttributesQuery.data || []).forEach((attribute: any) => attribute.name && requiredNames.add(attribute.name));
          }
        }
        if (!cancelled) setRequiredTechnicalNames([...requiredNames]);
      } catch (error) {
        console.warn('[ProductFormScreen] Não foi possível verificar características obrigatórias:', error);
        if (!cancelled) {
          setRequiredTechnicalNames([]);
          setRequirementsError(true);
        }
      } finally {
        if (!cancelled) setRequirementsLoaded(true);
      }
    };
    void loadRequiredTechnicalNames();
    return () => { cancelled = true; };
  }, [categoryIdsKey]);

  const isTabDisabled = (tabId: TabId) => {
    if (tabId === 'technical') return !hasCategory;
    if (tabId === 'description') return !hasCategory || !hasProductName || hasMissingRequiredTechnical;
    return false;
  };

  const visibleTabs = TABS.filter(tab => !tab.condition || tab.condition(formData));
  const enabledTabs = visibleTabs.filter(tab => !isTabDisabled(tab.id));

  useEffect(() => {
    if (isTabDisabled(activeTab)) setActiveTab('geral');
  }, [activeTab, hasCategory, hasProductName, hasMissingRequiredTechnical]);

  // Wrapper estável para setFormData (aceita função ou objeto)
  const setFormData = useCallback((fn: any) => {
    setFormDataRaw((prev: any) => (typeof fn === 'function' ? fn(prev) : { ...prev, ...fn }));
  }, []);

  // Preenche o formulário ao abrir (edição) ou limpa (criação)
  useEffect(() => {
    if (!visible) return;
    if (product) {
      const productCategories = Array.isArray(product.product_categories)
        ? product.product_categories.map((relation: any) => relation.category_id || relation.categories?.id || relation.id).filter(Boolean)
        : [];
      const rawVariations = Array.isArray(product.allVariations) ? product.allVariations : [];
      const technicalValues = {
        ...(product.technical_specs?.technicalValues || {}),
        ...(product.technicalValues || {}),
      };
      for (const [attribute, value] of [
        ['Altura', product.height], ['Largura', product.width],
        [product.depth_use_length || product.depthUseLength ? 'Comprimento' : 'Profundidade', product.depth],
        ['Peso', product.weight],
      ]) {
        if (value !== null && value !== undefined && String(value).trim() && !technicalValues[attribute]) {
          technicalValues[attribute] = value;
        }
      }
      const rawComboItems = product.combo_items ?? product.comboItems;
      let comboItems = Array.isArray(rawComboItems) ? rawComboItems : [];
      if (typeof rawComboItems === 'string') {
        try { comboItems = JSON.parse(rawComboItems); } catch { comboItems = []; }
      }
      setFormDataRaw({
        ...INITIAL_FORM,
        ...product,
        id: product.id,
        name: product.name || '',
        slug: product.slug || '',
        title: product.title || product.marketplaceTitle || product.name || '',
        marketplaceTitle: product.marketplaceTitle || product.title || product.name || '',
        metaTitle: product.meta_title || product.metaTitle || '',
        metaDescription: product.meta_description || product.metaDescription || '',
        seoDescription: product.seo_description || product.seoDescription || '',
        code: product.code || '',
        itemType: product.item_type || product.itemType || 'product',
        condition: product.condition || (product.is_salvado ? 'salvado' : 'novo'),
        category: product.category || '',
        categoryId: product.category_id || product.categoryId || '',
        categoryIds: product.categoryIds || (productCategories.length ? productCategories : (product.category_id || product.categoryId ? [product.category_id || product.categoryId] : [])),
        mainSupplierId: product.main_supplier_id || product.mainSupplierId || '',
        description: product.description || '',
        observations: product.observations || '',
        unitPrice: product.unitPrice ?? product.unit_price ?? '',
        promoPrice: product.promoPrice ?? product.promo_price ?? '',
        costPrice: product.costPrice ?? product.cost_price ?? '',
        ipiPercent: product.ipi_percent ?? product.ipiPercent ?? '',
        freightType: product.freight_type || product.freightType || 'fixed',
        freightCost: product.freight_cost ?? product.freightCost ?? '',
        finalPurchasePrice: product.final_purchase_price ?? product.finalPurchasePrice ?? 0,
        stock: product.stock ?? '',
        minStock: product.min_stock ?? product.minStock ?? '',
        width: product.width ?? '',
        height: product.height ?? '',
        depth: product.depth ?? '',
        weight: product.weight ?? '',
        images: Array.isArray(product.images) ? product.images : [],
        variations: rawVariations.map((variation: any) => ({
          ...variation,
          differentiateTitle: Boolean(variation.differentiateTitle || (variation.title && variation.title !== variation.name) || (variation.marketplaceTitle && variation.marketplaceTitle !== variation.name)),
          attributes: Array.isArray(variation.attributes)
            ? Object.fromEntries(variation.attributes.filter((attribute: any) => attribute?.name).map((attribute: any) => [attribute.name, attribute.value]))
            : variation.attributes || {},
          price: variation.price ?? variation.unit_price ?? '',
          costPrice: variation.costPrice ?? variation.cost_price ?? '',
          promoPrice: variation.promoPrice ?? variation.promo_price ?? '',
          syncUnitPrice: variation.syncUnitPrice ?? (variation.use_parent_price !== false),
          syncPromoPrice: variation.syncPromoPrice ?? (variation.use_parent_promo_price !== false),
          syncDescription: variation.syncDescription ?? (variation.use_parent_description !== false),
          syncWidth: variation.syncWidth ?? (variation.use_parent_dimensions !== false),
          syncHeight: variation.syncHeight ?? (variation.use_parent_dimensions !== false),
          syncDepth: variation.syncDepth ?? (variation.use_parent_dimensions !== false),
          comboItems: typeof variation.combo_items === 'string'
            ? (() => { try { return JSON.parse(variation.combo_items); } catch { return []; } })()
            : variation.combo_items || variation.comboItems || [],
        })),
        comboItems: comboItems.length ? comboItems : product.allVariations && product.allVariations.length > 0
          ? (typeof product.allVariations[0].combo_items === 'string'
              ? (() => { try { return JSON.parse(product.allVariations[0].combo_items); } catch { return []; } })()
              : product.allVariations[0].combo_items || product.allVariations[0].comboItems || [])
          : [],
        hasVariations: Boolean(product.has_variations || product.hasVariations || (product.allVariations?.length > 0)),
        active: product.active ?? true,
        isDraft: Boolean(product.is_draft || product.isDraft || product.status === 'draft'),
        status: product.status || (product.is_draft || product.isDraft ? 'draft' : 'hidden'),
        initialStock: product.initial_stock ?? product.initialStock ?? product.stock ?? 0,
        unit: product.unit || 'UN',
        depthUseLength: product.depth_use_length ?? product.depthUseLength ?? false,
        technicalValues,
        ecommerceDescription: product.ecommerce_description || product.ecommerceDescription || '',
        whatsappDescription: product.whatsapp_description || product.whatsappDescription || '',
        fiscal: product.fiscal || {},
      });
    } else {
      setFormDataRaw({ ...INITIAL_FORM, ...(initialData || {}) });
      void (async () => {
        try {
          const { data, error } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
          if (error) throw error;
          const defaults = data?.data?.fiscalDefaults;
          if (!defaults) return;
          setFormDataRaw((prev: any) => Object.keys(prev.fiscal || {}).length > 0 ? prev : ({
            ...prev,
            fiscal: {
              ncm: defaults.ncm || '',
              cest: defaults.cest || '',
              cst: defaults.cst || '102',
              cfop: prev.itemType === 'service' ? '5933' : defaults.cfop || '5102',
              origem: defaults.origem || '0',
              icmsPercent: defaults.icmsPercent ?? 0,
              pisCst: defaults.pisCst || '49',
              cofinsCst: defaults.cofinsCst || '49',
            },
          }));
        } catch (error) {
          console.warn('[ProductFormScreen] Não foi possível carregar padrões fiscais:', error);
        }
      })();
      getNextSequentialProductCode().then(nextCode => {
        setFormDataRaw((prev: any) => ({
          ...prev,
          code: nextCode,
          ...(prev.itemType === 'composition' ? {} : {
            hasVariations: true,
            variations: Array.isArray(prev.variations) && prev.variations.length > 0 ? prev.variations : [{
              id: `new_${nextCode}-01`,
              sku: `${nextCode}-01`,
              name: prev.name || '',
              price: '',
              costPrice: '',
              stock: 0,
              attributes: {},
              images: [],
              syncUnitPrice: true,
              syncPromoPrice: true,
              syncDescription: true,
              syncWidth: true,
              syncHeight: true,
              syncDepth: true,
              active: false,
              status: 'hidden',
            }],
          }),
        }));
      }).catch(err => {
        console.warn('[ProductFormScreen] Erro ao obter próximo código:', err);
      });
    }
    setActiveTab('geral');
  }, [visible, product, initialData]);

  // Validação antes de salvar
  const validate = useCallback((requestedDraft: boolean): boolean => {
    const isDraft = requestedDraft && !product?.id;
    if (!formData.name?.trim() || formData.name.trim().length < 2) {
      Alert.alert('Campo Obrigatório', 'Informe o nome do produto (mínimo 2 caracteres).', [
        { text: 'OK', onPress: () => setActiveTab('geral') },
      ]);
      return false;
    }
    if (!isDraft) {
      if (formData.itemType !== 'service' && !(Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0) && !formData.category && !formData.categoryId) {
        Alert.alert('Campo Obrigatório', 'Selecione a categoria do produto.', [
          { text: 'OK', onPress: () => setActiveTab('geral') },
        ]);
        return false;
      }
      if (!formData.mainSupplierId && !formData.supplierId) {
        Alert.alert('Campo Obrigatório', 'Selecione o fornecedor principal na aba Estoque e Precificação.', [
          { text: 'OK', onPress: () => setActiveTab('estoque') },
        ]);
        return false;
      }
      const variationPrices = Array.isArray(formData.variations) ? formData.variations : [];
      if (formData.itemType !== 'composition' && variationPrices.length === 0) {
        Alert.alert('Variação obrigatória', 'Mantenha a variação principal do produto ou adicione uma nova na aba Variações.', [
          { text: 'OK', onPress: () => setActiveTab('variacoes') },
        ]);
        return false;
      }
      const parentPrice = parseLocalizedPrice(formData.unitPrice);
      const hasValidPrice = parentPrice > 0 || variationPrices.some((variation: any) =>
        parseLocalizedPrice(variation.syncUnitPrice !== false ? parentPrice : (variation.price ?? variation.unitPrice)) > 0
      );
      if (!hasValidPrice) {
        Alert.alert('Campo Obrigatório', 'Informe o preço de venda do produto.', [
          { text: 'OK', onPress: () => setActiveTab('estoque') },
        ]);
        return false;
      }
    }
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async (isDraft: boolean) => {
    if (!validate(isDraft)) return;
    const saveAsDraft = isDraft && !product?.id;
    if (!saveAsDraft) {
      const { data: requiredAttributes, error: requiredAttributesError } = await supabase
        .from('attributes').select('name').eq('active', true).eq('is_globally_required', true);
      if (requiredAttributesError) {
        Alert.alert('Não foi possível validar', 'Tente salvar novamente para verificar as características obrigatórias.');
        setActiveTab('technical');
        return;
      }
      const technicalValues = formData.technicalValues || {};
      const requiredNames = new Set((requiredAttributes || []).map((attribute: any) => attribute.name));
      const categoryIds: string[] = formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);
      if (categoryIds.length > 0) {
        const { data: categoryLinks, error: categoryLinksError } = await supabase.from('category_attributes')
          .select('attribute_id').in('category_id', categoryIds).eq('is_required', true);
        if (categoryLinksError) {
          Alert.alert('Não foi possível validar', 'Tente novamente para verificar os campos obrigatórios da categoria.');
          setActiveTab('technical');
          return;
        }
        const categoryAttributeIds = [...new Set((categoryLinks || []).map((link: any) => link.attribute_id).filter(Boolean))];
        if (categoryAttributeIds.length) {
          const { data: categoryAttributes, error: categoryAttributesError } = await supabase.from('attributes')
            .select('name').in('id', categoryAttributeIds).eq('active', true);
          if (categoryAttributesError) {
            Alert.alert('Não foi possível validar', 'Tente novamente para verificar os campos obrigatórios da categoria.');
            setActiveTab('technical');
            return;
          }
          (categoryAttributes || []).forEach((attribute: any) => requiredNames.add(attribute.name));
        }
      }
      const missingName = [...requiredNames].find(name => !String(technicalValues[name] ?? '').trim());
      if (missingName) {
        Alert.alert('Campo Obrigatório', `Preencha a característica “${missingName}” na aba Características.`, [
          { text: 'OK', onPress: () => setActiveTab('technical') },
        ]);
        setActiveTab('technical');
        return;
      }
      const requiredVariationNames = new Set([...requiredNames, 'Cor', 'Material da estrutura']);
      for (const variation of Array.isArray(formData.variations) ? formData.variations : []) {
        const variationAttributes = Array.isArray(variation.attributes)
          ? Object.fromEntries(variation.attributes.filter((attribute: any) => attribute?.name).map((attribute: any) => [attribute.name, attribute.value]))
          : (variation.attributes || {});
        const effectiveVariationValues = {
          ...technicalValues,
          ...variationAttributes,
          ...(variation.technicalValues || {}),
        };
        const missingVariationName = [...requiredVariationNames].find(name => {
          const value = String(effectiveVariationValues[name] ?? '').trim();
          return value !== 'Não se aplica' && !value;
        });
        if (missingVariationName) {
          Alert.alert('Campo Obrigatório', `Preencha a característica “${missingVariationName}” da variação na aba Variações.`, [
            { text: 'OK', onPress: () => setActiveTab('variacoes') },
          ]);
          setActiveTab('variacoes');
          return;
        }
      }
    }
    setSaving(true);
    try {
      await onSave({
        ...formData,
        isDraft: saveAsDraft,
        active: saveAsDraft ? false : (product ? formData.active !== false : true),
        status: saveAsDraft ? 'draft' : product?.status === 'published' ? 'published' : 'hidden',
        hasVariations: formData.itemType !== 'composition' || Boolean(Array.isArray(formData.variations) && formData.variations.length > 0),
        variations: (Array.isArray(formData.variations) ? formData.variations : []).map((variation: any) => ({
          ...variation,
          active: saveAsDraft ? false : product ? variation.active !== false : true,
          status: saveAsDraft ? 'draft' : product?.status === 'published' ? (variation.status || 'published') : 'hidden',
        })),
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao Salvar', err?.message || 'Falha ao salvar o produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [formData, validate, onSave, onClose, product]);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: any) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;

    // Se gesto for horizontal (deltaX > 60px) e pouco vertical (deltaY < 60px)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 60) {
      const currentIdx = enabledTabs.findIndex(t => t.id === activeTab);
      if (deltaX < 0) {
        // Deslizar para a esquerda -> Próxima aba
        if (currentIdx >= 0 && currentIdx < enabledTabs.length - 1) {
          handleTabChange(enabledTabs[currentIdx + 1].id);
        }
      } else {
        // Deslizar para a direita -> Aba anterior
        if (currentIdx > 0) {
          handleTabChange(enabledTabs[currentIdx - 1].id);
        }
      }
    }
  };

  const handleTabChange = (tabId: TabId) => {
    if (isTabDisabled(tabId)) return;
    setActiveTab(tabId);
    const idx = visibleTabs.findIndex(t => t.id === tabId);
    if (idx >= 0) {
      tabScrollRef.current?.scrollTo({ x: idx * 90, animated: true });
    }
  };

  const activeStepIndex = enabledTabs.findIndex(tab => tab.id === activeTab);
  const isLastStep = activeStepIndex < 0 || activeStepIndex === enabledTabs.length - 1;
  const isDraftProduct = !product?.id || Boolean(
    formData.isDraft || product?.is_draft || product?.isDraft || product?.status === 'draft'
  );
  const handleNextStep = () => {
    const nextTab = enabledTabs[activeStepIndex + 1];
    if (nextTab) handleTabChange(nextTab.id);
  };

  const varCount = Array.isArray(formData.variations) ? formData.variations.length : 0;
  const photoCount = Array.isArray(formData.images) ? formData.images.length : 0;
  const hasValidName = String(formData.name || '').trim().length >= 2;
  const hasValidCategories = Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0;
  const hasValidSupplier = Boolean(formData.mainSupplierId);
  const hasValidPrice = formData.hasVariations
    ? varCount > 0
    : parseLocalizedPrice(formData.unitPrice) > 0;
  const erpReady = hasValidName && hasValidCategories && hasValidSupplier && hasValidPrice;
  const catalogPublished = formData.status === 'published';

  const renderTab = () => {
    switch (activeTab) {
      case 'geral':
        return <ProductFormBasicTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'fotos':
        return <ProductFormPhotosTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'technical':
        return <ProductFormTechnicalTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'description':
        return <ProductFormDescriptionTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'estoque':
        return <ProductFormPricesTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'variacoes':
        return <ProductFormVariationsTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'fiscal':
        return <ProductFormFiscalTab formData={formData} setFormData={setFormData} dark={dark} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, dark && styles.darkBg]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* ── Header ── */}
          <View style={[styles.header, dark && styles.darkHeader]}>
            <TouchableOpacity onPress={onClose} style={[styles.backBtn, dark && styles.darkBtn]}>
              <ChevronLeft size={20} color={dark ? '#94a3b8' : '#475569'} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, dark && styles.lightText]} numberOfLines={1}>
                {product ? 'Editar Produto' : 'Cadastro de Produto'}
              </Text>
              <View style={styles.headerMeta}>
                {formData.code ? <Text style={styles.headerCode}>{formData.code}</Text> : null}
                <View style={[styles.statusBadge, erpReady ? styles.erpStatusReady : styles.erpStatusPending]}>
                  <Text style={[styles.statusBadgeText, erpReady ? styles.erpStatusTextReady : styles.erpStatusTextPending]}>
                    ERP: {erpReady ? 'Ativo' : 'Pendente'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, catalogPublished ? styles.catalogStatusPublished : styles.catalogStatusHidden]}>
                  <Text style={[styles.statusBadgeText, catalogPublished ? styles.catalogStatusTextPublished : styles.catalogStatusTextHidden]}>
                    CATÁLOGO: {catalogPublished ? 'Publicado' : 'Ocultado'}
                  </Text>
                </View>
              </View>
            </View>
            {!product?.id && <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, dark && styles.darkBtn]}
            >
              <X size={18} color={dark ? '#94a3b8' : '#475569'} />
            </TouchableOpacity>}
          </View>

          {/* ── Tabs Scrolláveis ── */}
          <View style={[styles.tabsContainer, dark && styles.darkTabsContainer]}>
            <ScrollView
              ref={tabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              {visibleTabs.map(tab => {
                const isActive = activeTab === tab.id;
                const disabled = isTabDisabled(tab.id);
                const badge =
                  tab.id === 'variacoes' && varCount > 0 ? varCount :
                  tab.id === 'fotos' && photoCount > 0 ? photoCount :
                  null;
                const TabIcon = tab.Icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => handleTabChange(tab.id)}
                    disabled={disabled}
                    accessibilityRole="tab"
                    accessibilityState={{ disabled, selected: isActive }}
                    accessibilityHint={disabled ? (tab.id === 'technical'
                      ? 'Selecione ao menos uma categoria no Cadastro Geral para liberar esta aba.'
                      : 'Informe o nome, selecione uma categoria e preencha as características obrigatórias.') : undefined}
                    style={[styles.tab, isActive && styles.tabActive, dark && !isActive && styles.darkTab, disabled && styles.tabDisabled]}
                  >
                    {TabIcon && <TabIcon size={13} color={isActive ? '#2563eb' : dark ? '#94a3b8' : '#64748b'} />}
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive, dark && !isActive && styles.dimText]}>
                      {tab.label.toLocaleUpperCase('pt-BR')}
                    </Text>
                    {disabled && <Lock size={12} color={dark ? '#64748b' : '#94a3b8'} />}
                    {badge !== null && (
                      <View style={[styles.badge, isActive && styles.badgeActive]}>
                        <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Conteúdo da Aba ── */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {renderTab()}
          </ScrollView>

          {/* ── Footer de Ações ── */}
          <View style={[styles.footer, dark && styles.darkFooter]}>
            {isDraftProduct && (
              <TouchableOpacity
                onPress={() => handleSubmit(true)}
                disabled={saving}
                style={[styles.draftBtn, dark && styles.darkBtn]}
              >
                <Save size={15} color={dark ? '#94a3b8' : '#64748b'} />
                <Text style={[styles.draftBtnText, dark && styles.dimText]}>Salvar rascunho</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={[styles.discardBtn, dark && styles.darkBtn]}
              accessibilityRole="button"
            >
              <Text style={[styles.discardBtnText, dark && styles.dimText]}>
                {isDraftProduct ? 'Cancelar' : 'Descartar alterações'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isLastStep ? () => handleSubmit(false) : handleNextStep}
              disabled={saving}
              style={[styles.saveBtn, isLastStep && styles.finalSaveBtn]}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  {isLastStep ? <Check size={16} color="#ffffff" /> : null}
                  <Text style={styles.saveBtnText}>
                    {isLastStep
                      ? (product ? 'Salvar alterações' : 'Cadastrar produto')
                      : 'Próxima etapa'}
                  </Text>
                  {!isLastStep ? <ChevronRight size={16} color="#ffffff" /> : null}
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  darkBg: { backgroundColor: '#0f172a' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  darkHeader: { borderBottomColor: '#1e293b' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  darkBtn: { backgroundColor: '#1e293b' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  headerCode: { fontSize: 11, fontWeight: '900', color: '#2563eb', fontVariant: ['tabular-nums'] as any },
  headerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  statusBadge: { minHeight: 19, justifyContent: 'center', paddingHorizontal: 7, borderRadius: 10, borderWidth: 1 },
  statusBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.35 },
  erpStatusReady: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  erpStatusPending: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  erpStatusTextReady: { color: '#1d4ed8' },
  erpStatusTextPending: { color: '#b45309' },
  catalogStatusPublished: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  catalogStatusHidden: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  catalogStatusTextPublished: { color: '#047857' },
  catalogStatusTextHidden: { color: '#475569' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },

  // Tabs
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' },
  darkTabsContainer: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  tabsContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 0, gap: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 0, backgroundColor: 'transparent', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabDisabled: { opacity: 0.45 },
  tabActive: { backgroundColor: 'transparent', borderBottomColor: '#2563eb' },
  darkTab: { backgroundColor: 'transparent' },
  tabLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.35, color: '#64748b' },
  tabLabelActive: { color: '#2563eb' },
  badge: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  badgeActive: { backgroundColor: '#ffffff30' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#475569' },
  badgeTextActive: { color: '#ffffff' },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 24 },

  // Footer
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' },
  darkFooter: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
  draftBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  draftBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  discardBtn: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#f8fafc' },
  discardBtnText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#64748b', textAlign: 'center' },
  saveBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#2563eb' },
  finalSaveBtn: { backgroundColor: '#059669' },
  saveBtnText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', color: '#ffffff' },
});
