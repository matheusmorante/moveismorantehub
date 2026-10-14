import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FileText, Package, Grid2X2, Images, Search, Minus, Plus, Trash2, Hammer, Layers, X, Check } from 'lucide-react-native';
import { fetchMobileProductsPage } from '../../products/services/mobileProductFetchService';
import { submittedSearchFormSchema } from '../../../../../shared-utils/lookupFormSchemas';
import type { Composition, CompositionVariationItem } from '../types/composition.type';
import { saveComposition } from '../services/mobileCompositionService';
import { z } from 'zod';
import { useZodForm, flattenFormErrors } from '../../../hooks/useZodForm';

const mobileCompositionFormSchema = z.object({
  data: z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'O nome da composição é obrigatório.'),
    sku: z.string().optional(), description: z.string().optional(),
    active: z.boolean().optional(), catalog_published: z.boolean().optional(),
    pricing_mode: z.enum(['sum', 'fixed', 'discount']),
    manual_price: z.number().nonnegative('Informe um preço válido.').nullish().transform((value) => value ?? undefined),
  }).passthrough(),
  items: z.array(z.object({
    product_id: z.string().min(1, 'Selecione um produto real.'),
    variation_id: z.string().optional(),
    quantity: z.number().positive('A quantidade deve ser maior que zero.'),
  }).passthrough()).min(1, 'Adicione pelo menos um produto real à composição.'),
});

interface MobileCompositionFormModalProps {
  visible: boolean;
  onClose: () => void;
  composition?: Composition | null;
  onSuccess?: () => void;
  isDarkMode?: boolean;
}

export const MobileCompositionFormModal: React.FC<MobileCompositionFormModalProps> = ({
  visible,
  onClose,
  composition,
  onSuccess,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'variations' | 'images'>('info');
  const [formData, setFormData] = useState<Partial<Composition>>({
    active: true,
    catalog_published: true,
    pricing_mode: 'sum',
  });
  const [items, setItems] = useState<CompositionVariationItem[]>([]);
  const [manualPriceInput, setManualPriceInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const formValues = { data: { ...formData, name: formData.name || '', pricing_mode: formData.pricing_mode || 'sum', manual_price: formData.pricing_mode === 'sum' ? formData.manual_price : manualPriceInput.trim() ? Number(manualPriceInput.trim().replace(',', '.')) : undefined }, items };
  const { validateAndRun } = useZodForm(mobileCompositionFormSchema, formValues);
  const { validateValues: validateSearch } = useZodForm(submittedSearchFormSchema, { search: searchTerm });

  useEffect(() => {
    if (!visible || searchTerm.trim().length < 2) { setResults([]); setSearching(false); setSearchError(false); return; }
    let current = true;
    setSearching(true);
    setSearchError(false);
    const timer = setTimeout(async () => {
      try {
        const values = await validateSearch({ search: searchTerm });
        if (!values || !current) return;
        const result = await fetchMobileProductsPage(1, 5, { search: values.search, itemType: 'standard', statusFilter: 'active', includeDeactivated: false, throwOnError: true });
        if (!current) return;
        setResults(result.data.flatMap((product) => {
          const variations = (product.allVariations || product.variations || []).filter((variation: any) => variation.active !== false && !variation.merged_to_variation_id);
          return variations.length ? variations.map((variation: any) => ({ ...product, variation, variationName: variation.name, variationSku: variation.sku, variationPrice: variation.unitPrice ?? variation.price, variationStock: variation.stock })) : [product];
        }));
      } catch { if (current) { setResults([]); setSearchError(true); } }
      finally { if (current) setSearching(false); }
    }, 300);
    return () => { current = false; clearTimeout(timer); };
  }, [visible, searchTerm, validateSearch]);

  useEffect(() => {
    if (visible && composition) {
      setFormData(composition);
      setManualPriceInput(composition.manual_price === undefined ? '' : String(composition.manual_price));
      setItems(composition.variations?.[0]?.items || []);
    } else if (visible) {
      setFormData({
        active: true,
        catalog_published: true,
        pricing_mode: 'sum',
      });
      setItems([]);
      setManualPriceInput('');
      setActiveTab('info');
    }
  }, [visible, composition]);

  const handleAddItem = (product: any, variation?: any) => {
    const newItem: CompositionVariationItem = {
      product_id: product.id,
      variation_id: variation?.id,
      quantity: 1,
      productName: product.description || product.name,
      productSku: variation ? variation.sku : product.code,
      unitPrice: Number(variation?.unitPrice ?? variation?.price ?? product.unitPrice ?? product.sellPrice ?? product.price ?? 0),
      currentStock: variation ? variation.stock : product.stock,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const handleSave = async () => {
    if (isSaving) return;
    await validateAndRun(formValues, async (values) => {
    try {
      setIsSaving(true);
      const variationsToSave = [
        {
          id: composition?.variations?.[0]?.id,
          name: 'PadrÃ£o',
          sku: values.data.sku,
          items: values.items,
          active: true,
        },
      ];

      await saveComposition(values.data, variationsToSave);
      Alert.alert('Sucesso', 'ComposiÃ§Ã£o salva com sucesso!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a composiÃ§Ã£o.');
    } finally {
      setIsSaving(false);
    }
    }, (errors) => {
      Alert.alert('Revise a composição', Object.values(flattenFormErrors(errors))[0] || 'Revise os campos informados.');
      setActiveTab(errors.data ? 'info' : 'items');
    });
  };

  const themeColors = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    surface: isDarkMode ? '#1e293b' : '#f8fafc',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f1f5f9' : '#1e293b',
    textMuted: isDarkMode ? '#94a3b8' : '#64748b',
    primary: '#3b82f6',
    danger: '#ef4444',
  };

  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
        backgroundColor: themeColors.bg,
      }}
    >
      {[
        { id: 'info', label: 'Cadastro Geral', icon: FileText },
        { id: 'items', label: 'Produtos', icon: Package },
        { id: 'variations', label: 'VariaÃ§Ãµes', icon: Grid2X2 },
        { id: 'images', label: 'Fotos', icon: Images },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => setActiveTab(tab.id as any)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 2,
            borderBottomColor: activeTab === tab.id ? themeColors.primary : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <tab.icon
            size={16}
            color={activeTab === tab.id ? themeColors.primary : themeColors.textMuted}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: activeTab === tab.id ? themeColors.primary : themeColors.textMuted,
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              textTransform: 'uppercase',
              fontSize: 12,
            }}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderInfoTab = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ color: themeColors.text, fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>
        InformaÃ§Ãµes BÃ¡sicas
      </Text>

      <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4, marginTop: 8 }}>
        Nome da ComposiÃ§Ã£o *
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.surface,
          color: themeColors.text,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors.border,
        }}
        placeholder="Ex: Cozinha Compacta Paris"
        placeholderTextColor={themeColors.textMuted}
        value={formData.name || ''}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
      />

      <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4, marginTop: 16 }}>
        SKU Base
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.surface,
          color: themeColors.text,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors.border,
        }}
        placeholder="Ex: CMP-COZ-PARIS"
        placeholderTextColor={themeColors.textMuted}
        value={formData.sku || ''}
        onChangeText={(text) => setFormData({ ...formData, sku: text })}
      />

      <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4, marginTop: 16 }}>
        Modo de PrecificaÃ§Ã£o
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => setFormData({ ...formData, pricing_mode: 'sum' })}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: formData.pricing_mode === 'sum' ? themeColors.primary : themeColors.border,
            backgroundColor:
              formData.pricing_mode === 'sum' ? `${themeColors.primary}20` : themeColors.surface,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: formData.pricing_mode === 'sum' ? themeColors.primary : themeColors.text,
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            AutomÃ¡tico (Soma)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFormData({ ...formData, pricing_mode: 'fixed' })}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor:
              formData.pricing_mode === 'fixed' ? themeColors.primary : themeColors.border,
            backgroundColor:
              formData.pricing_mode === 'fixed' ? `${themeColors.primary}20` : themeColors.surface,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: formData.pricing_mode === 'fixed' ? themeColors.primary : themeColors.text,
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            Fixo Manual
          </Text>
        </TouchableOpacity>
      </View>

      {formData.pricing_mode === 'fixed' && (
        <>
          <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4 }}>
            PreÃ§o Fixo de Venda
          </Text>
          <TextInput
            style={{
              backgroundColor: themeColors.surface,
              color: themeColors.text,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: themeColors.border,
            }}
            placeholder="R$ 0,00"
            keyboardType="numeric"
            placeholderTextColor={themeColors.textMuted}
            value={manualPriceInput}
            onChangeText={setManualPriceInput}
          />
        </>
      )}
    </View>
  );

  const renderItemsTab = () => (
    <View style={{ padding: 16, flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16 }}>
            Itens da ComposiÃ§Ã£o
          </Text>
          <Text style={{ color: themeColors.textMuted, fontSize: 12 }}>
            A disponibilidade Ã© limitada pelo menor estoque.
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text
          style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}
        >
          + Adicionar Produto
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColors.surface,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
            paddingHorizontal: 12,
          }}
        >
          <Search size={16} color={themeColors.textMuted} />
          <TextInput
            style={{ flex: 1, padding: 12, color: themeColors.text }}
            placeholder="Buscar por nome ou cÃ³digo..."
            placeholderTextColor={themeColors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {searching && (
          <Text style={{ fontSize: 12, color: themeColors.textMuted, marginTop: 4 }}>
            Buscando...
          </Text>
        )}
        {!searching && searchError && (
          <Text style={{ fontSize: 12, color: themeColors.danger, marginTop: 4 }}>
            Erro ao buscar produtos.
          </Text>
        )}
        {!searching && !searchError && searchTerm.length >= 2 && results.length === 0 && (
          <Text style={{ fontSize: 12, color: themeColors.textMuted, marginTop: 4 }}>
            Nenhum produto encontrado.
          </Text>
        )}

        {results.length > 0 && (
          <View
            style={{
              borderWidth: 1,
              borderColor: themeColors.border,
              borderRadius: 8,
              backgroundColor: themeColors.surface,
              marginTop: 4,
              overflow: 'hidden',
            }}
          >
            {results.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={{
                  padding: 12,
                  borderBottomWidth: i < results.length - 1 ? 1 : 0,
                  borderBottomColor: themeColors.border,
                }}
                onPress={() => handleAddItem(r, r.variation)}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.text }}>
                  {r.name}
                  {r.variationName ? ' - ' + r.variationName : ''}
                </Text>
                <Text style={{ fontSize: 11, color: themeColors.textMuted }}>
                  {r.variationSku || r.code} â€¢ R${' '}
                  {Number(r.variationPrice ?? r.price ?? r.unit_price ?? 0).toFixed(2)} â€¢ Estoque:{' '}
                  {Number(r.variationStock ?? r.stock ?? 0)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {items.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            backgroundColor: themeColors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: themeColors.border,
            borderStyle: 'dashed',
          }}
        >
          <Package size={48} color={themeColors.textMuted} />
          <Text style={{ color: themeColors.text, fontWeight: 'bold', marginTop: 16 }}>
            ComposiÃ§Ã£o vazia
          </Text>
          <Text
            style={{
              color: themeColors.textMuted,
              textAlign: 'center',
              marginTop: 8,
              fontSize: 12,
            }}
          >
            Adicione produtos reais para que o estoque possa ser deduzido nas vendas.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {items.map((item, index) => (
            <View
              key={index}
              style={{
                backgroundColor: themeColors.surface,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: themeColors.border,
              }}
            >
              <Text
                style={{ color: themeColors.text, fontWeight: 'bold', marginBottom: 8 }}
                numberOfLines={1}
              >
                {item.productName}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: themeColors.textMuted, fontSize: 12 }}>
                  SKU: {item.productSku || 'S/N'}
                </Text>
                <Text style={{ color: '#059669', fontSize: 12, fontWeight: 'bold' }}>
                  Saldo: {item.currentStock || 0}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: themeColors.bg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => updateItemQuantity(index, Math.max(1, item.quantity - 1))}
                    style={{ padding: 8 }}
                  >
                    <Minus size={16} color={themeColors.text} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: themeColors.text,
                      fontWeight: 'bold',
                      width: 32,
                      textAlign: 'center',
                    }}
                  >
                    {item.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateItemQuantity(index, item.quantity + 1)}
                    style={{ padding: 8 }}
                  >
                    <Plus size={16} color={themeColors.text} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => removeItem(index)}
                  style={{ padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}
                >
                  <Trash2 size={16} color={themeColors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderConstructionTab = (name: string) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Hammer size={48} color={themeColors.textMuted} />
      <Text style={{ color: themeColors.text, fontWeight: 'bold', marginTop: 16 }}>
        Aba {name} em ConstruÃ§Ã£o
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: themeColors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: `${themeColors.primary}20`,
                padding: 8,
                borderRadius: 8,
                marginRight: 12,
              }}
            >
              <Layers size={20} color={themeColors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.text }}>
              {composition ? 'Editar ComposiÃ§Ã£o' : 'Nova ComposiÃ§Ã£o'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <X size={24} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        {renderTabs()}

        <View style={{ flex: 1 }}>
          {activeTab === 'info' && renderInfoTab()}
          {activeTab === 'items' && renderItemsTab()}
          {activeTab === 'variations' && renderConstructionTab('VariaÃ§Ãµes')}
          {activeTab === 'images' && renderConstructionTab('Fotos')}
        </View>

        {/* Footer */}
        <View
          style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
            backgroundColor: themeColors.bg,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: themeColors.surface,
            }}
            disabled={isSaving}
          >
            <Text style={{ color: themeColors.textMuted, fontWeight: 'bold' }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: themeColors.primary,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <Check size={16} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
