import Order from '../../types/order.type';
import {
  stringifyFullAddressWithObservation,
  formatDate,
  formatCurrency,
} from '../formatters';
import { calcItemTotalValue, calcPaymentTotalValue } from '../calculations';

/**
 * Monta e sanitiza os parâmetros para modelos de mensagem (Templates) da Meta Cloud API.
 * Em conformidade estrita com o Erro 132018 da Meta:
 * Parâmetros de texto NÃO podem conter quebras de linha (\n ou \r), tabs (\t) nem 4 ou mais espaços.
 */
export const buildOrderMetaTemplateParams = (order: Order, config?: any): string[] => {
  const customer = order.customerData;
  const sched = order.shipping?.scheduling;
  const isPendingScheduling = Boolean(sched?.pendingScheduling);

  let date = 'A confirmar';
  if (isPendingScheduling) {
    date = 'A combinar';
  } else if (sched?.dateType === 'range' && sched?.endDate) {
    date = `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`;
  } else if (sched?.date) {
    const formatted = formatDate(sched.date);
    date = formatted !== '-' ? formatted : 'A confirmar';
  }

  let time = 'A combinar';
  if (isPendingScheduling) {
    time = 'A combinar';
  } else if (sched) {
    if (sched.notInformed) {
      time = 'Não informado';
    } else if (
      sched.type === 'range' &&
      sched.startTime?.trim() &&
      sched.endTime?.trim() &&
      sched.startTime.trim() !== 'às'
    ) {
      time = `${sched.startTime.trim()} às ${sched.endTime.trim()}`;
    } else if (sched.startTime?.trim() && sched.startTime.trim() !== 'às') {
      time = sched.startTime.trim();
    } else if (sched.time?.trim() && sched.time.trim() !== 'às') {
      time = sched.time.trim();
    }
  }

  // Lista de itens formatada em linha única usando ' • ' como separador (sem quebras de linha \n)
  const itemsList = (order.items || []).map((item) => {
    const totalVal = calcItemTotalValue(item);
    const obs = item.observation?.trim() ? ` - ${item.observation.trim()}` : '';
    const valStr = totalVal > 0 ? ` - ${formatCurrency(totalVal)}` : '';
    return `${item.description}${obs} (${item.quantity} UN${valStr})`;
  });
  if (order.shipping?.value && order.shipping.value > 0) {
    itemsList.push(`Frete: ${formatCurrency(order.shipping.value)}`);
  }
  const itemsBlock = itemsList.length > 0 ? itemsList.join(' • ') : 'Produtos do pedido';

  const addressStr = order.shipping?.noAddress
    ? order.shipping?.deliveryMethod === 'pickup'
      ? 'Retirada em loja'
      : 'Não informado'
    : stringifyFullAddressWithObservation(customer?.fullAddress);

  const cleanTotalVal = (order.paymentsSummary?.totalOrderValue || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Lista de pagamentos formatada em linha única usando ' • ' como separador (sem quebras de linha \n)
  const paymentsList = (order.payments || []).map((p) => {
    const totalVal = calcPaymentTotalValue(p);
    const valStr = totalVal > 0 ? ` (${formatCurrency(totalVal)})` : '';
    return `${p.method || 'Pagamento'}${valStr}`;
  });
  const paymentsStr = paymentsList.length > 0 ? paymentsList.join(' • ') : 'Não informado';

  const cleanParam = (val: unknown): string => {
    return (
      String(val ?? '')
        .replace(/[\r\n\t]+/g, ' • ')
        .replace(/\s{2,}/g, ' ')
        .trim() || '-'
    );
  };

  const allParams = [
    customer?.fullName || 'Cliente',
    date || 'A confirmar',
    time || 'A combinar',
    addressStr || 'Não informado',
    itemsBlock,
    cleanTotalVal || '0,00',
    paymentsStr,
  ].map(cleanParam);

  const varCount =
    typeof config?.templateVariableCount === 'number' ? config.templateVariableCount : 7;
  return varCount === 0 ? [] : allParams.slice(0, varCount);
};
