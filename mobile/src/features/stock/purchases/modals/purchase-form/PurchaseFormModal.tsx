import React from 'react';
import { PurchaseFormModalContent } from './PurchaseFormModalContent';

/**
 * Thin wrapper that forwards all props to the content component.
 * Keeps the original component name for external imports while
 * delegating UI/logic to a separate file for better SRP.
 */
export const PurchaseFormModal: React.FC<any> = (props) => {
  return <PurchaseFormModalContent {...props} />;
};
