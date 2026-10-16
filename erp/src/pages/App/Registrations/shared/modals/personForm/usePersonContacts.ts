import React from 'react';
import Person from '@/pages/types/person.type';

export interface UsePersonContactsProps {
  formData: Partial<Person>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
}

export const usePersonContacts = ({
  formData,
  setFormData,
}: UsePersonContactsProps) => {
  const addAdditionalContact = () => {
    const current = formData.additionalContacts || [];
    setFormData((prev) => ({
      ...prev,
      additionalContacts: [...current, { name: '', phone: '' }],
    }));
  };

  const removeAdditionalContact = (index: number) => {
    const current = formData.additionalContacts || [];
    setFormData((prev) => ({
      ...prev,
      additionalContacts: current.filter((_, i) => i !== index),
    }));
  };

  const updateAdditionalContact = (
    index: number,
    field: 'name' | 'phone',
    value: string
  ) => {
    const current = formData.additionalContacts || [];
    const updated = current.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    setFormData((prev) => ({
      ...prev,
      additionalContacts: updated,
    }));
  };

  return {
    addAdditionalContact,
    removeAdditionalContact,
    updateAdditionalContact,
  };
};
