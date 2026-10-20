import React from 'react';
import { stringifyFullAddress } from '../../../utils/formatters';
import { splitNoticeTags } from '@/pages/utils/noticeTags';

export interface ShippingSectionProps {
  fullAddress: any;
  distance?: number;
  durationMinutes?: number;
  deliveryResponsibleName?: string;
  deliveryResponsibles?: Array<{ id?: string; name: string; role?: string }>;
  isReadOnly?: boolean;
}

export const ShippingSection: React.FC<ShippingSectionProps> = ({
  fullAddress,
  distance,
  durationMinutes,
  deliveryResponsibleName,
  deliveryResponsibles,
}) => {
  const addressText = stringifyFullAddress(fullAddress);
  const addressNotices = splitNoticeTags(
    fullAddress?.observation || fullAddress?.observations || fullAddress?.notes || ''
  );

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
        <i className="bi bi-geo-alt-fill" /> Endereço de Entrega
      </h3>

      <p
        className={`text-sm leading-relaxed ${
          addressText
            ? 'font-semibold text-slate-700 dark:text-slate-300'
            : 'font-medium italic text-slate-400 dark:text-slate-500'
        }`}
      >
        {addressText || 'Endereço não informado'}
      </p>

      {addressNotices.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <i
            className="bi bi-exclamation-circle-fill text-[14px] text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          {addressNotices.map((notice, index) => (
            <span
              key={`${index}-${notice}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-800 shadow-sm shadow-amber-100/50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:shadow-none"
            >
              {notice}
            </span>
          ))}
        </div>
      )}

      {(distance !== undefined || durationMinutes !== undefined) && (
        <div className="flex items-center gap-5 mt-3">
          {distance !== undefined && (
            <div>
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                Distância
              </p>
              <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                {distance.toFixed(1)} km
              </p>
            </div>
          )}
          {durationMinutes !== undefined && (
            <div>
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                Tempo Est.
              </p>
              <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                {durationMinutes} min
              </p>
            </div>
          )}
        </div>
      )}

      {(deliveryResponsibleName || (deliveryResponsibles && deliveryResponsibles.length > 0)) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <i className="bi bi-person-badge-fill text-blue-500 text-xs" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Responsável pela Entrega:
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {deliveryResponsibleName || deliveryResponsibles?.map((r) => r.name).join(', ')}
          </span>
        </div>
      )}
    </section>
  );
};
