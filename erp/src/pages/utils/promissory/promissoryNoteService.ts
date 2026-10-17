import type Order from '@/pages/types/order.type';
import type CustomerData from '@/pages/types/customerData.type';
import type Shipping from '@/pages/types/Shipping.type';
import { isPromissoryPaymentMethod } from '../../../../../shared-utils/orderPaymentState';
import { getOrderIndex, formatOrderCode } from '../orderCode';
import { currencyToWordsPtBr } from '../currencyToWords';
import { formatCurrency } from '../formatters';
import { getSettings } from '../settingsService';
import type { AppSettings } from '../settings/types';

export interface FormattedCustomerDocument {
  label: 'CPF:' | 'CNPJ:';
  value: string;
}

export interface PromissoryNoteItem {
  id: string;
  noteNumber: string;
  installmentText: string;
  installmentIndex: number;
  totalInstallments: number;
  amount: number;
  amountFormatted: string;
  amountInWords: string;
  dueDate: string;
  rawDueDate?: string;
  creditorName: string;
  creditorCnpj: string;
  paymentPlace: string;
  debtorName: string;
  debtorDocLabel: 'CPF:' | 'CNPJ:';
  debtorDocValue: string;
  debtorAddress: string;
  emissionCityState: string;
  emissionDateFormatted: string;
  orderReference: string;
  orderIndex: number | null;
  sellerName?: string;
  legalText: string;
}

/**
 * Verifica se o pedido é elegível para emissão de nota promissória:
 * - Deve ser pedido de venda ('sale')
 * - Deve conter ao menos uma forma de pagamento do tipo promissória com valor positivo
 */
export function canIssuePromissoryNote(order?: Partial<Order> | null): boolean {
  if (!order) return false;
  const orderType = order.orderType || 'sale';
  if (orderType !== 'sale') return false;

  const payments = order.payments || [];
  return payments.some(
    (p) => isPromissoryPaymentMethod(p?.method) && Number(p?.amount) > 0
  );
}

/**
 * Regra 4 mandatória do usuário:
 * - Se não estiver informado, manter o label CPF: ou CNPJ: visível, mas deixar o valor completamente vazio.
 * - Proibido exibir 000.000.000-00, 00.000.000/0000-00, Não informado, N/A, traços ou qualquer placeholder.
 * - Pessoa física: utilizar CPF.
 * - Pessoa jurídica: utilizar CNPJ.
 */
export function formatCustomerDocument(
  customerData?: CustomerData | null
): FormattedCustomerDocument {
  const raw = (customerData?.cpfCnpj || customerData?.document || '').trim();
  const digits = raw.replace(/\D/g, '');

  const isPJ =
    customerData?.personType === 'PJ' ||
    digits.length > 11;

  const label: 'CPF:' | 'CNPJ:' = isPJ ? 'CNPJ:' : 'CPF:';

  // Se vazio, composto somente por zeros (ex: 00000000000) ou texto fictício
  if (
    !digits ||
    /^0+$/.test(digits) ||
    /^(não informado|nao informado|n\/a|na|nenhum|null|undefined|-)$/i.test(raw)
  ) {
    return { label, value: '' };
  }

  if (isPJ) {
    if (digits.length === 14) {
      return {
        label,
        value: `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`,
      };
    }
    return { label, value: raw };
  }

  if (digits.length === 11) {
    return {
      label,
      value: `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`,
    };
  }

  return { label, value: raw };
}

/**
 * Formata o endereço completo do emitente para a nota promissória.
 */
export function formatCustomerAddress(
  customerData?: CustomerData | null,
  shipping?: Shipping | null
): string {
  const addr = customerData?.fullAddress || (shipping?.deliveryAddress as any);
  if (!addr) return '';

  const street = (addr.street || '').trim();
  const number = (addr.number || '').trim();
  const complement = (addr.complement || '').trim();
  const neighborhood = (addr.neighborhood || addr.bairro || '').trim();
  const city = (addr.city || addr.cidade || '').trim();
  const state = (addr.state || addr.uf || '').trim();

  const parts: string[] = [];

  if (street) {
    parts.push(number ? `${street}, ${number}` : street);
  }
  if (complement) {
    parts.push(complement);
  }
  if (neighborhood) {
    parts.push(neighborhood);
  }

  const streetPart = parts.join(' - ');
  const cityState = city && state ? `${city}/${state}` : city || state;

  if (streetPart && cityState) {
    return `${streetPart} – ${cityState}`;
  }
  return streetPart || cityState || '';
}

const MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * Converte data ISO ou YYYY-MM-DD em DD/MM/AAAA.
 */
export function formatDateToPtBr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Converte data em texto por extenso com cidade/UF: "Colombo/PR, 17 de outubro de 2026"
 */
export function formatEmissionDateExtenso(
  dateStr?: string | null,
  city = 'Colombo',
  uf = 'PR'
): string {
  let date: Date;
  if (dateStr) {
    const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    } else {
      date = new Date(dateStr);
    }
  } else {
    date = new Date();
  }

  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }

  const day = date.getDate();
  const monthName = MONTH_NAMES_PT[date.getMonth()];
  const year = date.getFullYear();

  const location = city && uf ? `${city}/${uf}` : city || uf || 'Local';
  return `${location}, ${day} de ${monthName} de ${year}`;
}

/**
 * Adiciona N meses a uma data base preservando o dia limite.
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const expectedMonth = (result.getMonth() + months) % 12;
  result.setMonth(result.getMonth() + months);
  // Ajuste de virada de mês (ex: 31 de janeiro + 1 mês -> final de fevereiro)
  if (result.getMonth() !== (expectedMonth < 0 ? expectedMonth + 12 : expectedMonth)) {
    result.setDate(0);
  }
  return result;
}

/**
 * Constrói a lista estruturada de Notas Promissórias para um pedido de venda.
 */
export function buildPromissoryNotesFromOrder(
  order: Order,
  customSettings?: AppSettings
): PromissoryNoteItem[] {
  if (!canIssuePromissoryNote(order)) {
    return [];
  }

  const settings = customSettings || getSettings();
  const creditorName = settings.companyName || 'Móveis Morante';
  const creditorCnpj = settings.companyCnpj || '44.512.248.0001/07';
  const city = settings.companyXMun || 'Colombo';
  const uf = settings.companyUF || 'PR';
  const paymentPlace = `${city} – ${uf}`;

  const orderIndex = getOrderIndex(order);
  const formattedOrderCodeStr = formatOrderCode(order);
  const baseNoteNumber = formattedOrderCodeStr.startsWith('TEST-')
    ? formattedOrderCodeStr
    : formattedOrderCodeStr.padStart(6, '0');

  const debtorName = (order.customerData?.fullName || '').trim();
  const docInfo = formatCustomerDocument(order.customerData);
  const debtorAddress = formatCustomerAddress(order.customerData, order.shipping);

  const emissionDateFormatted = formatEmissionDateExtenso(order.date, city, uf);
  const emissionCityState = `${city}/${uf}`;
  const orderRef = `Pedido de venda nº ${orderIndex || formattedOrderCodeStr}`;
  const sellerName =
    typeof order.seller === 'string'
      ? order.seller
      : (order.seller as any)?.fullName || '';

  // Pagamentos promissória com valor positivo
  const promissoryPayments = (order.payments || []).filter(
    (p) => isPromissoryPaymentMethod(p?.method) && Number(p?.amount) > 0
  );

  if (promissoryPayments.length === 0) {
    return [];
  }

  const notes: PromissoryNoteItem[] = [];

  // Se houver mais de uma linha de promissória, cada uma é uma parcela/título próprio
  if (promissoryPayments.length > 1) {
    const total = promissoryPayments.length;
    promissoryPayments.forEach((payment, idx) => {
      const installmentIndex = idx + 1;
      const amount = Number(payment.amount);
      const amountFormatted = formatCurrency(amount);
      const amountInWords = currencyToWordsPtBr(amount);
      const dueDate = payment.dueDate
        ? formatDateToPtBr(payment.dueDate)
        : formatDateToPtBr(
            addMonths(new Date(order.date || Date.now()), installmentIndex).toISOString().slice(0, 10)
          );

      const noteNumber = `${baseNoteNumber}/${String(installmentIndex).padStart(2, '0')}`;
      const installmentText = `Parcela ${installmentIndex} de ${total}`;

      const legalText = `Por esta única via de NOTA PROMISSÓRIA, prometo pagar, pura e simplesmente, à ${creditorName}, CNPJ ${creditorCnpj}, ou à sua ordem, a quantia de ${amountFormatted} (${amountInWords}), na data de vencimento indicada acima.`;

      notes.push({
        id: `promissory-${order.id || baseNoteNumber}-${installmentIndex}`,
        noteNumber,
        installmentText,
        installmentIndex,
        totalInstallments: total,
        amount,
        amountFormatted,
        amountInWords,
        dueDate,
        rawDueDate: payment.dueDate,
        creditorName,
        creditorCnpj,
        paymentPlace,
        debtorName,
        debtorDocLabel: docInfo.label,
        debtorDocValue: docInfo.value,
        debtorAddress,
        emissionCityState,
        emissionDateFormatted,
        orderReference: orderRef,
        orderIndex,
        sellerName,
        legalText,
      });
    });
    return notes;
  }

  // Apenas 1 linha de pagamento com promissória
  const singlePayment = promissoryPayments[0];
  const totalAmount = Number(singlePayment.amount);

  // Verifica se o método especifica parcelamento (ex: "Promissória 3x")
  const matchInstallments = String(singlePayment.method || '').match(/(\d+)x/i);
  const parsedInstallments = matchInstallments ? parseInt(matchInstallments[1], 10) : 1;
  const numInstallments =
    singlePayment.installments && singlePayment.installments > 1
      ? singlePayment.installments
      : parsedInstallments > 1
        ? parsedInstallments
        : 1;

  if (numInstallments > 1) {
    const baseCents = Math.floor(Math.round(totalAmount * 100) / numInstallments);
    let remainderCents = Math.round(totalAmount * 100) - baseCents * numInstallments;

    let baseDueDate: Date;
    if (singlePayment.dueDate) {
      const match = singlePayment.dueDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      baseDueDate = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(singlePayment.dueDate);
    } else {
      baseDueDate = addMonths(new Date(order.date || Date.now()), 1);
    }

    for (let i = 1; i <= numInstallments; i++) {
      let instCents = baseCents;
      if (remainderCents > 0) {
        instCents += 1;
        remainderCents -= 1;
      }
      const instAmount = instCents / 100;
      const amountFormatted = formatCurrency(instAmount);
      const amountInWords = currencyToWordsPtBr(instAmount);

      const instDueDateObj = i === 1 ? baseDueDate : addMonths(baseDueDate, i - 1);
      const dueDate = formatDateToPtBr(instDueDateObj.toISOString().slice(0, 10));

      const noteNumber = `${baseNoteNumber}/${String(i).padStart(2, '0')}`;
      const installmentText = `Parcela ${i} de ${numInstallments}`;
      const legalText = `Por esta única via de NOTA PROMISSÓRIA, prometo pagar, pura e simplesmente, à ${creditorName}, CNPJ ${creditorCnpj}, ou à sua ordem, a quantia de ${amountFormatted} (${amountInWords}), na data de vencimento indicada acima.`;

      notes.push({
        id: `promissory-${order.id || baseNoteNumber}-${i}`,
        noteNumber,
        installmentText,
        installmentIndex: i,
        totalInstallments: numInstallments,
        amount: instAmount,
        amountFormatted,
        amountInWords,
        dueDate,
        rawDueDate: instDueDateObj.toISOString().slice(0, 10),
        creditorName,
        creditorCnpj,
        paymentPlace,
        debtorName,
        debtorDocLabel: docInfo.label,
        debtorDocValue: docInfo.value,
        debtorAddress,
        emissionCityState,
        emissionDateFormatted,
        orderReference: orderRef,
        orderIndex,
        sellerName,
        legalText,
      });
    }
    return notes;
  }

  // Parcela única (1x)
  const amountFormatted = formatCurrency(totalAmount);
  const amountInWords = currencyToWordsPtBr(totalAmount);
  const dueDate = singlePayment.dueDate
    ? formatDateToPtBr(singlePayment.dueDate)
    : formatDateToPtBr(
        addMonths(new Date(order.date || Date.now()), 1).toISOString().slice(0, 10)
      );

  const noteNumber = baseNoteNumber;
  const legalText = `Por esta única via de NOTA PROMISSÓRIA, prometo pagar, pura e simplesmente, à ${creditorName}, CNPJ ${creditorCnpj}, ou à sua ordem, a quantia de ${amountFormatted} (${amountInWords}), na data de vencimento indicada acima.`;

  notes.push({
    id: `promissory-${order.id || baseNoteNumber}-1`,
    noteNumber,
    installmentText: '',
    installmentIndex: 1,
    totalInstallments: 1,
    amount: totalAmount,
    amountFormatted,
    amountInWords,
    dueDate,
    rawDueDate: singlePayment.dueDate,
    creditorName,
    creditorCnpj,
    paymentPlace,
    debtorName,
    debtorDocLabel: docInfo.label,
    debtorDocValue: docInfo.value,
    debtorAddress,
    emissionCityState,
    emissionDateFormatted,
    orderReference: orderRef,
    orderIndex,
    sellerName,
    legalText,
  });

  return notes;
}
