import React from 'react';
import { InventoryProductSearchModalContent } from './InventoryProductSearchModalContent';

export interface SearchableProduct {
  id: string;
  variation_id?: string;
  sku?: string | null;
  code?: string | null;
  barcode?: string | null;
  name: string;
  description?: string;
  stock: number;
  unit?: string;
  main_supplier_id?: string;
  supplier_id?: string;
  supplier_ids?: string[];
  supplierNames?: string;
  assignedSupplier?: string;
}

export interface InventoryProductSearchModalProps {
  isDarkMode: boolean;
  visible: boolean;
  onClose: () => void;
  onSelect: (product: SearchableProduct) => void;
}

export const InventoryProductSearchModal: React.FC<InventoryProductSearchModalProps> = (props) => {
  return <InventoryProductSearchModalContent {...props} />;
};

export default InventoryProductSearchModal;
