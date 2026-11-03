import React from 'react';
import { PurchaseOrderItems } from './PurchaseOrderItems';
import { ReceiptItemsSection } from './ReceiptItemsSection';
import type { PurchaseItemsSectionProps } from './purchaseItemsSection.types';
export type { PurchaseItemsSectionProps };

/**
 * Seção de itens do pedido de compra com edição inline: busca de produto, quantidade e custo diretamente no item.
 */
export const PurchaseItemsSection: React.FC<PurchaseItemsSectionProps> = (props) =>
  props.receiptMode ? <ReceiptItemsSection {...props} /> : <PurchaseOrderItems {...props} />;
