import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import type { useSalesOrderForm } from '../../../hooks/useSalesOrderForm';
import {
  applyImportedOrderDataToForm,
  buildImportedClientDraft,
} from '../../orderEditJsonHelpers';

interface UseOrderEditJsonImportParams {
  readonly formActions: ReturnType<typeof useSalesOrderForm>['actions'];
}

export function useOrderEditJsonImport({ formActions }: UseOrderEditJsonImportParams) {
  const [isCustomerRegistrationOpen, setIsCustomerRegistrationOpen] = useState(false);
  const [pendingCustomerData, setPendingCustomerData] = useState<any>(null);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const applyOrderData = useCallback(
    (orderData: any) => {
      applyImportedOrderDataToForm(orderData, formActions);
    },
    [formActions]
  );

  const handleLoadJSON = useCallback(
    (jsonData: any) => {
      try {
        if (!jsonData || typeof jsonData !== 'object') {
          toast.error('JSON inválido.');
          return false;
        }

        if (jsonData.client) {
          setPendingCustomerData(buildImportedClientDraft(jsonData.client));
          setPendingOrderData(jsonData.order ? jsonData.order : null);
          setIsCustomerRegistrationOpen(true);
          toast.info('Cliente identificado no JSON. Confirme o cadastro do cliente primeiro.');
        } else if (jsonData.order) {
          applyOrderData(jsonData.order);
          toast.success('Pedido preenchido com sucesso via JSON!');
        } else {
          applyOrderData(jsonData);
          toast.success('Pedido preenchido com sucesso via JSON!');
        }
        return true;
      } catch (err: any) {
        toast.error('Erro ao carregar JSON: ' + err.message);
        return false;
      }
    },
    [applyOrderData]
  );

  const handleCustomerRegistered = useCallback(
    (person: any) => {
      formActions.setCustomerData({
        id: person.id,
        fullName: person.fullName || person.tradeName || '',
        phone: person.phone || '',
        noPhone: person.noPhone || false,
        fullAddress: person.fullAddress || {
          cep: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          observation: '',
        },
        additionalContacts: person.additionalContacts || [],
      });
      if (person.marketingOrigin) {
        formActions.setMarketingOrigin(person.marketingOrigin);
      }
      setIsCustomerRegistrationOpen(false);
      if (pendingOrderData) {
        applyOrderData(pendingOrderData);
      }
      toast.success('Cliente cadastrado e pedido preenchido com sucesso via JSON!');
    },
    [formActions, pendingOrderData, applyOrderData]
  );

  return {
    isCustomerRegistrationOpen,
    setIsCustomerRegistrationOpen,
    pendingCustomerData,
    handleLoadJSON,
    handleCustomerRegistered,
  };
}
