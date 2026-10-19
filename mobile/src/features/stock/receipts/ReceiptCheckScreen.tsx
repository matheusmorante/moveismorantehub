import React from 'react';
import {
  ReceiptCheckScreenContent,
  ReceiptCheckScreenProps,
} from './ReceiptCheckScreenContent';

export type { ReceiptCheckScreenProps };

export const ReceiptCheckScreen: React.FC<ReceiptCheckScreenProps> = (props) => {
  return <ReceiptCheckScreenContent {...props} />;
};

export default ReceiptCheckScreen;
