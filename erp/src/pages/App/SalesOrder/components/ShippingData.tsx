import React from 'react';
import Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import CustomerData from '@/pages/types/customerData.type';
import { getShippingRouteUrl } from '@/pages/utils/maps';
import { ValidationErrors } from '@/pages/utils/validations';
import { calculateFreightByDistance } from '@/pages/utils/shippingPricing';
import FreteDistancia from '../ShippingComponents/FreteDistancia';
import type { SchedulingSessionMemory } from '../ShippingComponents/Agendamento';
import { OrderAppointments } from '../ShippingComponents/OrderAppointments';
import type { DistanceCalculationOptions } from '../hooks/useOrderDistanceCalculator';
import { CustomDeliveryAddressFields } from './shipping/CustomDeliveryAddressFields';

interface Props {
  shipping: Shipping;
  items?: Item[];
  setShipping: React.Dispatch<React.SetStateAction<Shipping>>;
  customerData: CustomerData;
  isCalculatingDistance?: boolean;
  onAutoCalculateDistance?: (customAddress?: unknown, options?: DistanceCalculationOptions) => Promise<void>;
  errors: ValidationErrors;
  orderType?: string;
  schedulingSessionRef?: React.MutableRefObject<SchedulingSessionMemory | null>;
  isNewSale?: boolean;
  cardMachineRequired?: boolean;
}

const ShippingData = ({
  shipping,
  items = [],
  setShipping,
  customerData,
  isCalculatingDistance,
  onAutoCalculateDistance,
  errors,
  orderType,
  schedulingSessionRef,
  isNewSale = false,
  cardMachineRequired = false,
}: Props) => {
  const hasDelivery = shipping.scheduling.appointments?.length
    ? shipping.scheduling.appointments.some((appointment) =>
        (appointment.deliveryMethod || shipping.deliveryMethod) === 'delivery'
      )
    : shipping.deliveryMethod === 'delivery';
  // Auto-enable noAddress for "Consumidor Final" or if it is a Pickup
  React.useEffect(() => {
    const isFinalConsumer = customerData.fullName?.toLowerCase().trim() === 'consumidor final';
    const isPickup = !hasDelivery;

    if ((isFinalConsumer || isPickup) && !shipping.noAddress) {
      setShipping((prev) => ({ ...prev, noAddress: true }));
    }
  }, [customerData.fullName, hasDelivery, shipping.noAddress, setShipping]);

  // Ao alternar de Retirada para Entrega, restaura noAddress para false caso o cliente tenha endereço
  const prevHasDeliveryRef = React.useRef(hasDelivery);
  React.useEffect(() => {
    const wasPickup = !prevHasDeliveryRef.current;
    const isDelivery = hasDelivery;
    prevHasDeliveryRef.current = hasDelivery;

    if (wasPickup && isDelivery) {
      const isFinalConsumer = customerData.fullName?.toLowerCase().trim() === 'consumidor final';
      const hasCustomerNoAddress = Boolean(
        customerData.noAddress || (customerData.fullAddress as any)?.noAddress
      );
      if (!isFinalConsumer && !hasCustomerNoAddress) {
        setShipping((prev) => ({ ...prev, noAddress: false }));
      }
    }
  }, [hasDelivery, customerData.fullName, customerData.noAddress, customerData.fullAddress, setShipping]);

  const activeAddress =
    orderType === 'budget'
      ? customerData.fullAddress
      : shipping.useCustomerAddress === false && shipping.deliveryAddress
        ? shipping.deliveryAddress
        : customerData.fullAddress;

  const route = getShippingRouteUrl(activeAddress);
  const onChangeShippingValue = (newValue: number) => {
    setShipping((prev: Shipping) => ({ ...prev, value: newValue, autoCalculateValue: false }));
  };

  const onChangeDistance = (newValue: string) => {
    const numValue = parseFloat(newValue.replace(',', '.'));
    setShipping((prev: Shipping) => {
      const distance = Number.isFinite(numValue) && numValue >= 0 ? numValue : undefined;
      let value = prev.value;

      if (distance !== undefined) {
        value = calculateFreightByDistance(distance);
      }

      return { ...prev, distance, value, autoCalculateValue: true };
    });
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-10 w-full lg:gap-12">
        {hasDelivery && orderType !== 'sale' && orderType !== 'budget' && (
          <div className="flex flex-col gap-10">
            {/* Address status toggle */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Endereço de Entrega
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Endereço pendente?
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={shipping.noAddress}
                    aria-label="Marcar endereço como pendente"
                    onClick={() => setShipping((prev) => ({ ...prev, noAddress: !prev.noAddress }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                      shipping.noAddress
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-slate-300 bg-slate-200 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${shipping.noAddress ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {!shipping.noAddress && (
              <div className="flex flex-col gap-10 animate-slide-up">
                {/* Custom Delivery Address Toggle */}
                {orderType !== 'budget' && (
                  <label className="flex w-fit cursor-pointer items-center gap-3 group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={shipping.useCustomerAddress !== false}
                        onChange={(e) =>
                          setShipping((prev) => ({ ...prev, useCustomerAddress: e.target.checked }))
                        }
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 transition-colors group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400">
                      Usar o mesmo endereço do cliente?
                    </span>
                  </label>
                )}

                {orderType !== 'budget' && shipping.useCustomerAddress === false && (
                  <CustomDeliveryAddressFields
                    shipping={shipping}
                    setShipping={setShipping}
                    errors={errors}
                  />
                )}

              </div>
            )}
          </div>
        )}
        {(orderType !== 'sale' && (orderType !== 'budget' || (hasDelivery && !shipping.noAddress))) && (
          <FreteDistancia
            value={shipping.value}
            distance={shipping.distance}
            routeUrl={route}
            onChangeValue={onChangeShippingValue}
            onChangeDistance={onChangeDistance}
            onAutoCalculateDistance={onAutoCalculateDistance}
            isCalculatingDistance={isCalculatingDistance}
            errors={errors}
          />
        )}
        {orderType !== 'budget' && (
          <OrderAppointments
            shipping={shipping}
            setShipping={setShipping}
            items={items}
            customerData={customerData}
            errors={errors}
            routeUrl={route}
            isCalculatingDistance={isCalculatingDistance}
            onAutoCalculateDistance={onAutoCalculateDistance}
            sessionMemoryRef={schedulingSessionRef}
            isNewSale={isNewSale}
            isSale={orderType === 'sale'}
            cardMachineRequired={cardMachineRequired}
          />
        )}
      </div>

    </div>
  );
};

export default ShippingData;
