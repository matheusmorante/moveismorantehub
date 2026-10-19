import React from 'react';
import {
  InventoryMoveEditModalContent,
  InventoryMoveEditModalProps,
} from './InventoryMoveEditModalContent';

export type { InventoryMoveEditModalProps };

export const InventoryMoveEditModal: React.FC<InventoryMoveEditModalProps> = (props) => {
  return <InventoryMoveEditModalContent {...props} />;
};

export default InventoryMoveEditModal;
