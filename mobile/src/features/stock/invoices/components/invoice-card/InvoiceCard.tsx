import React from 'react';
import { Invoice } from '../../../types/stock.types';
import { InvoiceCardContent } from './InvoiceCardContent';

export interface InvoiceCardProps {
  item: Invoice;
  isDarkMode: boolean;
  onMenuPress: (item: Invoice) => void;
  onPress: (item: Invoice) => void;
  onOpenXmlImport: (item: Invoice) => void;
  onManageMappings: (item: Invoice) => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = (props) => {
  return <InvoiceCardContent {...props} />;
};

export default InvoiceCard;
