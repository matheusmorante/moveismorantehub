import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Person from '@/pages/types/person.type';
import { savePerson } from '@/pages/utils/personService';
import { capitalizePerson } from '@/pages/utils/formatters';
import { flattenFormErrors, UseZodFormReturn } from '@/hooks/useZodForm';
import { getPersonCollectionStrategy } from './personSubmitStrategy';

export interface UsePersonSubmitProps {
  form: UseZodFormReturn<any>;
  formData: Partial<Person>;
  collectionName: string;
  person?: Person | null;
  isTestArtifact: boolean;
  canManageAccessRoles: boolean;
  onSuccess?: (person: Person) => void;
  onClose: () => void;
}

export const usePersonSubmit = ({
  form,
  formData,
  collectionName,
  person,
  isTestArtifact,
  canManageAccessRoles,
  onSuccess,
  onClose,
}: UsePersonSubmitProps) => {
  const [loading, setLoading] = useState(false);
  const strategy = getPersonCollectionStrategy(collectionName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    return form.validateAndRun(
      formData,
      async (validatedData: Partial<Person>) => {
        setLoading(true);
        try {
          const isValidPreSubmit = await strategy.validatePreSubmit(
            validatedData,
            person?.id
          );
          if (!isValidPreSubmit) return;

          if (!person) {
            const canProceed = await strategy.checkDuplicates(
              validatedData,
              collectionName
            );
            if (!canProceed) return;
          }

          const capitalized = capitalizePerson({
            ...validatedData,
            isDraft: false,
          } as Person);

          const dataToSave = strategy.prepareData(capitalized);
          const isNew = !person;
          const saveOptions = strategy.getSaveOptions(isNew, isTestArtifact);

          const savedPerson = saveOptions
            ? await savePerson(
                dataToSave.type || collectionName,
                dataToSave,
                saveOptions
              )
            : await savePerson(dataToSave.type || collectionName, dataToSave);

          await strategy.afterSave(
            savedPerson,
            person,
            canManageAccessRoles
          );

          toast.success(person ? 'Atualizado com sucesso!' : 'Criado com sucesso!');
          if (onSuccess) onSuccess(savedPerson);
          onClose();
        } catch (error) {
          toast.error('Erro ao salvar.');
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
    );
  };

  return {
    loading,
    handleSubmit,
  };
};
