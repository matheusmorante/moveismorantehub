import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type Item from '@/pages/types/items.type';
import type Shipping from '@/pages/types/Shipping.type';
import type { ValidationErrors } from '@/pages/utils/validations';
import { requiresAssemblyResponsible } from '../../../../../../shared-utils/commercialOrderRules';
import { resolveFirstItemHandlingType } from '../orderItemHandling';

type DeliveryMethod = Shipping['deliveryMethod'];
type RememberedItemHandling = {
  itemIdentity: string;
  handlingType: string;
  assemblyResponsible?: Item['assemblyResponsible'];
};
type ItemHandlingByDeliveryMethod = Record<
  string,
  Partial<Record<DeliveryMethod, RememberedItemHandling>>
>;

const getItemHandlingCacheKey = (item: Item, index: number) =>
  item.orderItemId || `item-${index}`;

const getItemHandlingIdentity = (item: Item) =>
  JSON.stringify([
    item.fiscalSnapshotProductId || item.productId || '',
    item.fiscalSnapshotVariationId || item.variationId || '',
    item.description.trim(),
    item.condition || '',
  ]);

const getRememberedItemHandling = (
  cache: ItemHandlingByDeliveryMethod,
  item: Item,
  index: number,
  method: DeliveryMethod
) => {
  const remembered = cache[getItemHandlingCacheKey(item, index)]?.[method];
  return remembered?.itemIdentity === getItemHandlingIdentity(item) ? remembered : undefined;
};

interface UseOrderItemHandlingByDeliveryMethodParams {
  items: Item[];
  shipping: Shipping;
  setItems: Dispatch<SetStateAction<Item[]>>;
  setShipping: Dispatch<SetStateAction<Shipping>>;
  setErrors: Dispatch<SetStateAction<ValidationErrors>>;
}

export function useOrderItemHandlingByDeliveryMethod({
  items,
  shipping,
  setItems,
  setShipping,
  setErrors,
}: UseOrderItemHandlingByDeliveryMethodParams) {
  const itemHandlingByDeliveryMethodRef = useRef<ItemHandlingByDeliveryMethod>({});

  const rememberItemHandlings = useCallback((method: DeliveryMethod, currentItems: Item[]) => {
    currentItems.forEach((item, index) => {
      const key = getItemHandlingCacheKey(item, index);
      itemHandlingByDeliveryMethodRef.current[key] = {
        ...itemHandlingByDeliveryMethodRef.current[key],
        [method]: {
          itemIdentity: getItemHandlingIdentity(item),
          handlingType: item.handlingType || '',
          assemblyResponsible: item.assemblyResponsible || '',
        },
      };
    });
  }, []);

  const resetItemHandlingMemory = useCallback(
    (method: DeliveryMethod, currentItems: Item[]) => {
      itemHandlingByDeliveryMethodRef.current = {};
      rememberItemHandlings(method, currentItems);
    },
    [rememberItemHandlings]
  );

  const setItemsWithHandlingReset = useCallback(
    (nextItems: SetStateAction<Item[]>) => {
      if (Array.isArray(nextItems)) itemHandlingByDeliveryMethodRef.current = {};
      setItems(nextItems);
    },
    [setItems]
  );

  const setDeliveryMethod = useCallback(
    (method: DeliveryMethod) => {
      if (method === shipping.deliveryMethod) return;

      rememberItemHandlings(shipping.deliveryMethod, items);
      const nextItems = items.map((item, index) => {
        if (item.itemType === 'service' || item.isComboItem) return item;

        const remembered = getRememberedItemHandling(
          itemHandlingByDeliveryMethodRef.current,
          item,
          index,
          method
        );
        const handlingType = remembered?.handlingType || '';
        const assemblyResponsible = requiresAssemblyResponsible(handlingType, method)
          ? remembered?.assemblyResponsible || ''
          : '';

        return { ...item, handlingType, assemblyResponsible };
      });
      const firstHandling = resolveFirstItemHandlingType(nextItems);

      setItems(nextItems);
      setShipping((previous) => ({
        ...previous,
        deliveryMethod: method,
        orderType: firstHandling,
      }));
      setErrors((previous) => {
        const next = { ...previous };
        Object.keys(next).forEach((key) => {
          if (
            key.startsWith('shipping_') ||
            /^item_\d+_(handlingType|assemblyResponsible)$/.test(key)
          ) {
            delete next[key];
          }
        });
        return next;
      });
    },
    [items, rememberItemHandlings, setErrors, setItems, setShipping, shipping.deliveryMethod]
  );

  return {
    rememberItemHandlings,
    resetItemHandlingMemory,
    setDeliveryMethod,
    setItemsWithHandlingReset,
  };
}
