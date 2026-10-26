import React from 'react';
import Product, { Variation } from '../../../types/product.type';
import Item from '../../../types/items.type';
import { ValidationErrors } from '../../../utils/validations';
import { getNonStockOrigin } from '@/pages/utils/saleInventoryRules';
import { useBodyRowPricing } from './useBodyRowPricing';
import { BodyRowMobile } from './BodyRowMobile';
import { BodyRowDesktop } from './BodyRowDesktop';
import { useSettings, getSettings } from '@/pages/utils/settingsService';
import { requiresAssemblyResponsible } from '../../../../../../shared-utils/commercialOrderRules';

interface Props {
  item: Item;
  productItems: Item[];
  onChange: (idx: number, key: keyof Item, value: string | number) => void;
  onBatchChange: (idx: number, changes: Partial<Item>) => void;
  onToggleDiscountType: () => void;
  onDelete: () => void;
  idx: number;
  displayNumber?: string;
  isCompositionComponent?: boolean;
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
  autoFocusDescription?: boolean;
  onAutoExpand?: () => void;
  onDescriptionBlur?: () => void;
}

const BodyRow: React.FC<Props> = ({
  item,
  productItems,
  onChange,
  onBatchChange,
  onToggleDiscountType,
  onDelete,
  idx,
  displayNumber,
  isCompositionComponent,
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
  autoFocusDescription = false,
  onAutoExpand,
  onDescriptionBlur,
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
  const showTemporaryProductLabel = Boolean(
    shouldShowStockOrigin &&
      !item.isComboItem &&
      item.condition === 'novo' &&
      item.description?.trim() &&
      !item.productId?.trim()
  );

  const errorKey = `item_${idx}_description`;
  const error = errors[errorKey];
  const handlingErrorKey = `item_${idx}_handlingType`;
  const handlingError = !isService && errors[handlingErrorKey];
  const assemblyResponsibleRequired =
    !shouldHideHandling &&
    !item.isComboItem &&
    requiresAssemblyResponsible(item.handlingType, deliveryMethod);
  const assemblyResponsibleError = assemblyResponsibleRequired
    ? errors[`item_${idx}_assemblyResponsible`]
    : undefined;
  const stockOriginErrorKey = `item_${idx}_stockOrigin`;
  const stockOriginError = !isService && errors[stockOriginErrorKey];
  const itemHasError = Boolean(
    error || handlingError || stockOriginError || assemblyResponsibleError
  );

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

  const handleHandlingChange = (handlingType: string) => {
    onBatchChange(idx, {
      handlingType,
      ...(!requiresAssemblyResponsible(handlingType, deliveryMethod)
        ? { assemblyResponsible: '' }
        : {}),
    });
  };

  const linkableProductItems = productItems.filter(
    (product) => Boolean(product.description?.trim() && product.orderItemId)
  );

  const selectedProductOrderItemIds = new Set(
    Array.isArray(item.linkedProductOrderItemIds) && item.linkedProductOrderItemIds.length > 0
      ? item.linkedProductOrderItemIds
      : item.linkedProductOrderItemId
        ? [item.linkedProductOrderItemId]
        : []
  );

  const serviceProductLink = isService ? (
    <div className="mt-2">
      <span className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
        Vincular aos produtos
      </span>
      {linkableProductItems.length > 0 ? (
        <fieldset
          aria-label="Produtos vinculados ao serviço"
          className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"
        >
          {linkableProductItems.map((product, productIndex) => {
            const productOrderItemId = product.orderItemId!;
            const inputId = `service-${idx}-product-${productOrderItemId}`;
            const checked = selectedProductOrderItemIds.has(productOrderItemId);
            return (
              <label
                key={productOrderItemId}
                htmlFor={inputId}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const nextIds = new Set(selectedProductOrderItemIds);
                    if (event.target.checked) nextIds.add(productOrderItemId);
                    else nextIds.delete(productOrderItemId);
                    onBatchChange(idx, {
                      linkedProductOrderItemIds: [...nextIds],
                      linkedProductOrderItemId: undefined,
                    });
                  }}
                  className="mt-0.5 accent-blue-600"
                />
                <span>
                  {product.quantity}x {product.description}
                  {product.code ? ` — ${product.code}` : ''}
                  <span className="ml-1 text-[10px] text-slate-400">(linha {productIndex + 1})</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">
          Adicione um produto ao pedido para vinculá-lo a este serviço.
        </p>
      )}
    </div>
  ) : null;

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
    displayNumber,
    isCompositionComponent: Boolean(isCompositionComponent || item.compositionGroup),
    deliveryMethod,
    settings,
    isBudget,
    isReturn,
    hideHandling,
    shouldHideHandling,
    highlightAsTemporary,
    isExpanded,
    onToggleExpand,
    autoFocusDescription,
    onAutoExpand,
    onDescriptionBlur,
    pricing,
    onChange,
    onBatchChange,
    onToggleDiscountType,
    onDelete,
    onSelectProduct,
    handleStockOriginChange,
    handleHandlingChange,
    isService,
    shouldShowStockOrigin,
    isLinkedProduct,
    showTemporaryProductLabel,
    itemHasError,
    error,
    handlingError,
    assemblyResponsibleRequired,
    assemblyResponsibleError,
    stockOriginError,
    serviceProductLink,
  };

  if (isMobile) {
    return <BodyRowMobile {...sharedProps} />;
  }

  return <BodyRowDesktop {...sharedProps} />;
};

export default BodyRow;
