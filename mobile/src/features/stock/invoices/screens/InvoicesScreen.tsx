import React from 'react';
import { InvoicesScreenContent } from './invoices-screen/InvoicesScreenContent';
import type { Invoice } from '../../types/stock.types';

interface InvoicesScreenProps {
  isDarkMode: boolean;
  canAccessReceipts?: boolean;
  onBack: () => void;
  renderHeader: (rightAction?: React.ReactNode) => React.ReactElement;
  onGenerateReceipt?: (invoice: Invoice) => void;
}

/**
 * Thin wrapper component for the Invoices screen.
 * Delegates all UI and business logic to {@link InvoicesScreenContent}.
 * This follows the Single Responsibility Principle by keeping this file
 * minimal – it only handles prop forwarding and renders the content component.
 */
export const InvoicesScreen: React.FC<InvoicesScreenProps> = (props) => {
  return <InvoicesScreenContent {...props} />;
};
