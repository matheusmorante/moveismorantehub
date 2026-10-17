import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { createPersonFormSchema } from '../../../../../shared-utils/personDomainValidation';

export interface SupplierAddress {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
  [key: string]: unknown;
}

export interface SupplierFormData {
  id?: string;
  personType: 'PF' | 'PJ';
  fullName: string;
  tradeName: string;
  cpfCnpj: string;
  leadTime: string;
  email: string;
  phone: string;
  active: boolean;
  observation: string;
  fullAddress: SupplierAddress;
  [key: string]: unknown;
}

interface FieldOptions {
  addressKey?: keyof SupplierAddress;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  format?: (value: string) => string;
}

export interface SupplierFormItem extends Partial<SupplierFormData> {
  id?: string;
  full_name?: string;
  trade_name?: string;
  nickname?: string;
  name?: string;
  person_type_pf_pj?: 'PF' | 'PJ';
  cpf_cnpj?: string;
  documentNumber?: string;
  lead_time?: number;
  observations?: string;
  full_address?: Partial<SupplierAddress>;
  address?: Partial<SupplierAddress>;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  supplier?: SupplierFormItem | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

const emptyForm = (): SupplierFormData => ({
  personType: 'PF',
  fullName: '',
  tradeName: '',
  cpfCnpj: '',
  leadTime: '',
  email: '',
  phone: '',
  active: true,
  observation: '',
  fullAddress: {
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: 'PR',
  },
});

const formatDocument = (value: string, personType: string) => {
  const digits = (
    personType === 'PJ'
      ? value.toUpperCase().replace(/[^0-9A-Z]/g, '')
      : value.replace(/\D/g, '')
  ).slice(0, personType === 'PJ' ? 14 : 11);

  if (personType === 'PJ') {
    return [
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 8),
      digits.slice(8, 12),
      digits.slice(12, 14),
    ]
      .filter(Boolean)
      .reduce(
        (result, part, index) =>
          result +
          (index === 1 || index === 2 ? '.' : index === 3 ? '/' : index === 4 ? '-' : '') +
          part,
        ''
      );
  }
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)]
    .filter(Boolean)
    .reduce(
      (result, part, index) =>
        result + (index === 1 || index === 2 ? '.' : index === 3 ? '-' : '') + part,
      ''
    );
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  const prefixLength = digits.length > 10 ? 5 : 4;
  return `(${area}) ${number.slice(0, prefixLength)}${number.length > prefixLength ? `-${number.slice(prefixLength)}` : ''}`;
};

export const SupplierFormModal: React.FC<Props> = ({
  visible,
  onClose,
  isDarkMode,
  supplier,
  onSave,
}) => {
  const [form, setForm] = useState<SupplierFormData>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const personForm = useZodForm(createPersonFormSchema('suppliers'), form);
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

  useEffect(() => {
    if (!visible) return;
    setForm(
      supplier
        ? {
            ...emptyForm(),
            ...supplier,
            personType: supplier.personType || supplier.person_type_pf_pj || 'PF',
            fullName: supplier.fullName || supplier.full_name || supplier.name || '',
            tradeName: supplier.tradeName || supplier.trade_name || supplier.nickname || '',
            cpfCnpj: supplier.cpfCnpj || supplier.cpf_cnpj || supplier.documentNumber || '',
            leadTime: String(supplier.leadTime ?? supplier.lead_time ?? ''),
            observation: supplier.observation || supplier.observations || '',
            fullAddress: {
              ...emptyForm().fullAddress,
              ...(supplier.fullAddress || supplier.full_address || supplier.address || {}),
            },
          }
        : emptyForm()
    );
  }, [supplier, visible]);

  const updateAddress = (key: keyof SupplierAddress, value: string) =>
    setForm((current) => ({
      ...current,
      fullAddress: { ...current.fullAddress, [key]: value },
    }));

  const updateField = (key: keyof Omit<SupplierFormData, 'fullAddress'>, value: string) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

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

  const handleSave = async () => {
    await personForm.validateAndRun(
      form,
      async (validated) => {
        setIsSaving(true);
        try {
          await onSave({
            ...validated,
            id: supplier?.id,
            fullName: (validated.fullName || '').trim(),
            leadTime: validated.leadTime || 0,
            personType: validated.personType,
            type: 'suppliers',
            active: validated.active !== false,
            fullAddress: validated.fullAddress,
            isDraft: false,
          });
          onClose();
        } catch (err: unknown) {
          console.error('Erro ao salvar fornecedor:', err);
          const message =
            err instanceof Error
              ? err.message
              : typeof err === 'object' && err && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'Tente novamente.';
          Alert.alert('Não foi possível salvar', message);
        } finally {
          setIsSaving(false);
        }
      },
      (errors) => Alert.alert('Campo obrigatório', Object.values(flattenFormErrors(errors))[0])
    );
  };

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 4 },
  content: { padding: 18, gap: 14 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  typeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  typeButtonActive: {
    backgroundColor: '#0284c7',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  multiline: { height: 90, textAlignVertical: 'top' },
  inlineFields: { flexDirection: 'row', gap: 10 },
  footer: {
    flexDirection: 'row',
    padding: 18,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
