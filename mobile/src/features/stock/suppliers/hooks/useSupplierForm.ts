import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { createPersonFormSchema } from '../../../../../../shared-utils/personDomainValidation';
import {
  SupplierAddress,
  SupplierFormData,
  SupplierFormItem,
} from '../types/supplierForm.types';
import { emptySupplierForm } from '../domain/supplierFormDomain';

export interface UseSupplierFormProps {
  readonly visible: boolean;
  readonly supplier?: SupplierFormItem | null;
  readonly showStockOriginOptions?: boolean;
  readonly onSave: (data: Record<string, unknown>) => Promise<void>;
  readonly onClose: () => void;
}

export function useSupplierForm({
  visible,
  supplier,
  showStockOriginOptions = false,
  onSave,
  onClose,
}: UseSupplierFormProps) {
  const [form, setForm] = useState<SupplierFormData>(emptySupplierForm());
  const [isSaving, setIsSaving] = useState(false);
  const personForm = useZodForm(createPersonFormSchema('suppliers'), form);

  useEffect(() => {
    if (!visible) return;
    const nextForm: SupplierFormData = supplier
      ? {
          ...emptySupplierForm(),
          ...supplier,
          personType: supplier.personType || supplier.person_type_pf_pj || 'PF',
          fullName: supplier.fullName || supplier.full_name || supplier.name || '',
          tradeName: supplier.tradeName || supplier.trade_name || supplier.nickname || '',
          cpfCnpj: supplier.cpfCnpj || supplier.cpf_cnpj || supplier.documentNumber || '',
          leadTime: String(supplier.leadTime ?? supplier.lead_time ?? ''),
          observation: supplier.observation || supplier.observations || '',
          fullAddress: {
            ...emptySupplierForm().fullAddress,
            ...(supplier.fullAddress || supplier.full_address || supplier.address || {}),
          },
        }
      : emptySupplierForm();

    if (showStockOriginOptions) {
      const existingStockOrigins =
        supplier?.stockOrigins !== undefined ? supplier.stockOrigins : supplier?.stock_origins;
      nextForm.stockOrigins = existingStockOrigins === undefined ? ['normal'] : existingStockOrigins;
    }

    setForm(nextForm);
  }, [supplier, visible, showStockOriginOptions]);

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

  return {
    form,
    setForm,
    isSaving,
    updateAddress,
    updateField,
    handleSave,
  };
}
