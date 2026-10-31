import React from 'react';
import type { AuditItem } from '../../hooks/useInventoryAuditWorkflow';
import { InventoryStagesViewContent } from './InventoryStagesViewContent';

export interface InventoryStagesViewProps {
  items: AuditItem[];
  isDarkMode: boolean;
  variant?: 'stages' | 'summary' | 'selection';
  onStartStage?: (supplierName: string) => Promise<void>;
  onSelectSupplier?: (supplierName: string) => void;
}

export const InventoryStagesView: React.FC<InventoryStagesViewProps> = (props) => {
  return <InventoryStagesViewContent {...props} />;
};

export default InventoryStagesView;
