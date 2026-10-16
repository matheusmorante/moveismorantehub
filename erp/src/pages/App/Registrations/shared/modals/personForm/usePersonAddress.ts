import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import Person from '@/pages/types/person.type';
import { changeAddressField } from '../../../../../../../../shared-utils/addressSelection';
import { cepLookupFormSchema } from '../../../../../../../../shared-utils/lookupFormSchemas';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { getAddressByCep } from '@/pages/utils/maps';
import {
  EMPTY_PERSON_ADDRESS,
  isFinalConsumer,
  resolveShippingRouteUrl,
} from './personFormState';

export interface UsePersonAddressProps {
  formData: Partial<Person>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
  isEmployee: boolean;
  person?: Person | null;
}

export const usePersonAddress = ({
  formData,
  setFormData,
  isEmployee,
  person,
}: UsePersonAddressProps) => {
  const [isAddressOpen, setIsAddressOpen] = useState(!isEmployee);
  const cepLookupForm = useZodForm(cepLookupFormSchema, { cep: '' });
  const cepLookupRevision = useRef(0);

  // Sync accordion state on person load
  useEffect(() => {
    if (person) {
      if (isEmployee) {
        const hasAddressData = Boolean(
          person.fullAddress?.street ||
            person.fullAddress?.cep ||
            person.fullAddress?.city
        );
        setIsAddressOpen(hasAddressData);
      } else {
        setIsAddressOpen(true);
      }
    } else {
      setIsAddressOpen(!isEmployee);
    }
  }, [person, isEmployee]);

  // Auto-enable noAddress for "Consumidor Final" in customer registration
  useEffect(() => {
    if (!formData.fullName) return;
    if (isFinalConsumer(formData.fullName) && !formData.noAddress) {
      setFormData((prev) => ({ ...prev, noAddress: true }));
    }
  }, [formData.fullName, formData.noAddress, setFormData]);

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev: Partial<Person>) => {
      const currentAddress = prev.fullAddress || { ...EMPTY_PERSON_ADDRESS };
      return {
        ...prev,
        fullAddress: changeAddressField(currentAddress, field, value),
      };
    });
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const revision = ++cepLookupRevision.current;
    if (!e.target.value.trim()) return;

    const values = await cepLookupForm.validateValues(
      { cep: e.target.value },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
    );

    if (values && revision === cepLookupRevision.current) {
      try {
        const data = await getAddressByCep(values.cep);
        if (data && !(data as any).error && revision === cepLookupRevision.current) {
          setFormData((prev: Partial<Person>) =>
            prev.fullAddress?.cep?.replace(/\D/g, '') !== values.cep
              ? prev
              : {
                  ...prev,
                  fullAddress: {
                    ...prev.fullAddress!,
                    street: data.street || prev.fullAddress?.street || '',
                    neighborhood: data.neighborhood || prev.fullAddress?.neighborhood || '',
                    city: data.city || prev.fullAddress?.city || '',
                    state: (data.state || prev.fullAddress?.state || 'PR').toUpperCase(),
                  },
                }
          );
        }
      } catch {
        if (revision === cepLookupRevision.current) {
          toast.error('Não foi possível consultar o CEP. Tente novamente.');
        }
      }
    }
  };

  const routeUrl = resolveShippingRouteUrl(formData.fullAddress);

  return {
    isAddressOpen,
    setIsAddressOpen,
    handleAddressChange,
    handleCepBlur,
    routeUrl,
  };
};
