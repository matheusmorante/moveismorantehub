import React from 'react';
import { InvoicesScreenContent } from './InvoicesScreenContent';

/**
 * Thin wrapper component for the Invoices screen.
 * Delegates all UI and business logic to {@link InvoicesScreenContent}.
 * This follows the Single Responsibility Principle by keeping this file
 * minimal – it only handles prop forwarding and renders the content component.
 */
export const InvoicesScreen: React.FC<{ isDarkMode: boolean; onBack: () => void; renderHeader: () => React.ReactElement }> = (props) => {
  return <InvoicesScreenContent {...props} />;
};
