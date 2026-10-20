import React from 'react';
import PickupIcon from '@/components/shared/PickupIcon';
import { getSettings } from '@/pages/utils/settingsService';
import { getOrderTypeClasses, resolveOrderColor } from '../../../utils/orderTypeColorUtils';

export interface OrderTypeLabelsSectionProps {
  deliveryMethod?: string;
  orderType?: string;
  handlingModality?: string;
}

export const OrderTypeLabelsSection: React.FC<OrderTypeLabelsSectionProps> = ({
  deliveryMethod,
  orderType,
  handlingModality,
}) => {
  const settings = getSettings();
  const isAssistance = orderType === 'assistance';
  const isPickup = deliveryMethod === 'pickup';
  const colors = settings.orderTypeColors ?? {
    delivery: 'green',
    pickup: 'purple',
    assistance: 'orange',
  };
  const colorKey = resolveOrderColor(orderType, deliveryMethod, colors);
  const cls = getOrderTypeClasses(colorKey);

  let label = isPickup ? settings.orderTypeLabels.pickup : settings.orderTypeLabels.delivery;
  if (isAssistance) label = settings.orderTypeLabels.assistance;

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
        <i className="bi bi-tag-fill" /> Tipo de Pedido e Manuseio
      </h3>
      <div className="flex flex-wrap gap-3">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${cls.badge}`}
        >
          {isAssistance ? (
            <i className="bi bi-tools" />
          ) : isPickup ? (
            <PickupIcon className="h-4 w-4" />
          ) : (
            <i className="bi bi-truck" />
          )}
          {label}
        </div>
        {handlingModality && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <i className="bi bi-box-fill text-blue-500" />
            {handlingModality}
          </div>
        )}
      </div>
    </section>
  );
};
