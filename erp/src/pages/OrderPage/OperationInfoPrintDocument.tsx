import React from 'react';
import type Order from '@/pages/types/order.type';
import logoMorante from '../../assets/logo-morante.svg';
import { formatDate, formatToBRDate, stringifyFullAddressWithObservation } from '../utils/formatters';
import { formatOrderCode } from '../utils/orderCode';
import { formatCurrency } from '../utils/formatters';
import { getEffectiveOrderDeliveryAddress, getEffectiveOrderDeliveryMapUrl } from '../utils/orderDeliveryAddress';
import { getOperationAddressLabel } from '../App/SalesOrder/OrderActions/operationActionScope';

interface OperationInfoPrintDocumentProps {
  order: Order;
}

const formatSchedule = (order: Order) => {
  const schedule = order.shipping?.scheduling;
  if (!schedule) return 'Programação não informada';
  if (schedule.immediatePickup && order.shipping?.deliveryMethod === 'pickup') return 'Retirada imediata';
  if (schedule.pendingScheduling) return 'Agendamento pendente';
  if (schedule.notInformed) return 'Programação não informada';

  const date = schedule.dateType === 'range' && schedule.endDate
    ? `de ${formatDate(schedule.date)} até ${formatDate(schedule.endDate)}`
    : schedule.date
      ? formatDate(schedule.date)
      : 'Data não definida';
  const time = schedule.type === 'range' && schedule.startTime && schedule.endTime
    ? `${schedule.startTime} às ${schedule.endTime}`
    : schedule.startTime || schedule.time || 'Horário não definido';
  return `${date} · ${time}`;
};

const normalizeAddress = (address: unknown) =>
  stringifyFullAddressWithObservation(address)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]/g, '');

export const OperationInfoPrintDocument: React.FC<OperationInfoPrintDocumentProps> = ({ order }) => {
  const shipping = order.shipping;
  const isPickup = shipping?.deliveryMethod === 'pickup';
  const context = order.operationContext;
  const appointment = shipping?.scheduling?.appointments?.[0];
  const operationNumber = context?.operationNumber ?? 1;
  const operationCount = context?.operationCount ?? 1;
  const customerAddress = order.customerData?.fullAddress;
  const operationAddress = getEffectiveOrderDeliveryAddress(order);
  const operationAddressText = stringifyFullAddressWithObservation(operationAddress);
  const sameAsCustomerAddress = Boolean(
    !shipping?.noAddress && customerAddress && operationAddressText &&
      (shipping.useCustomerAddress !== false ||
        normalizeAddress(operationAddress) === normalizeAddress(customerAddress))
  );
  const addressLabel = shipping?.noAddress
    ? (isPickup ? 'Retirada em loja' : 'Endereço não informado')
    : isPickup
      ? 'Retirada em loja'
      : sameAsCustomerAddress
        ? 'No mesmo endereço do cliente'
        : operationAddressText || getOperationAddressLabel(order);
  const routeUrl = getEffectiveOrderDeliveryMapUrl(order);
  const schedule = shipping?.scheduling;
  const alternatives = schedule?.pendingScheduling || schedule?.immediatePickup
    ? []
    : (schedule?.alternatives || []).map((alternative) => {
        const date = alternative.dateType === 'range' && alternative.endDate
          ? `de ${formatDate(alternative.date)} até ${formatDate(alternative.endDate)}`
          : alternative.date
            ? formatDate(alternative.date)
            : 'Data não definida';
        const time = alternative.type === 'range' && alternative.startTime && alternative.endTime
          ? `${alternative.startTime} às ${alternative.endTime}`
          : alternative.startTime || alternative.time || 'Horário não definido';
        return `${date} · ${time}`;
      });
  const notices = appointment?.notices;
  const hasDeliveryNotices = !isPickup && Boolean(notices);

  return (
    <main className="operation-print-page min-h-screen bg-white px-8 py-6 text-slate-900 font-sans">
      <header className="flex items-center justify-between gap-8 border-b-2 border-slate-200 pb-5">
        <img src={logoMorante} alt="Móveis Morante" className="h-20 w-52 object-contain object-left" />
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Informações da operação</p>
          <h1 className="mt-1 text-2xl font-black uppercase text-slate-900">
            Operação {operationNumber}/{operationCount} · {isPickup ? 'Retirada' : 'Entrega'}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-600">
            Pedido #{formatOrderCode(order)} · Venda de {formatToBRDate(order.date)}
          </p>
        </div>
      </header>

      <section className="mt-5 rounded-xl border border-slate-200 p-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Cliente</h2>
        <p className="mt-2 text-lg font-bold">{order.customerData?.fullName || 'Cliente não informado'}</p>
        {order.customerData?.phone && <p className="mt-1 text-sm">WhatsApp: {order.customerData.phone}</p>}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Programação</h2>
          <p className="mt-2 text-base font-bold">{formatSchedule(order)}</p>
          {alternatives.length > 0 && (
            <div className="mt-3 text-sm">
              <span className="font-bold">Alternativas:</span>
              <ul className="mt-1 list-disc pl-5">
                {alternatives.map((alternative, index) => <li key={`${alternative}-${index}`}>{alternative}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Endereço</h2>
          <p className="mt-2 text-base font-bold">{addressLabel}</p>
          {routeUrl && <p className="mt-2 break-all text-xs text-blue-700">Rota no Google Maps: {routeUrl}</p>}
          {!isPickup && (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span><strong>Frete:</strong> {formatCurrency(shipping?.value || 0)}</span>
              {shipping?.distance ? <span><strong>Distância:</strong> {shipping.distance} km</span> : null}
            </div>
          )}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Itens desta operação</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <th className="border border-slate-300 px-3 py-2">Produto ou serviço</th>
              <th className="w-28 border border-slate-300 px-3 py-2 text-right">Quantidade</th>
              <th className="w-64 border border-slate-300 px-3 py-2">Manuseio</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => (
              <tr key={item.orderItemId || `${item.description}-${index}`}>
                <td className="border border-slate-300 px-3 py-2 font-semibold">{item.description}</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{item.quantity} UN</td>
                <td className="border border-slate-300 px-3 py-2">{item.handlingType || 'Não informado'}</td>
              </tr>
            ))}
            {order.items.length === 0 && (
              <tr>
                <td colSpan={3} className="border border-slate-300 px-3 py-4 text-center text-slate-500">
                  Nenhum item vinculado a esta operação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {hasDeliveryNotices && (
        <section className="mt-5 rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Avisos sobre a entrega</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <p><strong>Ligar antes:</strong> {notices?.callBeforeDelivery ? 'Sim' : 'Não'}</p>
            <p><strong>Levar máquina de cartão:</strong> {notices?.bringCardMachine ? 'Sim' : 'Não'}</p>
            <p><strong>Ligar ao chegar:</strong> {notices?.callOnArrival ? 'Sim' : 'Não'}</p>
          </div>
          {notices?.instructions?.trim() && (
            <p className="mt-3 whitespace-pre-wrap text-sm"><strong>Instruções:</strong> {notices.instructions}</p>
          )}
        </section>
      )}

      {isPickup && notices?.instructions?.trim() && (
        <section className="mt-5 rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Avisos sobre a retirada</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{notices.instructions}</p>
        </section>
      )}

      <footer className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Móveis Morante · Qualidade e confiança
      </footer>

      <style>{`@media print { @page { margin: 10mm; } .operation-print-page { min-height: auto !important; padding: 0 !important; } }`}</style>
    </main>
  );
};

export default OperationInfoPrintDocument;
