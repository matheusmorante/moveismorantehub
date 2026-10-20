import React from 'react';
import PickupIcon from '@/components/shared/PickupIcon';
import Order from '../../../../types/order.type';
import { stringifyFullAddressWithObservation } from '../../../../utils/formatters';

interface LinkedOrderOverlayProps {
  order: Order;
  isLinkedPickup: boolean;
  linkedBtnBg: string;
  linkedLabel: string;
  linkedIcon: string;
  linkedIconColor: string;
}

export const LinkedOrderOverlay: React.FC<LinkedOrderOverlayProps> = ({
  order,
  isLinkedPickup,
  linkedBtnBg,
  linkedLabel,
  linkedIcon,
  linkedIconColor,
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className="absolute -top-3 -right-3 z-[60]">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        className={`${linkedBtnBg} text-white w-12 h-12 rounded-full border-4 border-white dark:border-slate-950 shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}
        title={`Ver ${linkedLabel.toLowerCase()}`}
      >
        {isLinkedPickup ? (
          <PickupIcon white className="h-5 w-5" />
        ) : (
          <i className={`bi ${linkedIcon} text-xl`} />
        )}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-4 animate-slide-up-custom overflow-hidden">
          <div className="flex items-center gap-2 mb-3 border-b pb-2 dark:border-slate-800">
            {isLinkedPickup ? (
              <PickupIcon className={`h-4 w-4 ${linkedIconColor}`} />
            ) : (
              <i className={`bi ${linkedIcon} ${linkedIconColor}`} />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {linkedLabel}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Cliente
              </span>
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase">
                {order.customerData?.fullName || 'Consumidor'}
              </p>
            </div>
            <div className="flex flex-col gap-1 mt-1">
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
            }`}
          />
        </div>
      )}
    </div>
  );
};
