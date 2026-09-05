export interface ScheduleSlot {
  type: 'fixed' | 'morning' | 'afternoon' | 'commercial' | 'night' | 'not_informed';
  label: string;
  sublabel?: string;
  isFixedTime: boolean;
  timeSortKey: string; // Ex: '13:30', '09:00', '14:00', '99:99'
  displayBadge: string;
}

export const extractScheduleSlot = (order: any): ScheduleSlot => {
  const oData = order?.order_data || {};
  const shipping = oData.shipping || order?.shipping || {};
  const sched = shipping.scheduling || oData.schedule || oData.scheduling || order?.schedule || {};

  const rawType = String(sched.type || sched.period || sched.shift || '').toLowerCase().trim();
  const startTime = String(sched.startTime || sched.time || sched.start_time || '').trim();
  const endTime = String(sched.endTime || sched.end_time || '').trim();
  const isExplicitFixed = rawType === 'fixed' || sched.isFixed === true || sched.fixedTime === true;

  // 1. Período da Manhã (ex: 08:00–12:00 ou 09:00–12:00)
  if (
    rawType.includes('morn') ||
    rawType === 'manha' ||
    rawType === 'manhã' ||
    (!isExplicitFixed && startTime >= '07:00' && startTime <= '11:00' && endTime && endTime <= '13:00' && startTime !== endTime)
  ) {
    const formatted = endTime ? `${startTime}–${endTime}` : '08:00–12:00';
    return {
      type: 'morning',
      label: 'MANHÃ',
      sublabel: formatted,
      isFixedTime: false,
      timeSortKey: startTime || '08:00',
      displayBadge: formatted,
    };
  }

  // 2. Período da Tarde (ex: 13:00–18:00 ou 14:00–18:00)
  if (
    rawType.includes('after') ||
    rawType === 'tarde' ||
    (!isExplicitFixed && startTime >= '12:00' && startTime <= '15:00' && endTime && endTime >= '17:00' && startTime !== endTime)
  ) {
    const formatted = endTime ? `${startTime}–${endTime}` : '13:00–18:00';
    return {
      type: 'afternoon',
      label: 'TARDE',
      sublabel: formatted,
      isFixedTime: false,
      timeSortKey: startTime || '13:00',
      displayBadge: formatted,
    };
  }

  // 3. Período da Noite (ex: 18:00–21:00)
  if (!isExplicitFixed && (rawType.includes('night') || rawType === 'noite' || (startTime >= '18:00' && endTime && startTime !== endTime))) {
    const formatted = endTime ? `${startTime}–${endTime}` : '18:00–21:00';
    return {
      type: 'night',
      label: 'NOITE',
      sublabel: formatted,
      isFixedTime: false,
      timeSortKey: startTime || '18:00',
      displayBadge: formatted,
    };
  }

  // 4. Comercial / Integral (08:00–18:00)
  if (!isExplicitFixed && (rawType.includes('full') || rawType.includes('comercial') || (startTime <= '09:00' && endTime >= '17:00' && startTime !== endTime))) {
    const formatted = endTime ? `${startTime}–${endTime}` : '08:00–18:00';
    return {
      type: 'commercial',
      label: 'HORÁRIO COMERCIAL',
      sublabel: formatted,
      isFixedTime: false,
      timeSortKey: '08:30',
      displayBadge: formatted,
    };
  }

  // 5. Outro intervalo com início e fim diferentes (Ainda é um PERÍODO normal!)
  if (startTime && endTime && startTime !== endTime && !isExplicitFixed) {
    const formatted = `${startTime}–${endTime}`;
    return {
      type: 'commercial',
      label: 'PERÍODO COMBINADO',
      sublabel: formatted,
      isFixedTime: false,
      timeSortKey: startTime.padStart(5, '0'),
      displayBadge: formatted,
    };
  }

  // 6. Horário Fixo / Específico (ex: apenas 15:00 ou marcado como fixed)
  if (startTime) {
    const formatted = startTime;
    return {
      type: 'fixed',
      label: 'HORÁRIO FIXO',
      sublabel: `🔒 ${formatted}`,
      isFixedTime: true,
      timeSortKey: startTime.padStart(5, '0'),
      displayBadge: `🔒 ${formatted}`,
    };
  }

  // 7. Não informado / Sem restrição
  return {
    type: 'not_informed',
    label: 'SEM RESTRIÇÃO DE HORÁRIO',
    sublabel: 'Horário Livre',
    isFixedTime: false,
    timeSortKey: '99:99',
    displayBadge: 'Horário Livre',
  };
};
