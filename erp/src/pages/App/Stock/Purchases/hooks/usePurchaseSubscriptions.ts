import { useState, useEffect, useRef } from 'react';
import Product from '../../../../types/product.type';
import Person from '../../../../types/person.type';
import { subscribeToProducts } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';

export interface UsePurchaseSubscriptionsProps {
  readonly isOpen: boolean;
  readonly onEscape?: () => void;
}

/**
 * Sub-hook responsável pelo ciclo de vida das assinaturas em tempo real
 * de fornecedores e produtos, bem como pelo atalho de tecla Escape.
 */
export function usePurchaseSubscriptions({
  isOpen,
  onEscape,
}: UsePurchaseSubscriptionsProps) {
  const [suppliers, setSuppliers] = useState<readonly Person[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!isOpen) return;

    const unsubSuppliers = subscribeToPeople('suppliers', (data) => {
      setSuppliers(data.filter((p) => !p.deleted && p.type === 'suppliers'));
    });
    const unsubProducts = subscribeToProducts((data) => {
      setProducts(data.filter((p) => !p.deleted && p.itemType === 'product'));
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscapeRef.current?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubSuppliers();
      unsubProducts();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return {
    suppliers,
    products,
  };
}
