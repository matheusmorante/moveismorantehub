import { useState, useCallback } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type { WhatsAppAiAgentFormData } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

export function useTestPhoneNumbersManagement(
  watchedNumbers: string[],
  setValue: UseFormSetValue<WhatsAppAiAgentFormData>
) {
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleAddPhone = useCallback(() => {
    setPhoneError('');
    const raw = phoneInput.trim();
    const digits = raw.replace(/\D/g, '');

    if (!digits || digits.length < 8) {
      setPhoneError('Digite um número de telefone válido com DDD (ex: 41 99999-9999).');
      return;
    }

    if (watchedNumbers.some((p) => p.replace(/\D/g, '') === digits)) {
      setPhoneError('Este número já está na lista autorizada.');
      return;
    }

    let normalizedPhone = digits;
    if (digits.length === 10 || digits.length === 11) {
      normalizedPhone = `55${digits}`;
    }

    setValue('testPhoneNumbers', [...watchedNumbers, normalizedPhone], {
      shouldValidate: true,
      shouldDirty: true,
    });
    setPhoneInput('');
  }, [phoneInput, watchedNumbers, setValue]);

  const handleRemovePhone = useCallback((indexToRemove: number) => {
    const updated = watchedNumbers.filter((_, idx) => idx !== indexToRemove);
    setValue('testPhoneNumbers', updated, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [watchedNumbers, setValue]);

  const resetPhoneInput = useCallback(() => {
    setPhoneInput('');
    setPhoneError('');
  }, []);

  return {
    phoneInput,
    phoneError,
    setPhoneInput,
    setPhoneError,
    handleAddPhone,
    handleRemovePhone,
    resetPhoneInput,
  };
}
