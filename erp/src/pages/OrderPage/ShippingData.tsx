import { Fragment } from 'react';
import Shipping from '../types/Shipping.type';
import type FullAddress from '../types/fullAddress.type';
import PickupIcon from '@/components/shared/PickupIcon';
import { formatDate, stringifyFullAddress, stringifyFullAddressWithObservation, toTitleCase } from '../utils/shared/formatters';
import { splitNoticeTags } from '../utils/shared/noticeTags';
import { DELIVERY_NOTICE_OPTIONS } from '@/pages/App/SalesOrder/components/steps/logisticsNoticeRules';
import { NumericFormat as NumericFormatBase } from 'react-number-format';
const NumericFormat = NumericFormatBase as any;

interface Props {
  shipping: Shipping;
  isBudget?: boolean;
  itemsTotalValue?: number;
  routeUrl?: string;
  customerAddress?: FullAddress;
  isOperationInfo?: boolean;
  isSalesDocument?: boolean;
  operationNumber?: number;
  legacyNoticeTags?: string[];
}

type PrintedSchedule = Partial<Omit<Shipping['scheduling'], 'appointments'>>;
type PrintedOperation = NonNullable<Shipping['scheduling']['appointments']>[number];

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

const getOperationAddressFields = (address: FullAddress | undefined) => {
  const fields = [
    {
      label: 'Logradouro',
      value: [toTitleCase(address?.street || ''), address?.number].filter(Boolean).join(', ') ||
        address?.formattedAddress || stringifyFullAddress(address) || '—',
    },
    { label: 'Complemento', value: toTitleCase(address?.complement || '') || '—' },
    { label: 'Bairro', value: toTitleCase(address?.neighborhood || '') || '—' },
    {
      label: 'Cidade',
      value: [toTitleCase(address?.city || ''), address?.state?.trim().toLocaleUpperCase('pt-BR')]
        .filter(Boolean)
        .join(' - ') || '—',
    },
  ];
  const observation = address?.observation?.trim();
  if (observation) fields.push({ label: 'Observações', value: observation });
  return fields;
};

const ShippingData = ({
  shipping,
  isBudget,
  itemsTotalValue,
  routeUrl,
  customerAddress,
  isOperationInfo,
  isSalesDocument,
  operationNumber,
  legacyNoticeTags = [],
}: Props) => {
  const appointments = shipping.scheduling?.appointments || [];
  const customerAddressText = stringifyFullAddressWithObservation(customerAddress);
  const legacyOperation: PrintedOperation = {
    id: 'legacy-operation',
    itemIds: [],
    deliveryMethod: shipping.deliveryMethod,
    scheduling: shipping.scheduling,
    useCustomerAddress: shipping.useCustomerAddress,
    deliveryAddress: shipping.deliveryAddress,
    freightValue: shipping.value,
    distance: shipping.distance,
    durationMinutes: shipping.durationMinutes,
    notices: {
      callBeforeDelivery: shipping.callBeforeDelivery,
      bringCardMachine: shipping.bringCardMachine,
      callOnArrival: shipping.callOnArrival,
    },
  };
  const operations: PrintedOperation[] = appointments.length ? appointments : [legacyOperation];
  const operationCount = operations.length;
  const operationDetails = operations.map((operation, index) => {
    const deliveryMethod = operation.deliveryMethod ?? shipping.deliveryMethod;
    const useCustomerAddress = operation.useCustomerAddress ?? shipping.useCustomerAddress !== false;
    const address = useCustomerAddress
      ? customerAddress || operation.deliveryAddress || shipping.deliveryAddress
      : operation.deliveryAddress || shipping.deliveryAddress;
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
    const notices = [
      ...((isSalesDocument && index === 0) || (isOperationInfo && (operationNumber ?? 1) === 1)
        ? legacyNoticeTags
        : []),
      ...DELIVERY_NOTICE_OPTIONS
        .filter((option) => operation.notices?.[option.field] === true)
        .map((option) => option.notice),
      ...splitNoticeTags(operation.notices?.instructions),
    ];
    const noticeByNormalizedText = new Map<string, string>();
    notices.forEach((notice) => {
      const normalized = notice.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
      if (normalized && !noticeByNormalizedText.has(normalized)) noticeByNormalizedText.set(normalized, notice.trim());
    });

    return {
      id: operation.id || `operation-${index + 1}`,
      index,
      deliveryMethod,
      mainSchedule,
      alternatives,
      addressText: addressText && !usesCustomerAddress ? addressText : '',
      addressFields: getOperationAddressFields(address),
      isSameAsCustomerAddress,
      distance: operation.distance ?? (operationCount === 1 ? shipping.distance : undefined),
      durationMinutes: operation.durationMinutes ?? (operationCount === 1 ? shipping.durationMinutes : undefined),
      freightValue: operation.freightValue ?? (operationCount === 1 ? shipping.value : undefined),
      notices: [...noticeByNormalizedText.values()],
    };
  });
  const hasDeliveryOperation = operationDetails.some((operation) => operation.deliveryMethod === 'delivery');
  const hasPickupOperation = operationDetails.some((operation) => operation.deliveryMethod === 'pickup');
  const isPickupOperationInfo = isOperationInfo && hasPickupOperation && !hasDeliveryOperation;

  if (isSalesDocument || isOperationInfo) {
    return (
      <div className="flex w-full flex-col gap-3 text-xs">
        {operationDetails.map((operation) => {
          const isDelivery = operation.deliveryMethod === 'delivery';
          const freightValue = operation.freightValue;

          return (
            <section
              key={operation.id}
              className={`overflow-hidden border ${
                isOperationInfo
                  ? 'rounded-3xl border-slate-300'
                  : 'rounded-2xl border-slate-200'
              } bg-white shadow-sm print-exact-bg`}
            >
              <div className="space-y-3 p-3 sm:p-4">
                {isDelivery && (
                  <section>
                    {shipping.noAddress ? (
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-500">Endereço</span>
                        <span className="mt-1 whitespace-nowrap text-xs font-medium text-slate-800">Endereço não informado</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                        {operation.addressFields.map(({ label, value }) => (
                          <div key={`${operation.id}-address-${label}`} className="flex min-w-0 flex-col">
                            <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                            <span className="mt-1 whitespace-nowrap text-xs font-medium text-slate-800">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                  {isDelivery && (
                    <>
                      <div className="flex min-w-0 flex-col">
                        <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-500">Distância</span>
                        <span className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">
                          {operation.distance != null ? `${operation.distance} km` : '—'}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-500">Tempo estimado</span>
                        <span className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">
                          {operation.durationMinutes != null ? `${operation.durationMinutes} min` : '—'}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-500">Valor do frete</span>
                        <span className={`mt-1 whitespace-nowrap text-sm font-bold ${freightValue === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {freightValue == null ? '—' : freightValue === 0 ? 'Frete grátis' : (
                            <NumericFormat
                              value={freightValue}
                              allowNegative={false}
                              thousandSeparator="."
                              prefix="R$ "
                              decimalScale={2}
                              decimalSeparator=","
                              displayType="text"
                              fixedDecimalScale
                            />
                          )}
                        </span>
                      </div>
                    </>
                  )}

                  <div className={`flex min-w-0 flex-col ${isOperationInfo ? '' : 'rounded-xl border border-slate-200 bg-white p-2'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {isOperationInfo ? 'Agendamento' : 'Agendamentos'}
                    </span>
                    <span className="mt-1 text-sm font-bold text-slate-900">{operation.mainSchedule}</span>
                    {operation.alternatives.length > 0 && (
                      <span className="mt-1 text-xs font-medium text-slate-600">
                        Alternativas: {operation.alternatives.join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                {operation.notices.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50/40 p-3 print-exact-bg-light">
                    <h4 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600">
                      <i className="bi bi-exclamation-octagon-fill" /> Avisos importantes
                    </h4>
                    <div className="text-[11px] leading-8">
                      {operation.notices.map((notice, index) => (
                        <Fragment key={`${operation.id}-notice-${index}`}>
                          {index > 0 ? ' ' : null}
                          <span
                            className="inline whitespace-normal break-words rounded-lg border border-red-100 bg-white px-3 py-1 font-bold text-red-700 box-decoration-clone print-exact-bg"
                            style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
                          >
                            {notice}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}

      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2 w-full text-xs bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
      <div className={isPickupOperationInfo ? 'hidden' : undefined}>
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
            {isOperationInfo ? 'Programação' : 'Agendamentos'}
          </span>
          {operationDetails.map((operation) => (
            isOperationInfo ? (
              <div key={operation.id} className="flex flex-col gap-1 bg-white p-1.5 rounded-xl border border-slate-100">
                <span className="text-sm font-bold text-slate-900">{operation.mainSchedule}</span>
                {operation.alternatives.length > 0 && (
                  <span className="text-xs text-slate-700 font-semibold">
                    Alternativas: {operation.alternatives.join(' · ')}
                  </span>
                )}
              </div>
            ) : (
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
            )
          ))}
        </div>
      )}
    </section>
  );
};

export default ShippingData;
