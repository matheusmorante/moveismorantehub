import React from 'react';
import type { ScopeConfiguration } from '../hooks/useInventoryScopeBuilder';
import type { InventoryScopeCopySource } from '../services/inventoryScopeCopy';
import { InventoryScopeScreenContent } from './InventoryScopeScreenContent';

export interface InventoryScopeScreenProps {
  isDarkMode: boolean;
  onCancel: () => void;
  onConfirm: (config: ScopeConfiguration) => void;
  copiedItems?: readonly InventoryScopeCopySource[] | null;
}

export const InventoryScopeScreen: React.FC<InventoryScopeScreenProps> = (props) => {
  return <InventoryScopeScreenContent {...props} />;
};

export default InventoryScopeScreen;
