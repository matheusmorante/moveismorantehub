import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  supplier?: any;
  onSave: (data: any) => Promise<void>;
}

const emptyForm = () => ({ personType: 'PF', fullName: '', tradeName: '', cpfCnpj: '', leadTime: '', email: '', phone: '', active: true, observation: '', fullAddress: { cep: '', street: '', number: '', neighborhood: '', complement: '', city: '', state: 'PR' } });
const formatDocument = (value: string, personType: string) => {
  const digits = value.replace(/\D/g, '').slice(0, personType === 'PJ' ? 14 : 11);
  if (personType === 'PJ') {
    return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 12), digits.slice(12, 14)]
      .filter(Boolean).reduce((result, part, index) => result + (index === 1 || index === 2 ? '.' : index === 3 ? '/' : index === 4 ? '-' : '') + part, '');
  }
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)]
    .filter(Boolean).reduce((result, part, index) => result + (index === 1 || index === 2 ? '.' : index === 3 ? '-' : '') + part, '');
};
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  const prefixLength = digits.length > 10 ? 5 : 4;
  return `(${area}) ${number.slice(0, prefixLength)}${number.length > prefixLength ? `-${number.slice(prefixLength)}` : ''}`;
};

export const SupplierFormModal: React.FC<Props> = ({ visible, onClose, isDarkMode, supplier, onSave }) => {
  const [form, setForm] = useState<any>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const theme = isDarkMode
    ? { bg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f8fafc', muted: '#94a3b8', input: '#0f172a' }
    : { bg: '#f8fafc', surface: '#fff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b', input: '#fff' };

  useEffect(() => {
    if (!visible) return;
    setForm(supplier ? {
      ...emptyForm(), ...supplier,
      personType: supplier.personType || supplier.person_type_pf_pj || 'PF',
      fullName: supplier.fullName || supplier.full_name || supplier.name || '',
      tradeName: supplier.tradeName || supplier.trade_name || supplier.nickname || '',
      cpfCnpj: supplier.cpfCnpj || supplier.cpf_cnpj || supplier.documentNumber || '',
      leadTime: String(supplier.leadTime ?? supplier.lead_time ?? ''),
      observation: supplier.observation || supplier.observations || '',
      fullAddress: { ...emptyForm().fullAddress, ...(supplier.fullAddress || supplier.full_address || supplier.address || {}) },
    } : emptyForm());
  }, [supplier, visible]);

  const updateAddress = (key: string, value: string) => setForm((current: any) => ({ ...current, fullAddress: { ...current.fullAddress, [key]: value } }));
  const field = (label: string, key: string, options: any = {}) => (
    <View style={styles.inputGroup} key={key}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
        value={String(options.addressKey ? form.fullAddress?.[options.addressKey] || '' : form[key] ?? '')}
        onChangeText={value => options.addressKey ? updateAddress(options.addressKey, value) : setForm((current: any) => ({ ...current, [key]: options.format ? options.format(value) : value }))}
        placeholder={options.placeholder || ''} placeholderTextColor={theme.muted}
        keyboardType={options.keyboardType} autoCapitalize={options.autoCapitalize || 'sentences'} maxLength={options.maxLength}
      />
    </View>
  );

  const handleSave = async () => {
    const name = form.fullName.trim();
    if (!name) {
      Alert.alert('Campo obrigatório', form.personType === 'PJ' ? 'A Razão Social é obrigatória.' : 'O nome é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ ...form, id: supplier?.id, fullName: name, leadTime: Number(form.leadTime) || 0, personType: form.personType, type: 'suppliers', active: form.active !== false, fullAddress: form.fullAddress, isDraft: false });
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      Alert.alert('Não foi possível salvar', err?.message || 'Tente novamente.');
    } finally { setIsSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View><Text style={[styles.headerTitle, { color: theme.text }]}>{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</Text><Text style={[styles.headerSubtitle, { color: theme.muted }]}>Cadastro de fornecedor</Text></View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Fechar formulário"><X size={23} color={theme.muted} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Identificação</Text>
          <View style={[styles.typeRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(['PF', 'PJ'] as const).map(type => <TouchableOpacity key={type} onPress={() => setForm((current: any) => ({ ...current, personType: type, cpfCnpj: formatDocument(current.cpfCnpj, type) }))} style={[styles.typeButton, form.personType === type && styles.typeButtonActive]} accessibilityRole="button" accessibilityState={{ selected: form.personType === type }}><Text style={[styles.typeButtonText, form.personType === type && styles.typeButtonTextActive]}>{type === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}</Text></TouchableOpacity>)}
          </View>
          {field(form.personType === 'PJ' ? 'Razão Social *' : 'Nome Completo *', 'fullName', { placeholder: form.personType === 'PJ' ? 'Razão Social da Empresa' : 'Nome do Fornecedor' })}
          {form.personType === 'PJ' ? field('Nome Fantasia', 'tradeName', { placeholder: 'Nome Popular / Fantasia' }) : null}
          {field(form.personType === 'PJ' ? 'CNPJ' : 'CPF', 'cpfCnpj', { placeholder: form.personType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00', keyboardType: 'number-pad', format: (value: string) => formatDocument(value, form.personType) })}
          {field('Lead Time (Dias)', 'leadTime', { placeholder: 'Tempo de entrega estimado', keyboardType: 'number-pad' })}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contato</Text>
          {field('Telefone', 'phone', { placeholder: '(00) 00000-0000', keyboardType: 'phone-pad', format: formatPhone })}
          {field('E-mail', 'email', { placeholder: 'exemplo@email.com', keyboardType: 'email-address', autoCapitalize: 'none' })}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Endereço</Text>
          {field('CEP', 'cep', { addressKey: 'cep', placeholder: '00000-000' })}
          {field('Logradouro', 'street', { addressKey: 'street', placeholder: 'Rua / Avenida' })}
          <View style={styles.inlineFields}>
            <View style={{ flex: 1 }}>{field('Número', 'number', { addressKey: 'number', placeholder: 'S/N' })}</View>
            <View style={{ flex: 2 }}>{field('Complemento', 'complement', { addressKey: 'complement' })}</View>
          </View>
          {field('Bairro', 'neighborhood', { addressKey: 'neighborhood' })}
          <View style={styles.inlineFields}>
            <View style={{ flex: 2 }}>{field('Cidade', 'city', { addressKey: 'city' })}</View>
            <View style={{ flex: 1 }}>{field('Estado (UF)', 'state', { addressKey: 'state', maxLength: 2, autoCapitalize: 'characters' })}</View>
          </View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Observações importantes</Text>
          <TextInput style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]} value={form.observation} onChangeText={value => setForm((current: any) => ({ ...current, observation: value }))} placeholder="Informações extras sobre o fornecedor" placeholderTextColor={theme.muted} multiline textAlignVertical="top" />
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.border }]} onPress={onClose} disabled={isSaving}><Text style={{ color: theme.muted, fontWeight: '800' }}>Cancelar</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} onPress={() => void handleSave()} disabled={isSaving} accessibilityRole="button" accessibilityLabel="Salvar fornecedor">
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{supplier ? 'Salvar Alterações' : 'Criar Fornecedor'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 28 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginTop: 10, marginBottom: 12 },
  typeRow: { borderWidth: 1, borderRadius: 12, padding: 4, flexDirection: 'row', gap: 5, marginBottom: 16 },
  typeButton: { minHeight: 42, flex: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  typeButtonActive: { backgroundColor: '#2563eb' },
  typeButtonText: { color: '#64748b', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  typeButtonTextActive: { color: '#fff' },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, fontWeight: '600' },
  multiline: { minHeight: 100, marginBottom: 12 },
  inlineFields: { flexDirection: 'row', gap: 10 },
  footer: { padding: 14, borderTopWidth: 1, flexDirection: 'row', gap: 10 },
  cancelButton: { minHeight: 48, borderWidth: 1, borderRadius: 11, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1, minHeight: 48, backgroundColor: '#2563eb', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
