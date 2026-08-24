// Helpers de formatação e utilitários de pedidos

export const getOrderTotalValue = (item: any): number => {
  if (!item) return 0;
  const orderData = item.order_data || {};

  if (orderData.paymentsSummary?.totalOrderValue != null && Number(orderData.paymentsSummary.totalOrderValue) > 0) {
    return Number(orderData.paymentsSummary.totalOrderValue);
  }

  if (orderData.totalValue != null && Number(orderData.totalValue) > 0) {
    return Number(orderData.totalValue);
  }

  if (item.total_value != null && Number(item.total_value) > 0) {
    return Number(item.total_value);
  }

  if (orderData.total != null && Number(orderData.total) > 0) {
    return Number(orderData.total);
  }

  const items = orderData.items || item.items || [];
  if (Array.isArray(items) && items.length > 0) {
    const sum = items.reduce((acc: number, i: any) => {
      const price = Number(i.unitPrice ?? i.price ?? i.total ?? 0);
      const qty = Number(i.quantity ?? 1);
      return acc + (price * qty);
    }, 0);
    if (sum > 0) return sum;
  }

  return 0;
};

export const formatOrderTotal = (item: any): string => {
  const val = getOrderTotalValue(item);
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatItemNameExact = (item: any): string => {
  if (!item) return 'Móvel';
  const raw = item.description || item.name || item.title || item.productName || item.product_name || item.product || '';
  if (!raw) return 'Móvel';
  return String(raw).replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim() || String(raw);
};

export const formatItemsListSummary = (items: any[]): string => {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .filter(Boolean)
    .map((i: any) => {
      const qty = Number(i.quantity || i.qty || 1);
      const name = formatItemNameExact(i);
      return `${qty}x ${name}`;
    })
    .join(', ');
};

// Monta o endereço completo de entrega (Rua, Número, Bairro, Complemento, Cidade)
export const formatFullAddress = (shipping: any, customerData: any): string => {
  const deliveryAddr = shipping?.deliveryAddress || shipping?.address || {};
  const custAddr = customerData?.address || customerData?.fullAddress || {};

  const street = (deliveryAddr.street || deliveryAddr.address || custAddr.street || custAddr.address || '').trim();
  const number = (deliveryAddr.number || custAddr.number || '').trim();
  const neighborhood = (deliveryAddr.neighborhood || custAddr.neighborhood || '').trim();
  const complement = (deliveryAddr.complement || custAddr.complement || '').trim();
  const city = (deliveryAddr.city || shipping?.city || custAddr.city || customerData?.city || 'Colombo').trim();

  const parts: string[] = [];

  if (street) {
    let streetWithNumber = street;
    if (number) streetWithNumber += `, ${number}`;
    parts.push(streetWithNumber);
  }

  if (neighborhood) parts.push(neighborhood);
  if (complement) parts.push(complement);
  if (city) parts.push(city);

  if (parts.length === 0) return city || 'Colombo';
  return parts.join(' - ');
};

const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseOrderDateStr = (rawDate: any): string => {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  if (!str || str === 'sem_data' || str === 'null' || str === 'undefined') return '';

  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      // Formato YYYY/MM/DD
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // Formato brasileiro DD/MM/YYYY
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  const isoDate = str.split('T')[0];
  const isoParts = isoDate.split('-');
  if (isoParts.length === 3) {
    return `${isoParts[0]}-${isoParts[1].padStart(2, '0')}-${isoParts[2].padStart(2, '0')}`;
  }

  return isoDate;
};

export interface DateGroupedOrders {
  dateKey: string;
  dateLabel: string;
  orders: any[];
}

export const formatGroupDateLabel = (dateStr: string): string => {
  if (!dateStr || dateStr === 'sem_data') return 'Data não definida';

  const clean = parseOrderDateStr(dateStr);
  if (!clean) return 'Data não definida';

  const [year, month, day] = clean.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const d = new Date(year, month - 1, day, 12, 0, 0);
  const now = new Date();
  const todayStr = getLocalDateString(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  const dayOfWeekNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dayName = dayOfWeekNames[d.getDay()] || '';

  if (clean === todayStr) {
    return `Hoje (${dayName}, ${formattedDate})`;
  }

  return `${dayName}, ${formattedDate}`;
};

export const groupOrdersByDate = (ordersList: any[]): DateGroupedOrders[] => {
  const groupsMap: Record<string, any[]> = {};

  ordersList.forEach((o) => {
    const oData = o.order_data || {};
    const shipping = oData.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};

    const isPendingScheduling = (
      sched.pendingScheduling === true ||
      sched.notInformed === true ||
      oData.pendingScheduling === true ||
      o.pending_scheduling === true ||
      o.pendingScheduling === true
    );

    const rawDate = isPendingScheduling ? 'sem_data' : (sched.date || sched.startDate || o.scheduled_date || o.date || '');
    const dateKey = isPendingScheduling ? 'sem_data' : (parseOrderDateStr(rawDate) || 'sem_data');

    if (!groupsMap[dateKey]) {
      groupsMap[dateKey] = [];
    }
    groupsMap[dateKey].push(o);
  });

  const keys = Object.keys(groupsMap).sort((a, b) => {
    if (a === 'sem_data') return -1;
    if (b === 'sem_data') return 1;
    return a.localeCompare(b);
  });

  return keys.map((key) => ({
    dateKey: key,
    dateLabel: key === 'sem_data' ? 'Agendamentos Pendentes' : formatGroupDateLabel(key),
    orders: groupsMap[key],
  }));
};

// Verifica se a data do pedido pertence ao período selecionado (today, this_week, this_month, last_30_days, this_quarter)
export const isDateInPeriod = (rawDate: string | undefined, period: string): boolean => {
  if (!rawDate) return false;
  const cleanDateStr = parseOrderDateStr(rawDate);
  if (!cleanDateStr) return false;

  const targetDate = new Date(cleanDateStr + 'T12:00:00Z');
  if (isNaN(targetDate.getTime())) return false;

  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (period === 'today_and_following' || period === 'default') {
    return cleanDateStr >= todayStr;
  }

  if (period === 'today') {
    return cleanDateStr === todayStr;
  }

  if (period === 'this_week') {
    const cur = new Date(now);
    const day = cur.getDay(); // 0 = Dom, 1 = Seg...
    const diffToMonday = cur.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(cur.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return targetDate >= startOfWeek && targetDate <= endOfWeek;
  }

  if (period === 'this_month') {
    const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return cleanDateStr.startsWith(curMonthStr);
  }

  if (period === 'last_30_days') {
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    past30.setHours(0, 0, 0, 0);
    return targetDate >= past30 && targetDate <= now;
  }

  if (period === 'this_quarter') {
    const month = now.getMonth();
    const qStartMonth = Math.floor(month / 3) * 3;
    const startOfQuarter = new Date(now.getFullYear(), qStartMonth, 1);
    const endOfQuarter = new Date(now.getFullYear(), qStartMonth + 3, 0, 23, 59, 59);

    return targetDate >= startOfQuarter && targetDate <= endOfQuarter;
  }

  return true;
};

export const formatOrderDate = (rawDate?: string): string => {
  if (!rawDate) return '';
  if (rawDate.includes('/')) return rawDate;
  const clean = rawDate.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return clean;
};

export const numWord = (n: number): string => {
  const words = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
  return words[n] || String(n);
};

// Abrevia e simplifica o nome do produto (removendo cores, combinações, numerações e metragens)
export const simplifyProductName = (rawName: string): string => {
  if (!rawName) return 'móvel';
  let cleaned = rawName
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\b[\w\u00C0-\u024F]+(?:\/[\w\u00C0-\u024F]+)+\b/g, '')
    .replace(/\b\d+([.,]\d+)?([xX]\d+([.,]\d+)?)?\s*(cm|m|mm|kg|l|portas|gavetas|lugares|cadeiras)?\b/gi, '')
    .replace(/\b\d+\b/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const colorWords = new Set([
    'freijo', 'freijó', 'off', 'white', 'offwhite', 'preto', 'preta',
    'branco', 'branca', 'cinamomo', 'grafite', 'nobre', 'imbuia', 'carvalho',
    'nogueira', 'amêndoa', 'amendoa', 'patina', 'pátina', 'cacau', 'savana',
    'nature', 'jequitiba', 'jequitibá', 'cedro', 'marrom', 'cinza', 'bege',
    'areia', 'champagne', 'champanhe', 'castanho', 'fendi', 'ébano', 'ebano',
    'mel', 'amarelo', 'azul', 'verde', 'rosa', 'vermelho', 'dourado', 'prata',
    'portas', 'gavetas', 'lugares', 'cadeiras', 'cm', 'mm', 'm'
  ]);

  const words = cleaned.split(/\s+/).filter(Boolean);
  const filteredWords = words.filter(w => !colorWords.has(w.toLowerCase().trim()));

  if (filteredWords.length === 0) return 'móvel';
  return filteredWords.slice(0, 3).join(' ');
};

export const formatOrderSchedulingText = (shipping: any, item: any): string => {
  const sched = shipping?.scheduling || {};

  if (sched.pendingScheduling) {
    return '📅 Agendamento Pendente (Marcar depois)';
  }

  if (sched.notInformed) {
    return '📅 Agendamento: Não informado';
  }

  let datePart = '';
  if (sched.date) datePart = formatOrderDate(sched.date);
  else if (sched.endDate) datePart = `Até ${formatOrderDate(sched.endDate)}`;
  else if (item?.scheduled_date) datePart = formatOrderDate(item.scheduled_date);

  let shiftPart = '';
  if (sched.type === 'morning' || sched.period === 'morning') shiftPart = 'Manhã (09h-12h)';
  else if (sched.type === 'afternoon' || sched.period === 'afternoon') shiftPart = 'Tarde (13h-18h)';
  else if (sched.type === 'full_day' || sched.period === 'full_day') shiftPart = 'Comercial (09h-18h)';
  else if (sched.startTime && sched.endTime) shiftPart = `${sched.startTime} às ${sched.endTime}`;
  else if (sched.startTime) shiftPart = `A partir das ${sched.startTime}`;

  if (datePart && shiftPart) return `📅 Agendado para ${datePart} (${shiftPart})`;
  if (datePart) return `📅 Agendado para ${datePart}`;
  if (shiftPart) return `📅 Agendamento: ${shiftPart}`;

  return '';
};
