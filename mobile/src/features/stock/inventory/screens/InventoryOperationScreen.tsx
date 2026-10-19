import React from 'react';
import type { AuditItem } from '../types/inventoryWorkflow.types';
import { InventoryOperationScreenContent } from './InventoryOperationScreenContent';

export interface InventoryOperationScreenProps {
  isDarkMode: boolean;
  inventoryId: string;
  inventoryName: string;
  items: AuditItem[];
  scopeType?: string | null;
  onUpdateCount: (id: string, count: number | null) => void;
  onIncrementScannedItem: (id: string, labelId?: string) => Promise<number | null>;
  onFlushLocalWrites: () => Promise<void>;
  onAddManualItem: () => void;
  onOpenProductSearch?: (itemId: string) => void;
  onReview: () => void;
  onCancel?: () => void;
}

export const InventoryOperationScreen: React.FC<InventoryOperationScreenProps> = (props) => {
  return <InventoryOperationScreenContent {...props} />;
};

export default InventoryOperationScreen;
