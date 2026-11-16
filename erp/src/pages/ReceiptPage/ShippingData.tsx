import Shipping from '../types/Shipping.type';
import { formatDate } from '../utils/formatters';

interface Props {
  shipping?: Shipping | null;
}

type ReceiptSchedule = Partial<Shipping['scheduling']>;

const formatScheduleOption = (schedule: ReceiptSchedule) => {
  const date = schedule.dateType === 'range' && schedule.date && schedule.endDate
    ? `${formatDate(schedule.date || '')} até ${formatDate(schedule.endDate)}`
    : schedule.date
      ? formatDate(schedule.date)
      : 'Data não definida';
  const time = schedule.type === 'range' && schedule.startTime && schedule.endTime
    ? `${schedule.startTime} às ${schedule.endTime}`
    : schedule.startTime || schedule.time || 'Horário não definido';

  return [date, time].filter(Boolean).join(' · ');
};

const getDeliverySchedules = (shipping?: Shipping | null) => {
  if (!shipping) return [];

  const appointments = shipping.scheduling?.appointments;
  if (appointments?.length) {
    return appointments.flatMap((appointment, index) => {
      const deliveryMethod = appointment.deliveryMethod ?? shipping.deliveryMethod;
      if (deliveryMethod !== 'delivery') return [];

      return [{
        id: appointment.id || `delivery-${index + 1}`,
        scheduling: appointment.scheduling as ReceiptSchedule,
      }];
    });
  }

  // Compatibilidade com pedidos antigos, que guardam o agendamento no nível do pedido.
  if (shipping.deliveryMethod === 'pickup') return [];
  return [{ id: 'legacy-delivery', scheduling: shipping.scheduling as ReceiptSchedule }];
};

const ShippingData = ({ shipping }: Props) => {
  const deliverySchedules = getDeliverySchedules(shipping);
  if (deliverySchedules.length === 0) return null;
  const isSingleDelivery = deliverySchedules.length === 1;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 flex items-center gap-3 after:h-[1px] after:bg-slate-100 after:flex-1 text-left">
        {isSingleDelivery ? 'Programação da entrega' : 'Programações das entregas'}
      </h2>

      <div className="flex flex-col gap-3">
        {deliverySchedules.map(({ id, scheduling }, index) => {
          const isPending = Boolean(scheduling.pendingScheduling);
          const mainSchedule = isPending ? 'Agendamento pendente' : formatScheduleOption(scheduling);
          const alternatives = isPending ? [] : (scheduling.alternatives || [])
            .map(formatScheduleOption)
            .filter(Boolean);

          return (
            <div key={id} className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {isSingleDelivery ? 'Entrega' : `Entrega ${index + 1}`}
              </span>
              <span className="text-sm font-bold text-slate-800">{mainSchedule}</span>
              {alternatives.length > 0 && (
                <span className="text-xs text-slate-500 font-semibold">
                  Alternativas: {alternatives.join(' · ')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ShippingData;
