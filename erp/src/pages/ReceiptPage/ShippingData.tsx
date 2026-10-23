import Shipping from '../types/Shipping.type';
import { formatDate } from '../utils/formatters';
import { resolveEffectiveSchedule } from '../../../../shared-utils/commercialOrderRules';
import { NumericFormat as NumericFormatBase } from 'react-number-format';
const NumericFormat = NumericFormatBase as any;

interface Props {
  shipping?: Shipping | null;
  routeUrl?: string;
}

const ShippingData = ({ shipping, routeUrl }: Props) => {
  const shippingDate = shipping?.scheduling?.date || (shipping as any)?.date || '';
  const shippingValue = Number(shipping?.value ?? 0);
  const scheduling = shipping?.scheduling;
  const resolution = resolveEffectiveSchedule(shipping ? { shipping } : null);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 flex items-center gap-3 after:h-[1px] after:bg-slate-100 after:flex-1 text-left">
        Logística e Entrega
      </h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
            Valor do Frete
          </span>
          <div className="text-sm font-black text-slate-800">
            {shippingValue === 0 ? (
              <span className="text-emerald-600 uppercase tracking-tighter">FRETE GRÁTIS</span>
            ) : (
              <NumericFormat
                value={shippingValue}
                allowNegative={false}
                thousandSeparator="."
                prefix={'R$ '}
                decimalScale={2}
                decimalSeparator=","
                fixedDecimalScale
              />
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
            Agendamento
          </span>
          <span className="text-sm font-bold text-slate-800 lowercase">
            {scheduling?.dateType === 'range' && scheduling?.endDate
              ? `de ${formatDate(shippingDate)} até ${formatDate(scheduling.endDate)}`
              : formatDate(shippingDate)}
            <span className="text-slate-400 px-1">|</span>
            {scheduling?.type === 'range' &&
            scheduling?.startTime &&
            scheduling?.endTime
              ? `${scheduling.startTime} às ${scheduling.endTime}`
              : scheduling?.startTime || scheduling?.time || 'A combinar'}
          </span>
          {resolution.alternatives.length > 0 && (
            <span className="text-xs text-slate-500 mt-1 font-semibold">
              Datas alternativas: {resolution.alternativesSummaryText}
            </span>
          )}
        </div>
      </div>

      {routeUrl?.trim() && (
        <div className="break-all rounded-xl border border-blue-100 bg-blue-50/60 p-2 text-[10px] font-semibold text-blue-700 print-exact-bg">
          <span className="font-black uppercase tracking-wider">Rota no Google Maps: </span>
          <a href={routeUrl} target="_blank" rel="noreferrer" className="underline">
            {routeUrl}
          </a>
        </div>
      )}
    </section>
  );
};

export default ShippingData;
