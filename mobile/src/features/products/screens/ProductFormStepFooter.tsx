import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ChevronRight, Save } from 'lucide-react-native';
import type React from 'react';
import { styles } from './productFormScreen.styles';

interface Props {
  dark: boolean;
  isDraftProduct: boolean;
  handleSubmit: (isDraft: boolean) => Promise<void>;
  saving: boolean;
  autoSaveStatus: 'idle' | 'saved' | 'saving' | 'error';
  handleRequestClose: () => void;
  isLastStep: boolean;
  handleNextStep: () => void;
  product?: any | null;
}

export const ProductFormStepFooter: React.FC<Props> = ({
  dark,
  isDraftProduct,
  handleSubmit,
  saving,
  autoSaveStatus,
  handleRequestClose,
  isLastStep,
  handleNextStep,
  product,
}) => (
  <View style={[styles.footer, dark && styles.darkFooter]}>
    {isDraftProduct && (
      <TouchableOpacity
        onPress={() => handleSubmit(true)}
        disabled={saving || autoSaveStatus === 'saving'}
        style={[styles.draftBtn, dark && styles.darkBtn]}
      >
        <Save size={15} color={dark ? '#94a3b8' : '#64748b'} />
        <Text style={[styles.draftBtnText, dark && styles.dimText]}>Salvar rascunho</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      onPress={handleRequestClose}
      disabled={saving || autoSaveStatus === 'saving'}
      style={[styles.discardBtn, dark && styles.darkBtn]}
      accessibilityRole="button"
    >
      <Text style={[styles.discardBtnText, dark && styles.dimText]}>
        {isDraftProduct ? 'Cancelar' : 'Descartar alterações'}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={isLastStep ? () => handleSubmit(false) : handleNextStep}
      disabled={saving || autoSaveStatus === 'saving'}
      style={[styles.saveBtn, isLastStep && styles.finalSaveBtn]}
      accessibilityRole="button"
    >
      {saving ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          {isLastStep ? <Check size={16} color="#ffffff" /> : null}
          <Text style={styles.saveBtnText}>
            {isLastStep
              ? product
                ? 'Salvar alterações'
                : 'Cadastrar produto'
              : 'Próxima etapa'}
          </Text>
          {!isLastStep ? <ChevronRight size={16} color="#ffffff" /> : null}
        </>
      )}
    </TouchableOpacity>
  </View>
);
