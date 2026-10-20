import React from 'react';
import PickupIcon from '@/components/shared/PickupIcon';
import Order from '../../../../types/order.type';
import { stringifyFullAddressWithObservation } from '../../../../utils/formatters';

interface CardLinkedOrderOverlayProps {
  order: Order;
  isLinkedPickup: boolean;
  linkedBtnBg: string;
  linkedLabel: string;
  linkedIcon: string;
  linkedIconColor: string;
}

export const CardLinkedOrderOverlay: React.FC<CardLinkedOrderOverlayProps> = ({
  order,
  isLinkedPickup,
  linkedBtnBg,
  linkedLabel,
  linkedIcon,
  linkedIconColor,
}) => {
  const [showOrderTooltip, setShowOrderTooltip] = React.useState(false);

  return (
    <div className="relative group/truck">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowOrderTooltip(!showOrderTooltip);
        }}
        className={`${linkedBtnBg} text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow flex items-center gap-1 transition-transform hover:scale-105 active:scale-95`}
        title={`Ver ${linkedLabel.toLowerCase()}`}
      >
        {isLinkedPickup ? (
          <PickupIcon white className="h-3 w-3" />
        ) : (
          <i className={`bi ${linkedIcon} text-xs`} />
        )}
        <span>{isLinkedPickup ? 'Retirada' : 'Entrega'}</span>
      </button>

      {showOrderTooltip && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium-lg z-[100] p-3 animate-slide-up-custom overflow-hidden">
          <div className="flex items-center gap-2 mb-2 border-b pb-2 dark:border-slate-800">
            {isLinkedPickup ? (
              <PickupIcon className={`h-3.5 w-3.5 ${linkedIconColor}`} />
            ) : (
              <i className={`bi ${linkedIcon} ${linkedIconColor}`} />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {linkedLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Cliente
              </span>
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase">
                {order.customerData?.fullName || 'Consumidor'}
              </p>
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5 text-left">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Endereço
              </span>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
              </p>
            </div>
          </div>
          <div
            className={`absolute top-0 right-0 w-16 h-16 ${
              isLinkedPickup ? 'bg-purple-600/5' : 'bg-emerald-600/5'
            } rotate-45 translate-x-8 -translate-y-8`}
          />
        </div>
      )}
    </div>
  );
};
