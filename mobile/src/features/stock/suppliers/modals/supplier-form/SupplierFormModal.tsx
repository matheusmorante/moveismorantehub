import React from 'react';
import { Modal } from 'react-native';
import {
  SupplierAddress,
  SupplierFormData,
  SupplierFormItem,
} from '../../types/supplierForm.types';
import { useSupplierForm } from '../../hooks/useSupplierForm';
import { SupplierFormContent } from './SupplierFormContent';

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SupplierFormContent
        supplier={supplier}
        theme={theme}
        form={form}
        setForm={setForm}
        isSaving={isSaving}
        onClose={onClose}
        updateAddress={updateAddress}
        updateField={updateField}
        handleSave={handleSave}
      />
    </Modal>
  );
};

export { SupplierFormContent };
export default SupplierFormModal;
