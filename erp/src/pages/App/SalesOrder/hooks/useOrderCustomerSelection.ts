import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type CustomerData from '@/pages/types/customerData.type';
import type Shipping from '@/pages/types/Shipping.type';
import type { ValidationErrors } from '@/pages/utils/validations';
import {
  computeCustomerAutoUseCustomerAddress,
  detectCustomerLinkingChange,
} from './customerAddressRules';

interface UseOrderCustomerSelectionParams {
  customerData: CustomerData;
  shipping: Shipping;
  setCustomerData: Dispatch<SetStateAction<CustomerData>>;
  setShipping: Dispatch<SetStateAction<Shipping>>;
  setErrors: Dispatch<SetStateAction<ValidationErrors>>;
  handleAutoCalculateDistance: (
    customAddress?: unknown,
    options?: { silentSuccess?: boolean }
  ) => Promise<void>;
}

export function useOrderCustomerSelection({
  customerData,
  shipping,
  setCustomerData,
  setShipping,
  setErrors,
  handleAutoCalculateDistance,
}: UseOrderCustomerSelectionParams) {
  return useCallback(
    (value: SetStateAction<CustomerData>) => {
      const nextCustomer = typeof value === 'function' ? value(customerData) : value;
      const { isCustomerLinked, isLinkingCustomer, addressChanged, customerChanged } =
        detectCustomerLinkingChange({
          nextCustomer,
          currentCustomer: customerData,
        });
      setCustomerData(nextCustomer);

      let nextUseCustomerAddress = shipping.useCustomerAddress;
      if (isLinkingCustomer && isCustomerLinked) {
        nextUseCustomerAddress = computeCustomerAutoUseCustomerAddress(nextCustomer);
        setShipping((previous) => ({
          ...previous,
          useCustomerAddress: nextUseCustomerAddress,
          noAddress:
            previous.deliveryMethod === 'delivery' && nextUseCustomerAddress
              ? false
              : previous.noAddress,
        }));
      }

      const address = nextCustomer.fullAddress;
      const hasLocation = Boolean(
        (address?.street?.trim() && address?.city?.trim()) ||
          address?.mapsUrl?.trim() ||
          address?.googleMapsUrl?.trim() ||
          address?.mapsLink?.trim() ||
          (Array.isArray(address?.coords) && address.coords.length === 2) ||
          address?.placeId?.trim()
      );
      const routeAddress = hasLocation ? address : null;
      if (
        (customerChanged || addressChanged) &&
        nextCustomer.id &&
        routeAddress &&
        shipping.deliveryMethod === 'delivery' &&
        nextUseCustomerAddress !== false
      ) {
        void handleAutoCalculateDistance(routeAddress, { silentSuccess: true });
      }
      setErrors((previous) => {
        const next = { ...previous };
        Object.keys(next).forEach((key) => {
          if (key.startsWith('customer_')) delete next[key];
        });
        return next;
      });
    },
    [
      customerData,
      handleAutoCalculateDistance,
      setCustomerData,
      setErrors,
      setShipping,
      shipping,
    ]
  );
}
