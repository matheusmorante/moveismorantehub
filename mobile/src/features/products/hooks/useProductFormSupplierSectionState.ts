import { useEffect, useRef, useState } from 'react';
import {
  fetchMobileProductSuppliersWithStatus,
  type MobileProductSupplier,
} from '../services/mobileSupplierService';

export const useProductFormSupplierSectionState = (enabled: boolean) => {
  const [suppliers, setSuppliers] = useState<MobileProductSupplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierLoadState, setSupplierLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [supplierLoadAttempt, setSupplierLoadAttempt] = useState(0);
  const [supplierLoadErrorMessage, setSupplierLoadErrorMessage] = useState('');
  const lastSuccessfulLoadAttempt = useRef<number | null>(null);

  // Carrega somente quando a seção existe; reabrir a seção reutiliza a lista já obtida.
  useEffect(() => {
    if (!enabled || lastSuccessfulLoadAttempt.current === supplierLoadAttempt) return;

    let isCurrent = true;
    setSupplierLoadState('loading');
    setSupplierLoadErrorMessage('');
    void fetchMobileProductSuppliersWithStatus()
      .then((result) => {
        if (!isCurrent) return;
        setSuppliers(result.suppliers);
        if ('errorMessage' in result) {
          setSupplierLoadState('error');
          setSupplierLoadErrorMessage(result.errorMessage);
        } else {
          lastSuccessfulLoadAttempt.current = supplierLoadAttempt;
          setSupplierLoadState('loaded');
          setSupplierLoadErrorMessage('');
        }
      })
      .catch(() => {
        if (!isCurrent) return;
        setSuppliers([]);
        setSupplierLoadState('error');
        setSupplierLoadErrorMessage('Não foi possível carregar os fornecedores. Tente novamente.');
      });
    return () => {
      isCurrent = false;
    };
  }, [enabled, supplierLoadAttempt]);

  return {
    suppliers,
    supplierSearch,
    setSupplierSearch,
    showSupplierForm,
    setShowSupplierForm,
    supplierLoadState,
    setSupplierLoadAttempt,
    supplierLoadErrorMessage,
  };
};
