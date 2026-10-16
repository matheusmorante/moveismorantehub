import { useState, useEffect } from 'react';
import Person from '@/pages/types/person.type';
import { getSettings } from '@/pages/utils/settingsService';
import { createPersonFormSchema } from '@/pages/utils/personService/personFormValidation';
import { useZodForm } from '@/hooks/useZodForm';
import { setTestArtifactMode } from '../../../../../../../../shared-utils/testArtifactContext';
import { readTestArtifactIdentity } from '../../../../../../../../shared-utils/testArtifactPolicy';

import { createInitialPersonState } from './personFormState';
import { usePersonAddress } from './usePersonAddress';
import { usePersonContacts } from './usePersonContacts';
import { useEmployeeRoles, EMPLOYEE_ROLES } from './useEmployeeRoles';
import { usePersonSubmit } from './usePersonSubmit';

export { EMPLOYEE_ROLES };

export interface UsePersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (person: Person) => void;
  person?: Person | null;
  collectionName: string;
  title: string;
  canManageAccessRoles?: boolean;
  canMarkTestArtifact?: boolean;
}

export const usePersonForm = ({
  isOpen,
  onClose,
  onSuccess,
  person,
  collectionName,
  title,
  canManageAccessRoles = false,
  canMarkTestArtifact = false,
}: UsePersonFormProps) => {
  const isEmployee = collectionName === 'employees';

  const [formData, setFormData] = useState<Partial<Person>>(() =>
    createInitialPersonState(collectionName, person, title)
  );

  const [settings] = useState(getSettings());
  const form = useZodForm(
    createPersonFormSchema(collectionName, settings.requiredFields),
    formData
  );

  const isTestArtifact = Boolean(readTestArtifactIdentity(formData));

  // Reset/sync form state when modal opens or person changes
  useEffect(() => {
    setFormData(createInitialPersonState(collectionName, person, title));
  }, [person, isOpen, collectionName, title]);

  // Sub-hook: Address handling & CEP lookup
  const {
    isAddressOpen,
    setIsAddressOpen,
    handleAddressChange,
    handleCepBlur,
    routeUrl,
  } = usePersonAddress({
    formData,
    setFormData,
    isEmployee,
    person,
  });

  // Sub-hook: Additional contacts list management
  const {
    addAdditionalContact,
    removeAdditionalContact,
    updateAdditionalContact,
  } = usePersonContacts({
    formData,
    setFormData,
  });

  // Sub-hook: Employee role management and email blur sync
  const { toggleEmployeeRole, handleEmployeeEmailBlur } = useEmployeeRoles({
    formData,
    setFormData,
    isEmployee,
    person,
  });

  // Sub-hook: Submission pipeline using Strategy Pattern
  const { loading, handleSubmit } = usePersonSubmit({
    form,
    formData,
    collectionName,
    person,
    isTestArtifact,
    canManageAccessRoles,
    onSuccess,
    onClose,
  });

  const setIsTestArtifact = (enabled: boolean) => {
    if (!canMarkTestArtifact || person || collectionName !== 'customers') return;
    setFormData((prev) => setTestArtifactMode(prev, 'fullAddress', enabled));
  };

  return {
    form,
    formData,
    setFormData,
    isTestArtifact,
    setIsTestArtifact,
    canMarkTestArtifact: canMarkTestArtifact && !person && collectionName === 'customers',
    loading,
    settings,
    isEmployee,
    isAddressOpen,
    setIsAddressOpen,
    routeUrl,
    toggleEmployeeRole,
    handleEmployeeEmailBlur,
    handleAddressChange,
    handleCepBlur,
    addAdditionalContact,
    removeAdditionalContact,
    updateAdditionalContact,
    handleSubmit,
  };
};
