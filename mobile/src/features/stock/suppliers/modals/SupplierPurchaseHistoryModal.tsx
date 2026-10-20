import React from 'react';
import {
  SupplierPurchaseHistoryModalContent,
  SupplierPurchaseHistoryModalProps,
} from './SupplierPurchaseHistoryModalContent';

export type { SupplierPurchaseHistoryModalProps };

export const SupplierPurchaseHistoryModal: React.FC<SupplierPurchaseHistoryModalProps> = (
  props
) => {
  return <SupplierPurchaseHistoryModalContent {...props} />;
};

export default SupplierPurchaseHistoryModal;
