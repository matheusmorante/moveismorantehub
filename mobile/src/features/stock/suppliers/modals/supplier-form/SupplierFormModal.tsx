import React from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  readonly showStockOriginOptions?: boolean;
  readonly onSave: (data: Record<string, unknown>) => Promise<void>;
}

export const SupplierFormModal: React.FC<Props> = ({
  visible,
  onClose,
  isDarkMode,
  supplier,
  showStockOriginOptions = false,
  onSave,
}) => {
  const { form, setForm, isSaving, updateAddress, updateField, handleSave } = useSupplierForm({
    visible,
    supplier,
    showStockOriginOptions,
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
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
        <SupplierFormContent
          supplier={supplier}
          showStockOriginOptions={showStockOriginOptions}
          theme={theme}
          form={form}
          setForm={setForm}
          isSaving={isSaving}
          onClose={onClose}
          updateAddress={updateAddress}
          updateField={updateField}
          handleSave={handleSave}
        />
      </SafeAreaView>
    </Modal>
  );
};

export { SupplierFormContent };
export default SupplierFormModal;
