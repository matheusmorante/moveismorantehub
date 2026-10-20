import React from 'react';
import {
  PurchaseDetailsModalContent,
  PurchaseDetailsModalProps,
} from './PurchaseDetailsModalContent';

export type { PurchaseDetailsModalProps };

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = (props) => {
  return <PurchaseDetailsModalContent {...props} />;
};

export default PurchaseDetailsModal;
