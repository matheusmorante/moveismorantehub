import { parse } from 'date-fns';
import { parseCSV } from './csvUtils';
import { salesReportSaleItemsSchema } from '../../../../../../../shared-utils/salesReportFormSchemas';
import type { SaleItem } from './salesReportCalculations';

export function readReportCsv(file: File, signal?: AbortSignal): Promise<ReturnType<typeof parseCSV>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const finish = (failure?: Error) => {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      reader.onload = reader.onerror = reader.onabort = null;
      if (failure) { reader.abort(); reject(failure); }
    };
    const abort = () => finish(new Error('Leitura do CSV interrompida.'));
    const timer = setTimeout(() => finish(new Error('A leitura do CSV excedeu o prazo. Tente novamente.')), 10_000);
    reader.onload = () => {
      try { const parsed = parseCSV(String(reader.result ?? '')); finish(); resolve(parsed); }
      catch { finish(new Error('Não foi possível interpretar o CSV.')); }
    };
    reader.onerror = () => finish(new Error('Não foi possível ler o arquivo CSV.'));
    reader.onabort = abort;
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    else { try { reader.readAsText(file); } catch { finish(new Error('Não foi possível ler o arquivo CSV.')); } }
  });
}

export function mappedCsvItems(rows: Record<string, string>[], mapping: Record<string, any>): SaleItem[] {
  const amount = (raw: string | undefined) => {
    if (!raw?.trim()) return 0;
    let text = raw.replace(/[^\d.,-]/g, '');
    if (text.includes(',') && text.includes('.')) text = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
    else text = text.replace(',', '.');
    const result = Number(text);
    if (!text || !Number.isFinite(result)) throw new Error('O CSV contém um valor numérico inválido. Confira o mapeamento.');
    return result;
  };
  const items = rows.filter(row => row[mapping.product] && row[mapping.product] !== mapping.product && row[mapping.product] !== 'Nome do Produto').map(row => {
    const rawDate = row[mapping.date] || '';
    const date = rawDate.includes('/') ? parse(rawDate.split(' ')[0], rawDate.split('/').length === 2 ? 'MM/yyyy' : 'dd/MM/yyyy', new Date()) : new Date(rawDate);
    const quantity = amount(row[mapping.quantity]); const cost = amount(row[mapping.cost]); const salesValue = amount(row[mapping.salesValue]);
    return { date, product: row[mapping.product], supplier: row[mapping.supplier] || 'N/A', quantity, cost, salesValue,
      profit: row[mapping.profit]?.trim() ? amount(row[mapping.profit]) : salesValue - cost * quantity };
  });
  const result = salesReportSaleItemsSchema.safeParse(items);
  if (!result.success) throw new Error('O CSV contém data ou valores inválidos. Confira o mapeamento.');
  return result.data;
}
