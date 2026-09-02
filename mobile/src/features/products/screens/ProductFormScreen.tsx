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
import { X, Save, Check, ChevronLeft } from 'lucide-react-native';
import { ProductFormBasicTab } from '../modals/tabs/ProductFormBasicTab';
import { ProductFormPricesTab } from '../modals/tabs/ProductFormPricesTab';
import { ProductFormTechnicalTab } from '../modals/tabs/ProductFormTechnicalTab';
import { ProductFormVariationsTab } from '../modals/tabs/ProductFormVariationsTab';
import { ProductFormPhotosTab } from '../modals/tabs/ProductFormPhotosTab';
import { ProductFormFiscalTab } from '../modals/tabs/ProductFormFiscalTab';
import { getNextSequentialProductCode } from '../services/mobileProductHelpers';

// ─── Tabs ────────────────────────────────────────────────────────────────────
type TabId = 'geral' | 'fotos' | 'technical' | 'estoque' | 'variacoes' | 'fiscal';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'geral',     label: 'Cadastro Geral' },
  { id: 'fotos',     label: 'Fotos' },
  { id: 'technical', label: 'Informações Técnicas' },
  { id: 'estoque',   label: 'Estoque e Precificação' },
  { id: 'variacoes', label: 'Variações' },
  { id: 'fiscal',    label: 'Tributário / NF' },
];


// ─── Estado inicial ──────────────────────────────────────────────────────────
const INITIAL_FORM = {
  name: '',
  title: '',
  marketplaceTitle: '',
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
  dark: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export const ProductFormScreen: React.FC<Props> = ({
  visible,
  product,
  dark,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('geral');
  const [formData, setFormDataRaw] = useState<any>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);

  // Wrapper estável para setFormData (aceita função ou objeto)
  const setFormData = useCallback((fn: any) => {
    setFormDataRaw(prev => (typeof fn === 'function' ? fn(prev) : { ...prev, ...fn }));
  }, []);

  // Preenche o formulário ao abrir (edição) ou limpa (criação)
  useEffect(() => {
    if (!visible) return;
    if (product) {
      setFormDataRaw({
        ...INITIAL_FORM,
        id: product.id,
        name: product.name || '',
        code: product.code || '',
        itemType: product.item_type || product.itemType || 'product',
        condition: product.condition || 'novo',
        category: product.category || '',
        categoryId: product.category_id || product.categoryId || '',
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
        variations: Array.isArray(product.allVariations) ? product.allVariations : [],
        hasVariations: Boolean(product.has_variations || product.hasVariations || (product.allVariations?.length > 0)),
        active: product.active ?? true,
        isDraft: Boolean(product.is_draft || product.isDraft),
        fiscal: product.fiscal || {},
      });
    } else {
      setFormDataRaw({ ...INITIAL_FORM });
      getNextSequentialProductCode().then(nextCode => {
        setFormDataRaw(prev => ({
          ...prev,
          code: nextCode,
        }));
      }).catch(err => {
        console.warn('[ProductFormScreen] Erro ao obter próximo código:', err);
      });
    }
    setActiveTab('geral');
  }, [visible, product]);

  // Validação antes de salvar
  const validate = useCallback((isDraft: boolean): boolean => {
    if (!formData.name?.trim() || formData.name.trim().length < 2) {
      Alert.alert('Campo Obrigatório', 'Informe o nome do produto (mínimo 2 caracteres).', [
        { text: 'OK', onPress: () => setActiveTab('geral') },
      ]);
      return false;
    }
    if (!isDraft) {
      if (!formData.category && !formData.categoryId) {
        Alert.alert('Campo Obrigatório', 'Selecione a categoria do produto.', [
          { text: 'OK', onPress: () => setActiveTab('geral') },
        ]);
        return false;
      }
      if (!formData.hasVariations) {
        const price = parseFloat(String(formData.unitPrice || '').replace(',', '.'));
        if (!price || price <= 0) {
          Alert.alert('Campo Obrigatório', 'Informe o preço de venda do produto.', [
            { text: 'OK', onPress: () => setActiveTab('estoque') },
          ]);
          return false;
        }
      } else {
        if (!formData.variations || formData.variations.length === 0) {
          Alert.alert('Campo Obrigatório', 'Adicione pelo menos uma variação na aba Variações.', [
            { text: 'OK', onPress: () => setActiveTab('variacoes') },
          ]);
          return false;
        }
      }
    }
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async (isDraft: boolean) => {
    if (!validate(isDraft)) return;
    setSaving(true);
    try {
      await onSave({ ...formData, isDraft });
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao Salvar', err?.message || 'Falha ao salvar o produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [formData, validate, onSave, onClose]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    const idx = TABS.findIndex(t => t.id === tabId);
    if (idx >= 0) {
      tabScrollRef.current?.scrollTo({ x: idx * 90, animated: true });
    }
  };

  const varCount = Array.isArray(formData.variations) ? formData.variations.length : 0;
  const photoCount = Array.isArray(formData.images) ? formData.images.length : 0;

  const renderTab = () => {
    switch (activeTab) {
      case 'geral':
        return <ProductFormBasicTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'fotos':
        return <ProductFormPhotosTab formData={formData} setFormData={setFormData} dark={dark} />;
      case 'technical':
        return <ProductFormTechnicalTab formData={formData} setFormData={setFormData} dark={dark} />;
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
                {product ? 'Editar Produto' : 'Cadastrar Produto'}
              </Text>
              {formData.code ? (
                <Text style={styles.headerCode}>{formData.code}</Text>
              ) : (
                <Text style={styles.headerSubtitle}>Preencha os dados do produto</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, dark && styles.darkBtn]}
            >
              <X size={18} color={dark ? '#94a3b8' : '#475569'} />
            </TouchableOpacity>
          </View>

          {/* ── Tabs Scrolláveis ── */}
          <View style={[styles.tabsContainer, dark && styles.darkTabsContainer]}>
            <ScrollView
              ref={tabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                const badge =
                  tab.id === 'variacoes' && varCount > 0 ? varCount :
                  tab.id === 'fotos' && photoCount > 0 ? photoCount :
                  null;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => handleTabChange(tab.id)}
                    style={[styles.tab, isActive && styles.tabActive, dark && !isActive && styles.darkTab]}
                  >
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive, dark && !isActive && styles.dimText]}>
                      {tab.label}
                    </Text>
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
          >
            {renderTab()}
          </ScrollView>

          {/* ── Footer de Ações ── */}
          <View style={[styles.footer, dark && styles.darkFooter]}>
            <TouchableOpacity
              onPress={() => handleSubmit(true)}
              disabled={saving}
              style={[styles.draftBtn, dark && styles.darkBtn]}
            >
              <Save size={15} color={dark ? '#94a3b8' : '#64748b'} />
              <Text style={[styles.draftBtnText, dark && styles.dimText]}>Rascunho</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSubmit(false)}
              disabled={saving}
              style={styles.saveBtn}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={16} color="#ffffff" />
                  <Text style={styles.saveBtnText}>
                    {product ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </Text>
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
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },

  // Tabs
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' },
  darkTabsContainer: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  tabsContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#f8fafc' },
  tabActive: { backgroundColor: '#2563eb' },
  darkTab: { backgroundColor: '#1e293b' },
  tabLabel: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  tabLabelActive: { color: '#ffffff' },
  badge: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  badgeActive: { backgroundColor: '#ffffff30' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#475569' },
  badgeTextActive: { color: '#ffffff' },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 24 },

  // Footer
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' },
  darkFooter: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
  draftBtn: { flex: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  draftBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  saveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, backgroundColor: '#2563eb' },
  saveBtnText: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
});
