import React from 'react';
import { InventorySession } from '../../types/stock.types';
import { InventoryCardContent } from './InventoryCardContent';

export interface InventoryCardProps {
  session: InventorySession;
  isDarkMode: boolean;
  onPress?: (session: InventorySession) => void;
  onOptionsPress?: (session: InventorySession) => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = (props) => {
  return <InventoryCardContent {...props} />;
};

export default InventoryCard;
