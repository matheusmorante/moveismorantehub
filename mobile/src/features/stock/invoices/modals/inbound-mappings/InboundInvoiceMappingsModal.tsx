import React from 'react';
import type { Invoice } from '../../../types/stock.types';
import { InboundInvoiceMappingsModalContent } from './InboundInvoiceMappingsModalContent';

interface Props {
  invoice: Invoice | null;
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const InboundInvoiceMappingsModal: React.FC<Props> = (props) => {
  // Wrapper component simply renders the extracted content component
  return <InboundInvoiceMappingsModalContent {...props} />;
};
