import React from 'react';
import Product, { Variation } from '../../../types/product.type';
import Item from '../../../types/items.type';
import Service from '../../../types/service.type';
import { ValidationErrors } from '../../../utils/validations';
import { getNonStockOrigin } from '@/pages/utils/saleInventoryRules';
import { useBodyRowPricing } from './useBodyRowPricing';
import { BodyRowMobile } from './BodyRowMobile';
import { BodyRowDesktop } from './BodyRowDesktop';
import { useSettings, getSettings } from '@/pages/utils/settingsService';

interface Props {
  item: Item;
  productItems: Item[];
  onChange: (idx: number, key: keyof Item, value: string | number) => void;
  onBatchChange: (idx: number, changes: Partial<Item>) => void;
  onToggleDiscountType: () => void;
  onDelete: () => void;
  idx: number;
  deliveryMethod: 'delivery' | 'pickup';
  errors: ValidationErrors;
  isMobile?: boolean;
  onSelectProduct: (idx: number, product: Product, variation?: Variation) => void;
  isBudget?: boolean;
  isReturn?: boolean;
  hideHandling?: boolean;
  highlightAsTemporary?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const BodyRow: React.FC<Props> = ({
  item,
  productItems,
  onChange,
  onBatchChange,
  onToggleDiscountType,
  onDelete,
  idx,
  deliveryMethod,
  errors,
  isMobile,
  onSelectProduct,
  isBudget,
  isReturn,
  hideHandling,
  highlightAsTemporary,
  isExpanded = true,
  onToggleExpand,
}) => {
  const isService = item.itemType === 'service';
  const shouldShowStockOrigin = !isService && !isBudget && !isReturn;
  const nonStockOrigin = getNonStockOrigin(item);
  const shouldHideHandling = Boolean(isService || hideHandling || isBudget || isReturn);
  const isLinkedProduct = Boolean(
    !isService &&
      item.description?.trim() &&
      item.productId &&
      !item.isTemporaryProduct &&
      !nonStockOrigin
  );
  const isTemporaryProduct = Boolean(
    !isService && item.description?.trim() && (!item.productId || nonStockOrigin)
  );

  const errorKey = `item_${idx}_description`;
  const error = errors[errorKey];
  const handlingErrorKey = `item_${idx}_handlingType`;
  const handlingError = !isService && errors[handlingErrorKey];
  const stockOriginErrorKey = `item_${idx}_stockOrigin`;
  const stockOriginError = !isService && errors[stockOriginErrorKey];
  const itemHasError = Boolean(error || handlingError || stockOriginError);

  const handleStockOriginChange = (rawCondition: string) => {
    const condition = rawCondition as Item['condition'];
    if (condition === 'salvado' || condition === 'usado') {
      onBatchChange(idx, {
        condition,
        productId: undefined,
        variationId: undefined,
        isTemporaryProduct: true,
      });
      return;
    }
    onBatchChange(idx, { condition: condition || '', isTemporaryProduct: item.isTemporaryProduct });
  };

  const linkableProductItems = productItems.filter((product) =>
    Boolean(product.description?.trim())
  );

  const serviceProductLink = isService ? (
    <div className="mt-2">
      <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
        Vincular produto
      </label>
      <select
        aria-label="Vincular produto"
        value={item.linkedProductOrderItemId || ''}
        onChange={(event) => onChange(idx, 'linkedProductOrderItemId', event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <option value="">Sem vínculo</option>
        {linkableProductItems.map((product, productIndex) => (
          <option
            key={product.orderItemId || productIndex}
            value={product.orderItemId || ''}
            disabled={!product.orderItemId}
          >
            {product.description} — {product.code || 'Sem SKU'} (linha {productIndex + 1})
          </option>
        ))}
      </select>
    </div>
  ) : null;

  const handleSelectService = (service: Service) => {
    onBatchChange(idx, {
      description: service.description,
      unitPrice: service.unitPrice || 0,
      costPrice: service.costPrice || 0,
      itemType: 'service',
    });
  };

  const settings =
    (typeof useSettings === 'function' ? useSettings() : undefined) ??
    (typeof getSettings === 'function' ? getSettings() : ({} as any));

  const pricing = useBodyRowPricing({
    item,
    idx,
    onChange,
    onBatchChange,
  });

  const sharedProps = {
    item,
    idx,
    deliveryMethod,
    settings,
    isBudget,
    isReturn,
    hideHandling,
    shouldHideHandling,
    highlightAsTemporary,
    isExpanded,
    onToggleExpand,
    pricing,
    onChange,
    onBatchChange,
    onToggleDiscountType,
    onDelete,
    onSelectProduct,
    handleSelectService,
    handleStockOriginChange,
    isService,
    shouldShowStockOrigin,
    isLinkedProduct,
    isTemporaryProduct,
    itemHasError,
    error,
    handlingError,
    stockOriginError,
    serviceProductLink,
  };

  if (isMobile) {
    return <BodyRowMobile {...sharedProps} />;
  }

  return <BodyRowDesktop {...sharedProps} />;
};

export default BodyRow;
