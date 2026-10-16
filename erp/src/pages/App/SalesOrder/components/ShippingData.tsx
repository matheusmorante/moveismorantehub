import React from 'react';
import Shipping from '@/pages/types/Shipping.type';
import CustomerData from '@/pages/types/customerData.type';
import { getShippingRouteUrl } from '@/pages/utils/maps';
import { ValidationErrors } from '@/pages/utils/validations';
import { calculateFreightByDistance } from '@/pages/utils/shippingPricing';
import FreteDistancia from '../ShippingComponents/FreteDistancia';
import Agendamento, { SchedulingSessionMemory } from '../ShippingComponents/Agendamento';
import MapRoute from '../ShippingComponents/MapRoute';
import { CustomDeliveryAddressFields } from './shipping/CustomDeliveryAddressFields';

interface Props {
  shipping: Shipping;
  setShipping: React.Dispatch<React.SetStateAction<Shipping>>;
  customerData: CustomerData;
  isCalculatingDistance?: boolean;
  onAutoCalculateDistance?: () => void;
  errors: ValidationErrors;
  orderType?: string;
  schedulingSessionRef?: React.MutableRefObject<SchedulingSessionMemory | null>;
}

const ShippingData = ({
  shipping,
  setShipping,
  customerData,
  isCalculatingDistance,
  onAutoCalculateDistance,
  errors,
  orderType,
  schedulingSessionRef,
}: Props) => {
  // Auto-enable noAddress for "Consumidor Final" or if it is a Pickup
  React.useEffect(() => {
    const isFinalConsumer = customerData.fullName?.toLowerCase().trim() === 'consumidor final';
    const isPickup = shipping.deliveryMethod === 'pickup';

    if ((isFinalConsumer || isPickup) && !shipping.noAddress) {
      setShipping((prev) => ({ ...prev, noAddress: true }));
    }
  }, [customerData.fullName, shipping.deliveryMethod, shipping.noAddress, setShipping]);

  // Ao alternar de Retirada para Entrega, restaura noAddress para false caso o cliente tenha endereço
  const prevDeliveryMethodRef = React.useRef(shipping.deliveryMethod);
  React.useEffect(() => {
    const wasPickup = prevDeliveryMethodRef.current === 'pickup';
    const isDelivery = shipping.deliveryMethod === 'delivery';
    prevDeliveryMethodRef.current = shipping.deliveryMethod;

    if (wasPickup && isDelivery) {
      const isFinalConsumer = customerData.fullName?.toLowerCase().trim() === 'consumidor final';
      const hasCustomerNoAddress = Boolean(
        customerData.noAddress || (customerData.fullAddress as any)?.noAddress
      );
      if (!isFinalConsumer && !hasCustomerNoAddress) {
        setShipping((prev) => ({ ...prev, noAddress: false }));
      }
    }
  }, [shipping.deliveryMethod, customerData.fullName, customerData.noAddress, customerData.fullAddress, setShipping]);

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

  const onChangeScheduling = (
    key: keyof Shipping['scheduling'],
    value: string | Date | boolean
  ) => {
    setShipping((prev: Shipping) => {
      const newScheduling = { ...prev.scheduling, [key]: value };

      if (newScheduling.type === 'fixed') {
        newScheduling.time = newScheduling.startTime || '';
      } else {
        const start = newScheduling.startTime || '';
        const end = newScheduling.endTime || '';
        newScheduling.time = start && end ? `${start} às ${end}` : '';
      }

      return {
        ...prev,
        scheduling: newScheduling as Shipping['scheduling'],
      };
    });
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-10 w-full lg:gap-12">
        {shipping.deliveryMethod === 'delivery' && (
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
              </div>
            )}
          </div>
        )}
        {orderType !== 'budget' && (
          <Agendamento
            scheduling={shipping.scheduling}
            onChangeScheduling={onChangeScheduling}
            errors={errors}
            isPickup={shipping.deliveryMethod === 'pickup'}
            sessionMemoryRef={schedulingSessionRef}
          />
        )}
      </div>

      {shipping.destinationCoords && shipping.deliveryMethod !== 'pickup' && (
        <div className="w-full flex flex-col gap-2 relative group -mt-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
            Rota de Entrega
          </label>
          <MapRoute
            destinationCoords={shipping.destinationCoords as [number, number]}
            routeGeoJSON={shipping.routeGeoJSON}
            className="h-80 w-full animate-slide-up"
          />
        </div>
      )}
    </div>
  );
};

export default ShippingData;
