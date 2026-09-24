import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Plus, Trash2, X } from 'lucide-react-native';
import { InventoryProductSearchModal, SearchableProduct } from '../inventory/components/InventoryProductSearchModal';
import { fetchMobileSuppliers } from '../../products/services/mobileSupplierService';
import { MobilePurchase, MobilePurchaseItem, saveMobilePurchase, updateMobilePurchase } from './mobilePurchaseService';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  purchase?: MobilePurchase | null;
  onClose: () => void;
  onSaved: () => void;
}

type Supplier = { id: string; name: string; full_name?: string; nickname?: string; social_name?: string };

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const parseNumber = (value: string) => Number(value.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;

export const PurchaseFormModal: React.FC<Props> = ({ visible, isDarkMode, purchase, onClose, onSaved }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [date, setDate] = useState('');
  const [observation, setObservation] = useState('');
  const [ipiPercent, setIpiPercent] = useState('0');
  const [freightPercent, setFreightPercent] = useState('0');
  const [items, setItems] = useState<MobilePurchaseItem[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc', surface: isDarkMode ? '#1e293b' : '#fff',
    border: isDarkMode ? '#334155' : '#e2e8f0', text: isDarkMode ? '#f8fafc' : '#0f172a',
    muted: isDarkMode ? '#94a3b8' : '#64748b',
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void fetchMobileSuppliers().then(data => { if (!cancelled) setSuppliers(data as Supplier[]); });
    setSupplierId(purchase?.supplierId || '');
    setSupplierName(purchase?.supplierName || '');
    setDate((purchase?.date || new Date().toISOString()).slice(0, 10));
    setObservation(purchase?.observation || '');
    setIpiPercent(String(purchase?.ipiPercent || 0));
    setFreightPercent(String(purchase?.freightPercent || 0));
    setItems(purchase?.items?.map(item => ({ ...item })) || []);
    return () => { cancelled = true; };
  }, [visible, purchase]);

  useEffect(() => {
    const factor = 1 + parseNumber(ipiPercent) / 100 + parseNumber(freightPercent) / 100;
    setItems(previous => previous.map(item => ({
      ...item,
      unitCost: Number(item.baseCost || 0) * factor,
      totalCost: Number(item.quantity || 0) * Number(item.baseCost || 0) * factor,
    })));
  }, [freightPercent, ipiPercent]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  }, [items]);

  const addProduct = (product: SearchableProduct) => {
    const existing = items.findIndex(item => item.variationId === product.variation_id && item.productId === product.id);
    if (existing >= 0) {
      setItems(previous => previous.map((item, index) => index === existing ? { ...item, quantity: item.quantity + 1 } : item));
      return;
    }
    setItems(previous => [...previous, {
      productId: product.id,
      variationId: product.variation_id,
      description: product.name || product.description || 'Produto',
      quantity: 1,
      baseCost: 0,
      unitCost: 0,
      totalCost: 0,
      sku: product.sku || undefined,
    }]);
  };

  const updateItem = (index: number, patch: Partial<MobilePurchaseItem>) => {
    setItems(previous => previous.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      const factor = 1 + parseNumber(ipiPercent) / 100 + parseNumber(freightPercent) / 100;
      next.unitCost = Number(next.baseCost || 0) * factor;
      next.totalCost = Number(next.quantity || 0) * next.unitCost;
      return next;
    }));
  };

  const handleSave = async () => {
    if (!supplierId || !supplierName) return Alert.alert('Fornecedor obrigatório', 'Selecione um fornecedor para continuar.');
    if (!items.length) return Alert.alert('Itens obrigatórios', 'Adicione ao menos um produto ou variação.');
    if (items.some(item => !item.productId || !item.description || Number(item.quantity) <= 0)) {
      return Alert.alert('Itens inválidos', 'Revise produto, variação e quantidade dos itens.');
    }
    setSaving(true);
    try {
      const payload: any = {
        supplierId, supplierName, date: new Date(`${date}T12:00:00`).toISOString(), observation,
        ipiPercent: parseNumber(ipiPercent), freightPercent: parseNumber(freightPercent), items,
        totalValue: total, status: purchase?.status === 'fulfilled' ? 'fulfilled' : 'ordered',
        stockProcessed: purchase?.stockProcessed || false, attachments: purchase?.attachments || [],
        invoiceNumber: purchase?.invoiceNumber, invoiceDate: purchase?.invoiceDate,
        invoiceStatus: purchase?.invoiceStatus, fiscalKey: purchase?.fiscalKey,
      };
      if (purchase?.id) await updateMobilePurchase(purchase.id, payload);
      else await saveMobilePurchase(payload);
      onSaved();
      onClose();
    } catch (cause: any) {
      Alert.alert('Não foi possível salvar', cause?.message || 'Tente novamente.');
    } finally { setSaving(false); }
  };

  const filteredSuppliers = suppliers.filter(item => item.name.toLowerCase().includes(supplierSearch.toLowerCase())).slice(0, 40);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: '#2563eb' }]}>
          <View style={styles.headerCopy}><Text style={styles.headerTitle}>{purchase ? 'Editar pedido de compra' : 'Novo pedido de compra'}</Text><Text style={styles.headerSubtitle}>Produtos e variações</Text></View>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}><X size={24} color="#fff" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados do pedido</Text>
            <Text style={[styles.label, { color: colors.muted }]}>Fornecedor</Text>
            <TouchableOpacity style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.bg }]} onPress={() => setSupplierOpen(true)}>
              <Text style={{ color: supplierName ? colors.text : colors.muted, flex: 1 }}>{supplierName || 'Selecione um fornecedor'}</Text>
              <Text style={{ color: '#2563eb', fontWeight: '800' }}>Selecionar</Text>
            </TouchableOpacity>
            <Text style={[styles.label, { color: colors.muted }]}>Data</Text>
            <TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
            <View style={styles.row}>
              <View style={styles.half}><Text style={[styles.label, { color: colors.muted }]}>IPI (%)</Text><TextInput value={ipiPercent} onChangeText={setIpiPercent} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} /></View>
              <View style={styles.half}><Text style={[styles.label, { color: colors.muted }]}>Frete (%)</Text><TextInput value={freightPercent} onChangeText={setFreightPercent} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} /></View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Itens ({items.length})</Text><TouchableOpacity style={styles.addButton} onPress={() => setProductPickerOpen(true)}><Plus size={16} color="#fff" /><Text style={styles.addButtonText}>Adicionar</Text></TouchableOpacity></View>
            {items.length === 0 ? <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhum item adicionado. Selecione a variação do produto.</Text> : items.map((item, index) => (
              <View key={`${item.productId}-${item.variationId || index}`} style={[styles.item, { borderColor: colors.border }]}>
                <View style={styles.itemHeader}><View style={styles.itemCopy}><Text style={[styles.itemName, { color: colors.text }]}>{item.description}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{item.sku ? `SKU ${item.sku}` : 'Variação selecionada'}</Text></View><TouchableOpacity onPress={() => setItems(previous => previous.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={18} color="#dc2626" /></TouchableOpacity></View>
                <View style={styles.row}><View style={styles.half}><Text style={[styles.label, { color: colors.muted }]}>Quantidade</Text><TextInput value={String(item.quantity)} onChangeText={value => updateItem(index, { quantity: parseNumber(value) })} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} /></View><View style={styles.half}><Text style={[styles.label, { color: colors.muted }]}>Custo unitário</Text><TextInput value={String(item.baseCost || '')} onChangeText={value => { const cost = parseNumber(value); updateItem(index, { baseCost: cost, unitCost: cost }); }} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} /></View></View>
                <Text style={[styles.itemTotal, { color: '#059669' }]}>Subtotal: {money(Number(item.quantity || 0) * Number(item.unitCost || item.baseCost || 0))}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Observação</Text><TextInput value={observation} onChangeText={setObservation} multiline placeholder="Observações do pedido" placeholderTextColor={colors.muted} style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} /></View>
          <View style={[styles.totalBox, { borderColor: '#a7f3d0', backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' }]}><Text style={{ color: isDarkMode ? '#a7f3d0' : '#047857', fontWeight: '900' }}>Total do pedido</Text><Text style={{ color: isDarkMode ? '#a7f3d0' : '#047857', fontWeight: '900', fontSize: 20 }}>{money(total)}</Text></View>
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity onPress={onClose} style={[styles.cancelButton, { borderColor: colors.border }]}><Text style={{ color: colors.muted, fontWeight: '800' }}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={saving} onPress={() => void handleSave()} style={styles.saveButton}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{purchase ? 'Salvar alterações' : 'Confirmar pedido'}</Text>}</TouchableOpacity></View>
      </KeyboardAvoidingView>
      <Modal visible={supplierOpen} animationType="slide" onRequestClose={() => setSupplierOpen(false)}><View style={[styles.flex, { backgroundColor: colors.bg }]}><View style={styles.pickerHeader}><Text style={styles.pickerTitle}>Selecionar fornecedor</Text><TouchableOpacity onPress={() => setSupplierOpen(false)}><X size={24} color={colors.text} /></TouchableOpacity></View><TextInput autoFocus value={supplierSearch} onChangeText={setSupplierSearch} placeholder="Buscar fornecedor" placeholderTextColor={colors.muted} style={[styles.input, { margin: 16, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} /><ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>{filteredSuppliers.map(item => <TouchableOpacity key={item.id} onPress={() => { setSupplierId(item.id); setSupplierName(item.name); setSupplierOpen(false); }} style={[styles.supplierRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text></TouchableOpacity>)}</ScrollView></View></Modal>
      <InventoryProductSearchModal isDarkMode={isDarkMode} visible={productPickerOpen} onClose={() => setProductPickerOpen(false)} onSelect={addProduct} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 }, header: { minHeight: 82, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }, headerCopy: { flex: 1 }, headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' }, headerSubtitle: { color: 'rgba(255,255,255,.8)', marginTop: 3 }, iconButton: { padding: 6 }, content: { padding: 16, gap: 14 }, section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 3 }, label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 5 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 }, selector: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }, row: { flexDirection: 'row', gap: 10 }, half: { flex: 1 }, addButton: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, addButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 }, emptyText: { textAlign: 'center', paddingVertical: 20, lineHeight: 18 }, item: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 6 }, itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, itemCopy: { flex: 1 }, itemName: { fontWeight: '900', fontSize: 13 }, itemTotal: { textAlign: 'right', fontSize: 12, fontWeight: '900' }, textArea: { minHeight: 90, borderWidth: 1, borderRadius: 10, padding: 12, textAlignVertical: 'top' }, totalBox: { borderWidth: 1, borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, footer: { borderTopWidth: 1, padding: 12, flexDirection: 'row', gap: 10 }, cancelButton: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, saveButton: { flex: 1.4, minHeight: 46, borderRadius: 11, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#fff', fontWeight: '900' }, pickerHeader: { padding: 18, paddingTop: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pickerTitle: { fontSize: 19, fontWeight: '900', color: '#0f172a' }, supplierRow: { borderWidth: 1, borderRadius: 11, padding: 14 },
});
