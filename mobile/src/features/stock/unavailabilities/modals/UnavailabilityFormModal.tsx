import type React from 'react';
import { Modal } from 'react-native';
import { useMobileUnavailabilityForm } from '../hooks/useMobileUnavailabilityForm';
import { UnavailabilityFormContent } from './UnavailabilityFormContent';

interface Props {
  readonly isOpen: boolean;
  readonly isDarkMode: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export const UnavailabilityFormModal: React.FC<Props> = ({
  isOpen,
  isDarkMode,
  onClose,
  onSuccess,
}) => {
  const { state, actions } = useMobileUnavailabilityForm({
    isOpen,
    onClose,
    onSuccess,
  });

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={actions.handleClose}>
      <UnavailabilityFormContent
        isDarkMode={isDarkMode}
        state={state}
        actions={actions}
      />
    </Modal>
  );
};

export { UnavailabilityFormContent };
