import Shipping from '../types/Shipping.type';
import type FullAddress from '../types/fullAddress.type';
import PickupIcon from '@/components/shared/PickupIcon';
import { formatDate, stringifyFullAddressWithObservation } from '../utils/formatters';
import { NumericFormat as NumericFormatBase } from 'react-number-format';
const NumericFormat = NumericFormatBase as any;

interface Props {
  shipping: Shipping;
  isBudget?: boolean;
  itemsTotalValue?: number;
  routeUrl?: string;
  customerAddress?: FullAddress;
}

type PrintedSchedule = Partial<Omit<Shipping['scheduling'], 'appointments'>>;

const formatSchedule = (schedule: PrintedSchedule) => {
  const date = schedule.dateType === 'range' && schedule.date && schedule.endDate
    ? `de ${formatDate(schedule.date)} até ${formatDate(schedule.endDate)}`
    : schedule.date
      ? formatDate(schedule.date)
      : 'Data não definida';
  const time = schedule.type === 'range' && schedule.startTime && schedule.endTime
    ? `${schedule.startTime} às ${schedule.endTime}`
    : schedule.startTime || schedule.time || 'Horário não definido';
  return `${date} · ${time}`;
};

const normalizeAddress = (address: FullAddress | undefined) =>
  stringifyFullAddressWithObservation(address)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]/g, '');

const ShippingData = ({ shipping, isBudget, itemsTotalValue, routeUrl, customerAddress }: Props) => {
  const appointments = shipping.scheduling?.appointments || [];
  const customerAddressText = stringifyFullAddressWithObservation(customerAddress);
  const operations = appointments.length
    ? appointments
    : [{
        id: 'legacy-operation',
        deliveryMethod: shipping.deliveryMethod,
        scheduling: shipping.scheduling,
        useCustomerAddress: shipping.useCustomerAddress,
        deliveryAddress: shipping.deliveryAddress,
      }];
  const operationDetails = operations.map((operation, index) => {
    const deliveryMethod = operation.deliveryMethod ?? shipping.deliveryMethod;
    const useCustomerAddress = operation.useCustomerAddress ?? shipping.useCustomerAddress !== false;
    const address = useCustomerAddress ? customerAddress : operation.deliveryAddress || shipping.deliveryAddress;
    const addressText = !shipping.noAddress && deliveryMethod === 'delivery'
      ? stringifyFullAddressWithObservation(address)
      : '';
    const usesCustomerAddress = useCustomerAddress || Boolean(
      addressText && normalizeAddress(address) === normalizeAddress(customerAddress)
    );
    const isSameAsCustomerAddress = Boolean(
      !shipping.noAddress && deliveryMethod === 'delivery' && customerAddressText && usesCustomerAddress
    );
    const schedule = operation.scheduling;
    const isImmediatePickup = deliveryMethod === 'pickup' && Boolean(schedule.immediatePickup);
    const mainSchedule = isImmediatePickup
      ? 'Retirada imediata'
      : schedule.pendingScheduling
        ? 'Agendamento pendente'
        : schedule.notInformed
          ? 'Programação não informada'
          : formatSchedule(schedule);
    const alternatives = schedule.pendingScheduling || isImmediatePickup || schedule.notInformed
      ? []
      : (schedule.alternatives || []).map((alternative) => formatSchedule(alternative));

    return {
      id: operation.id || `operation-${index + 1}`,
      index,
      deliveryMethod,
      mainSchedule,
      alternatives,
      addressText: addressText && !usesCustomerAddress ? addressText : '',
      isSameAsCustomerAddress,
    };
  });
  const hasDeliveryOperation = operationDetails.some((operation) => operation.deliveryMethod === 'delivery');
  const hasPickupOperation = operationDetails.some((operation) => operation.deliveryMethod === 'pickup');
  const operationCount = operationDetails.length;

  return (
    <section className="flex flex-col gap-2 w-full text-xs bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1 flex items-center gap-2">
          {!hasDeliveryOperation && hasPickupOperation ? (
            <PickupIcon className="h-4 w-4" />
          ) : (
            <i className="bi bi-truck text-base" />
          )}{' '}
          {hasDeliveryOperation && hasPickupOperation
            ? 'OPERAÇÕES'
            : hasPickupOperation
              ? 'RETIRADA'
              : 'ENTREGA E FRETE'}
        </h3>

        <div className="grid grid-cols-2 gap-1 mb-1">
          {!isBudget && (
            <div className="bg-white p-1.5 rounded-xl border border-slate-100 flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                Distância
              </span>
              <span className="font-black text-slate-900 text-sm">
                {shipping.distance ? `${shipping.distance} km` : '---'}
              </span>
            </div>
          )}
          {!isBudget && (
            <div className="bg-white p-1.5 rounded-xl border border-slate-100 flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                Tempo Est.
              </span>
              <span className="font-black text-slate-900 text-sm">
                {shipping.durationMinutes ? `${shipping.durationMinutes} min` : '---'}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center bg-white p-1.5 rounded-xl border border-slate-100">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            Valor do Frete
          </span>
          {shipping.value === 0 ? (
            <span className="font-black text-emerald-600 text-base uppercase">Frete Grátis</span>
          ) : (
            <span className="font-black text-slate-900 text-base">
              <NumericFormat
                value={shipping.value}
                allowNegative={false}
                thousandSeparator="."
                prefix={'R$ '}
                decimalScale={2}
                decimalSeparator=","
                displayType="text"
                fixedDecimalScale
              />
            </span>
          )}
        </div>

        {isBudget && itemsTotalValue !== undefined && (
          <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 mt-2 print-exact-bg">
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-widest">
              Valor Total (c/ Frete)
            </span>
            <span className="font-black text-indigo-900 text-lg">
              <NumericFormat
                value={itemsTotalValue + (shipping.value || 0)}
                allowNegative={false}
                thousandSeparator="."
                prefix={'R$ '}
                decimalScale={2}
                decimalSeparator=","
                displayType="text"
                fixedDecimalScale
              />
            </span>
          </div>
        )}

        {routeUrl?.trim() && (
          <div className="mt-2 break-all rounded-xl border border-blue-100 bg-blue-50/60 p-2 text-[10px] font-semibold text-blue-700 print-exact-bg">
            <span className="font-black uppercase tracking-wider">Rota no Google Maps: </span>
            <a href={routeUrl} target="_blank" rel="noreferrer" className="underline">
              {routeUrl}
            </a>
          </div>
        )}
      </div>

      {!isBudget && (
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            {operationCount > 1 ? 'Programação das operações' : `Programação da ${hasPickupOperation ? 'retirada' : 'entrega'}`}
          </span>
          {operationDetails.map((operation) => (
            <div key={operation.id} className="flex flex-col gap-1 bg-white p-1.5 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {operationCount > 1
                  ? `Operação ${operation.index + 1}/${operationCount} · ${operation.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}`
                  : operation.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
              </span>
              <span className="text-sm font-bold text-slate-900">{operation.mainSchedule}</span>
              {operation.alternatives.length > 0 && (
                <span className="text-xs text-slate-700 font-semibold">
                  Alternativas: {operation.alternatives.join(' · ')}
                </span>
              )}
              {operation.addressText && (
                <span className="text-xs text-slate-700">
                  <strong>Endereço desta operação:</strong> {operation.addressText}
                </span>
              )}
              {operation.isSameAsCustomerAddress && (
                <span className="text-xs text-slate-700">
                  <strong>Endereço:</strong> No mesmo endereço do cliente
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ShippingData;
