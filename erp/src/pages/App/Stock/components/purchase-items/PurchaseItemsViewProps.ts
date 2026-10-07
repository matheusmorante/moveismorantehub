import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import type { PurchaseItem } from '../../../../types/purchase.type';

export interface PurchaseItemsViewProps {
  items: PurchaseItem[];
  isReceiptMode: boolean;
  supplierId?: string;
  freightPercent: number;
  formatCurrency: (value: number) => string;
  onRemoveItem: (idx: number) => void;
  onUpdateItem?: (idx: number, item: PurchaseItem) => void;
  onAddNewItemRow: () => void;
  handleSelectProductInRow: (idx: number, product: Product, variation?: Variation) => void;
  handleEditProductInRow: (idx: number) => void;
  handleQtyChange: (idx: number, newQty: number) => void;
  handleCostChange: (idx: number, newCost: number) => void;
}

export interface PurchaseItemsTableProps extends PurchaseItemsViewProps {
  totalValue: number;
}