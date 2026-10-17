import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import {
  FieldOptions,
  SupplierAddress,
  SupplierFormData,
  SupplierFormItem,
} from './types/supplierForm.types';
import { formatDocument, formatPhone } from './domain/supplierFormDomain';
import { useSupplierForm } from './hooks/useSupplierForm';
import { styles } from './SupplierFormModal.styles';

export type { SupplierAddress, SupplierFormData, SupplierFormItem };

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly isDarkMode: boolean;
  readonly supplier?: SupplierFormItem | null;
  readonly onSave: (data: Record<string, unknown>) => Promise<void>;
}

export const SupplierFormModal: React.FC<Props> = ({
  visible,
  onClose,
  isDarkMode,
  supplier,
  onSave,
}) => {
  const { form, setForm, isSaving, updateAddress, updateField, handleSave } = useSupplierForm({
    visible,
    supplier,
    onSave,
    onClose,
  });

  const theme = isDarkMode
    ? {
        bg: '#0f172a',
        surface: '#1e293b',
        border: '#334155',
        text: '#f8fafc',
        muted: '#94a3b8',
        input: '#0f172a',
      }
    : {
        bg: '#f8fafc',
        surface: '#fff',
        border: '#e2e8f0',
        text: '#0f172a',
        muted: '#64748b',
        input: '#fff',
      };

  const field = (
    label: string,
    key: keyof Omit<SupplierFormData, 'fullAddress'> | keyof SupplierAddress,
    options: FieldOptions = {}
  ) => (
    <View style={styles.inputGroup} key={key}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.input, borderColor: theme.border },
        ]}
        value={String(
          options.addressKey
            ? form.fullAddress[options.addressKey] || ''
            : (form[key as keyof Omit<SupplierFormData, 'fullAddress'>] ?? '')
        )}
        onChangeText={(value) =>
          options.addressKey
            ? updateAddress(options.addressKey, value)
            : updateField(
                key as keyof Omit<SupplierFormData, 'fullAddress'>,
                options.format ? options.format(value) : value
              )
        }
        placeholder={options.placeholder || ''}
        placeholderTextColor={theme.muted}
        keyboardType={options.keyboardType}
        autoCapitalize={options.autoCapitalize || 'sentences'}
        maxLength={options.maxLength}
      />
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
        style={[styles.container, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.muted }]}>
              Cadastro de fornecedor
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Fechar formulário"
          >
            <X size={23} color={theme.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Identificação</Text>
          <View
            style={[styles.typeRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            {(['PF', 'PJ'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    personType: type,
                    cpfCnpj: formatDocument(current.cpfCnpj, type),
                  }))
                }
                style={[styles.typeButton, form.personType === type && styles.typeButtonActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: form.personType === type }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    form.personType === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {field(form.personType === 'PJ' ? 'Razão Social *' : 'Nome Completo *', 'fullName', {
            placeholder:
              form.personType === 'PJ' ? 'Razão Social da Empresa' : 'Nome do Fornecedor',
          })}
          {form.personType === 'PJ'
            ? field('Nome Fantasia', 'tradeName', { placeholder: 'Nome Popular / Fantasia' })
            : null}
          {field(form.personType === 'PJ' ? 'CNPJ' : 'CPF', 'cpfCnpj', {
            placeholder: form.personType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00',
            keyboardType: 'number-pad',
            format: (value: string) => formatDocument(value, form.personType),
          })}
          {field('Lead Time (Dias)', 'leadTime', {
            placeholder: 'Tempo de entrega estimado',
            keyboardType: 'number-pad',
          })}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contato</Text>
          {field('Telefone', 'phone', {
            placeholder: '(00) 00000-0000',
            keyboardType: 'phone-pad',
            format: formatPhone,
          })}
          {field('E-mail', 'email', {
            placeholder: 'exemplo@email.com',
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Endereço</Text>
          {field('CEP', 'cep', { addressKey: 'cep', placeholder: '00000-000' })}
          {field('Logradouro', 'street', { addressKey: 'street', placeholder: 'Rua / Avenida' })}
          <View style={styles.inlineFields}>
            <View style={{ flex: 1 }}>
              {field('Número', 'number', { addressKey: 'number', placeholder: 'S/N' })}
            </View>
            <View style={{ flex: 2 }}>
              {field('Complemento', 'complement', { addressKey: 'complement' })}
            </View>
          </View>
          {field('Bairro', 'neighborhood', { addressKey: 'neighborhood' })}
          <View style={styles.inlineFields}>
            <View style={{ flex: 2 }}>{field('Cidade', 'city', { addressKey: 'city' })}</View>
            <View style={{ flex: 1 }}>
              {field('Estado (UF)', 'state', {
                addressKey: 'state',
                maxLength: 2,
                autoCapitalize: 'characters',
              })}
            </View>
          </View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Observações importantes</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { color: theme.text, backgroundColor: theme.input, borderColor: theme.border },
            ]}
            value={form.observation}
            onChangeText={(value) =>
              setForm((current) => ({ ...current, observation: value }))
            }
            placeholder="Informações extras sobre o fornecedor"
            placeholderTextColor={theme.muted}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
        <View
          style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}
        >
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={{ color: theme.muted, fontWeight: '800' }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            onPress={() => void handleSave()}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Salvar fornecedor"
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {supplier ? 'Salvar Alterações' : 'Criar Fornecedor'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SupplierFormModal;
