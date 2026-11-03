import type { MobilePurchaseItem } from '../../mobilePurchaseService';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

export interface PurchaseItemsSectionProps {
  items: MobilePurchaseItem[];
  discountPercent?: string;
  ipiPercent?: string;
  freightPercent?: string;
  onOpenProductPicker: (index?: number) => void;
  onAddItemRow: () => void;
  onUpdateItem: (index: number, patch: Partial<MobilePurchaseItem>) => void;
  onRemoveItem: (index: number) => void;
  colors: ThemeColors;
  allowAdd?: boolean;
  showEmptyAddButton?: boolean;
  responsiveFieldRows?: boolean;
  allowRemove?: boolean;
  addDisabled?: boolean;
  isDarkMode?: boolean;
  receiptMode?: boolean;
  simplifiedReceiptMode?: boolean;
  showReceiptCostComposition?: boolean;
  readOnly?: boolean;
  selectedItemIndex?: number | null;
  onSelectedItemChange?: (index: number | null) => void;
}
