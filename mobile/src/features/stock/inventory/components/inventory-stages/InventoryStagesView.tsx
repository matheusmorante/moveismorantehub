import React from 'react';
import type { AuditItem } from '../../hooks/useInventoryAuditWorkflow';
import { InventoryStagesViewContent } from './InventoryStagesViewContent';

export interface InventoryStagesViewProps {
  items: AuditItem[];
  isDarkMode: boolean;
  onSelectStage: (supplierName: string) => void;
}

export const InventoryStagesView: React.FC<InventoryStagesViewProps> = (props) => {
  return <InventoryStagesViewContent {...props} />;
};

export default InventoryStagesView;
