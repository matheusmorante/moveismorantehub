import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  supplier?: any;
  onSave: (data: any) => Promise<void>;
}

export const SupplierFormModal: React.FC<Props> = ({ visible, onClose, isDarkMode, supplier, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    cpf_cnpj: '',
    email: '',
    phone: '',
    city: '',
    state: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        full_name: supplier.full_name || supplier.name || '',
        cpf_cnpj: supplier.cpf_cnpj || supplier.documentNumber || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        city: supplier.city || '',
        state: supplier.state || ''
      });
    } else {
      setFormData({
        full_name: '',
        cpf_cnpj: '',
        email: '',
        phone: '',
        city: '',
        state: ''
      });
    }
  }, [supplier, visible]);

  const handleSave = async () => {
    if (!formData.full_name) {
        alert('O nome do fornecedor é obrigatório.');
        return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        ...(supplier ? { id: supplier.id } : {}),
        full_name: formData.full_name,
        cpf_cnpj: formData.cpf_cnpj,
        email: formData.email,
        phone: formData.phone,
        full_address: { city: formData.city, state: formData.state }
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar fornecedor');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
            {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.textDark]}>Nome / Razão Social *</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={formData.full_name}
              onChangeText={t => setFormData({ ...formData, full_name: t })}
              placeholder="Ex: Fornecedor ABC"
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.textDark]}>CPF / CNPJ</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={formData.cpf_cnpj}
              onChangeText={t => setFormData({ ...formData, cpf_cnpj: t })}
              placeholder="000.000.000-00"
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.textDark]}>E-mail</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={formData.email}
              onChangeText={t => setFormData({ ...formData, email: t })}
              placeholder="email@exemplo.com"
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.textDark]}>Telefone</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={formData.phone}
              onChangeText={t => setFormData({ ...formData, phone: t })}
              placeholder="(00) 00000-0000"
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={[styles.label, isDarkMode && styles.textDark]}>Cidade</Text>
                <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                value={formData.city}
                onChangeText={t => setFormData({ ...formData, city: t })}
                placeholder="Ex: São Paulo"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, isDarkMode && styles.textDark]}>UF</Text>
                <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                value={formData.state}
                onChangeText={t => setFormData({ ...formData, state: t })}
                placeholder="SP"
                maxLength={2}
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, isDarkMode && styles.footerDark]}>
          <TouchableOpacity 
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  headerDark: { backgroundColor: '#1e293b', borderBottomColor: '#334155' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  closeBtn: { padding: 4 },
  content: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#0f172a' },
  inputDark: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  footerDark: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
