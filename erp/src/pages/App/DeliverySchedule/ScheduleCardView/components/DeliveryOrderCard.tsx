import React from 'react';
import Order from '../../../../types/order.type';
import { getSettings } from '@/pages/utils/settingsService';
import { getOrderStatusLabel } from '@/pages/utils/orderStatusPresentation';
import { stringifyFullAddressWithObservation } from '../../../../utils/formatters';
import {
  getOrderTypeClasses,
  resolveOrderColor,
} from '../../../../utils/orderTypeColorUtils';
import { splitNoticeTags } from '../../../../utils/noticeTags';
import { resolveEffectiveSchedule } from '../../../../../../../shared-utils/commercialOrderRules';
import { CardHeaderBadges } from './CardHeaderBadges';
import { CardLinkedOrderOverlay } from './CardLinkedOrderOverlay';
import { CardTimeStatusBar } from './CardTimeStatusBar';
import { CardItemsList } from './CardItemsList';
import {
  checkHasInternalAssembly,
  checkHasOutsideAssembly,
  resolveCardDisplayTime,
} from './cardViewHelpers';

interface DeliveryOrderCardProps {
  order: Order;
  index: number;
  onOrderClick: (order: Order) => void;
  isReadOnly?: boolean;
}

export const DeliveryOrderCard: React.FC<DeliveryOrderCardProps> = ({
  order,
  onOrderClick,
}) => {
  const settings = getSettings();

  const isAssistance = order.orderType === 'assistance' || (order as any).taskType === 'assistance';
  const isPickupTask = (order as any).taskType === 'pickup';
  const isAssemblyTask = (order as any).taskType === 'assembly';
  const isPickup = order.shipping?.deliveryMethod === 'pickup' || isPickupTask;

  const scheduleRes = resolveEffectiveSchedule(order);
  const activeOption = scheduleRes.effective;
  const isUsingAlternative = scheduleRes.isUsingAlternative;

  const displayTime = resolveCardDisplayTime(order, isAssistance, activeOption?.formattedTime);

  const colors = settings.orderTypeColors ?? {
    delivery: 'green',
    pickup: 'purple',
    assistance: 'orange',
  };
  const colorKey = isAssemblyTask
    ? 'rose'
    : resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
  const cls = getOrderTypeClasses(colorKey);

  const allOptions = [
    ...(settings.deliveryHandlingOptions || []),
    ...(settings.pickupHandlingOptions || []),
  ];

  const allItems = [...(order.items || []), ...((order.assistanceItems as any) || [])];
  const isReturn =
    order.orderType === 'return' ||
    (order as any).type === 'return' ||
    (order as any).is_return === true;

  const hasOutsideAssembly = !isReturn && checkHasOutsideAssembly(allItems, allOptions);
  const hasInternalAssembly = !isReturn && checkHasInternalAssembly(allItems, allOptions);

  const statuses = settings.orderStatuses?.map((s) => ({
    ...s,
    label: ['scheduled', 'fulfilled'].includes(s.id)
      ? getOrderStatusLabel({ ...order, status: s.id }, s.label)
      : s.label,
  })) || [
    { id: 'draft', label: 'Rascunho', color: 'slate' },
    { id: 'scheduled', label: getOrderStatusLabel({ ...order, status: 'scheduled' }, 'Agendado'), color: 'amber' },
    { id: 'fulfilled', label: getOrderStatusLabel({ ...order, status: 'fulfilled' }, 'Atendido'), color: 'emerald' },
    { id: 'cancelled', label: 'Cancelado', color: 'rose' },
  ];
  const currentStatus = statuses.find((s) => s.id === (order.status || 'draft')) || statuses[0];

  const hasLinkedDelivery = (order as any).hasLinkedDelivery;
  const isLinkedPickup = order.shipping?.deliveryMethod === 'pickup';

  return (
    <div
      onClick={() => onOrderClick(order)}
      className={`group border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 cursor-pointer ${cls.cardBg} ${cls.cardBorder} hover:-translate-y-0.5 hover:shadow-md`}
    >
      {/* Top Header com Badges Operacionais */}
      <div
        className={`px-3.5 py-2 border-b dark:border-slate-800 flex justify-between items-center ${
          hasOutsideAssembly
            ? 'bg-red-50/50 dark:bg-red-950/20'
            : hasInternalAssembly || isAssemblyTask
              ? 'bg-amber-50/50 dark:bg-amber-950/20'
              : 'bg-slate-50/50 dark:bg-slate-900/10'
        }`}
      >
        <CardHeaderBadges
          orderType={order.orderType}
          isAssistance={isAssistance}
          isPickup={isPickup}
          hasInternalAssembly={hasInternalAssembly}
          hasOutsideAssembly={hasOutsideAssembly}
          isAssemblyTask={isAssemblyTask}
          isUsingAlternative={isUsingAlternative}
          activeOption={activeOption}
        />
      </div>

      {/* Botão de pedido vinculado quando em tarefa de montagem */}
      {isAssemblyTask && hasLinkedDelivery && (
        <CardLinkedOrderOverlay
          order={order}
          isLinkedPickup={isLinkedPickup}
          linkedBtnBg={isLinkedPickup ? 'bg-purple-600' : 'bg-emerald-600'}
          linkedLabel={isLinkedPickup ? 'Detalhes da Retirada' : 'Detalhes da Entrega'}
          linkedIcon={isLinkedPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck'}
          linkedIconColor={isLinkedPickup ? 'text-purple-500' : 'text-emerald-500'}
        />
      )}

      {/* Barra de Horário & Status */}
      <CardTimeStatusBar
        order={order}
        displayTime={displayTime}
        cls={cls}
        currentStatus={currentStatus}
        scheduleRes={scheduleRes}
      />

      {/* Conteúdo do Card */}
      <div className="p-3 sm:p-3.5 text-sm flex flex-col gap-2.5 text-left">
        {!isAssemblyTask && (
          <div>
            <div className="font-black text-slate-900 dark:text-slate-100 text-base leading-tight uppercase tracking-tight transition-colors">
              {order.customerData?.fullName || 'Consumidor'}
            </div>
          </div>
        )}

        {/* Descrição da Assistência */}
        {isAssistance && (order as any).assistanceDescription && (
          <div className="flex items-start gap-3 bg-amber-50/60 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20">
            <i className="bi bi-tools text-amber-500 mt-0.5 shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
              {(order as any).assistanceDescription}
            </span>
          </div>
        )}

        {/* Endereço e Trajeto */}
        <div className="flex flex-col gap-2">
          {!isPickupTask && !isAssemblyTask && (
            <>
              <div className="flex items-start gap-4 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group/addr hover:bg-white dark:hover:bg-slate-950 transition-all duration-300">
                <i className="bi bi-geo-alt-fill text-red-500 mt-0.5 group-hover/addr:scale-110 transition-transform" />
                <span className="leading-snug text-xs font-bold text-slate-500 dark:text-slate-400">
                  {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                </span>
              </div>

              {order.shipping?.distance || order.shipping?.durationMinutes ? (
                <div className="flex items-center gap-6 px-4 py-2 bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30 dark:border-blue-900/20">
                  {order.shipping?.distance !== undefined && (
                    <div className="flex items-center gap-2 min-w-fit">
                      <i className="bi bi-map-fill text-blue-500 text-xs" />
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">
                        {order.shipping.distance.toFixed(1)} KM
                      </span>
                    </div>
                  )}
                  {order.shipping?.durationMinutes !== undefined && (
                    <div className="flex items-center gap-2 min-w-fit border-l border-blue-100 dark:border-blue-900 pl-6 ml-auto">
                      <i className="bi bi-hourglass-fill text-blue-500 text-xs" />
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">
                        ~ {order.shipping.durationMinutes} MIN
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100/30 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <i className="bi bi-geo-fill text-slate-300 dark:text-slate-600 text-[10px]" />
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                    Percurso não calculado
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lista de Itens com Selo de Montagem */}
        <CardItemsList
          items={allItems}
          isAssemblyTask={isAssemblyTask}
          isAssistance={isAssistance}
          allOptions={allOptions}
        />

        {/* Observações com Tags */}
        {settings.showScheduleNoticeLabels && order.observation && (
          <div className="text-red-800 dark:text-red-200/70 bg-red-50/50 dark:bg-red-900/10 p-3 rounded-xl text-xs border border-red-100/50 dark:border-red-900/30 flex items-start gap-3 transition-colors">
            <i className="bi bi-exclamation-octagon-fill text-red-500 mt-0.5" />
            <div className="flex flex-col gap-1.5 w-full">
              <strong className="uppercase font-black text-[9px] tracking-widest text-red-600 dark:text-red-500">
                Observações:
              </strong>
              <div className="flex flex-wrap gap-1.5 w-full">
                {splitNoticeTags(order.observation).map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-red-100/50 dark:bg-red-900/40 text-[10px] font-bold rounded-lg border border-red-200/50 dark:border-red-800/50 text-red-800 dark:text-red-200 uppercase tracking-tight"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
