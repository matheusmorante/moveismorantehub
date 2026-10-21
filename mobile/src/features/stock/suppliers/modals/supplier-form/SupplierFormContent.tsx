import React from 'react';
import {
  View,
  Text,
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
} from '../../types/supplierForm.types';
import { formatDocument, formatPhone } from '../../domain/supplierFormDomain';
import { styles } from './SupplierFormModal.styles';

export interface SupplierFormContentProps {
  readonly supplier?: SupplierFormItem | null;
  readonly theme: {
    bg: string;
    surface: string;
    border: string;
    text: string;
    muted: string;
    input: string;
  };
  readonly form: SupplierFormData;
  readonly setForm: React.Dispatch<React.SetStateAction<SupplierFormData>>;
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly updateAddress: (field: keyof SupplierAddress, value: string) => void;
  readonly updateField: (field: keyof Omit<SupplierFormData, 'fullAddress'>, value: string) => void;
  readonly handleSave: () => Promise<void>;
}

export const SupplierFormContent: React.FC<SupplierFormContentProps> = ({
  supplier,
  theme,
  form,
  setForm,
  isSaving,
  onClose,
  updateAddress,
  updateField,
  handleSave,
}) => {
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
  );
};
