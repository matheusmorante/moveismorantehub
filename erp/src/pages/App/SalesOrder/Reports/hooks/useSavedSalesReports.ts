import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { blingReportWriteFormSchema, blingReportQueryFormSchema, blingReportRowSchema, salesReportDataSchema, erpReportWriteFormSchema, erpReportReadRowSchema } from '../../../../../../../shared-utils/salesReportFormSchemas';

const canonicalJson = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const requestError = (message: string, knownFailure = true) => Object.assign(new Error(message), { knownFailure });
const backendError = (error: { message?: string; code?: string }) => requestError(error.message || 'O servidor não confirmou o relatório.', /^(22|23|42)/.test(error.code || '') || /^PGRST20[0-5]$/.test(error.code || ''));
type ReportRow = z.output<typeof blingReportRowSchema> | z.output<typeof erpReportReadRowSchema>;
type ReportType = 'abc_curve' | 'abc_curve_bling';
type WriteCommand = z.input<typeof blingReportWriteFormSchema> | z.input<typeof erpReportWriteFormSchema>;
const readRow = (raw: any, kind: ReportType, publicRead = false): ReportRow => (kind === 'abc_curve_bling' || (publicRead && raw?.type === 'abc_curve_bling') ? blingReportRowSchema : erpReportReadRowSchema).parse({ ...raw, report_data: {
  ...raw?.report_data, results: raw?.report_data?.results?.map((item: any) => ({ ...item,
    monthlyProfit: item.monthlyProfit ?? item.totalProfit / (raw.report_data.monthCount || 1),
    monthlyTurnover: item.monthlyTurnover ?? item.totalQuantity / (raw.report_data.monthCount || 1),
  })),
} });

export function useSavedSalesReports(snapshot: z.input<typeof salesReportDataSchema>, contextKey = 'list', readOnly = false, reportType: ReportType = 'abc_curve_bling') {
  const { user } = useAuth();
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeOperations, setActiveOperations] = useState(0);
  const mountedRef = useRef(true);
  const sessionKey = JSON.stringify([user?.id, contextKey, readOnly, reportType]);
  const scopeRef = useRef(sessionKey); scopeRef.current = sessionKey;
  const accessRef = useRef({ user: user?.id, readOnly }); accessRef.current = { user: user?.id, readOnly };
  const writeBusyRef = useRef(false);
  // ponytail: uncertain writes are frozen for this hook's scope; persistent
  // idempotency/reconciliation across tabs remains the backend's responsibility.
  const uncertainScopesRef = useRef(new Set<string>());
  const createIntentRef = useRef<{ key: string; id: string } | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const writeSchema = reportType === 'abc_curve_bling' ? blingReportWriteFormSchema : erpReportWriteFormSchema;
  const writeForm = useZodForm(writeSchema, { intent: 'create', id: '00000000-0000-4000-8000-000000000000', name: '', source: reportType === 'abc_curve_bling' ? 'bling' : 'erp', config: {}, report_data: snapshotRef.current });
  const queryForm = useZodForm(blingReportQueryFormSchema, { intent: 'list' });
  const showError = useCallback((message: string) => { if (mountedRef.current) setError(message); }, []);
  const invalid = useCallback((errors: Parameters<typeof flattenFormErrors>[0]) => showError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do relatório.'), [showError]);
  const begin = useCallback(() => {
    if (mountedRef.current) setActiveOperations(count => count + 1);
    return () => { if (mountedRef.current) setActiveOperations(count => Math.max(0, count - 1)); };
  }, []);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setSavedReports([]); setError(''); }, [sessionKey]);
  const { enqueueAndRun: validateQuery } = queryForm;
  const performQuery = useCallback(async (command: z.input<typeof blingReportQueryFormSchema>) => {
    const requestScope = scopeRef.current;
    try {
      return await validateQuery(command, async parsed => {
        if (!mountedRef.current || scopeRef.current !== requestScope) return false;
        const finish = begin(); setError('');
        try {
          const query = parsed.intent === 'mappings' ? supabase.from('product_references').select('master_name, reference_name')
            : parsed.intent === 'get' ? (readOnly ? supabase.from('sales_order_reports').select('*') : supabase.from('sales_order_reports').select('*').eq('type', reportType)).eq('id', parsed.id).single()
              : supabase.from('sales_order_reports').select('*').eq('type', reportType).order('created_at', { ascending: false });
          const response = await withTimeout(query, 15_000, null, 'Consultar relatório de vendas');
          if (!mountedRef.current || scopeRef.current !== requestScope) return false;
          if (!response) throw new Error('A consulta do relatório excedeu o prazo. Tente carregar novamente.');
          if (response.error) throw backendError(response.error);
          if (parsed.intent === 'mappings') {
            const rows = z.array(z.object({ master_name: z.string(), reference_name: z.string() })).parse(response.data);
            return Object.fromEntries(rows.map(row => [row.reference_name, row.master_name]));
          }
          if (parsed.intent === 'get') {
            const row = readRow(response.data, reportType, readOnly);
            if (row.id !== parsed.id) throw new Error('O relatório recebido não corresponde ao solicitado.');
            return row;
          }
          const rows = z.array(z.unknown()).parse(response.data).map(row => readRow(row, reportType));
          setSavedReports(rows); return rows;
        } finally { finish(); }
      }, invalid);
    } catch (failure) {
      if (scopeRef.current === requestScope) showError(failure instanceof Error && !(failure instanceof z.ZodError) ? failure.message : 'O servidor retornou dados de relatório inválidos.');
      return false;
    }
  }, [begin, invalid, showError, validateQuery, reportType, readOnly]);
  const listSavedReports = useCallback(() => performQuery({ intent: 'list' }) as Promise<ReportRow[] | false>, [performQuery]);
  const getReport = useCallback((id: string) => performQuery({ intent: 'get', id }) as Promise<ReportRow | false>, [performQuery]);
  const getProductMappings = useCallback(() => performQuery({ intent: 'mappings' }) as Promise<Record<string, string> | false>, [performQuery]);

  const { enqueueAndRun: validateWrite } = writeForm;
  const writeReport = useCallback(async (command: WriteCommand, options: { queued?: boolean; isCurrent?: () => boolean } = {}) => {
    if (!options.queued && writeBusyRef.current) return false;
    if (!accessRef.current.user || accessRef.current.readOnly) { showError('Entre com uma conta autorizada para alterar relatórios.'); return false; }
    const requestScope = scopeRef.current;
    if (uncertainScopesRef.current.has(requestScope)) { showError('Existe uma gravação sem confirmação. Confira o relatório salvo antes de tentar outra alteração.'); return false; }
    if (!options.queued) writeBusyRef.current = true; const finish = begin(); setError('');
    let dispatched = false;
    try {
      return await validateWrite(command, async parsed => {
        if (!mountedRef.current || scopeRef.current !== requestScope || options.isCurrent?.() === false) return false;
        if (uncertainScopesRef.current.has(requestScope)) throw requestError('Existe uma gravação sem confirmação. Confira o relatório antes de continuar.');
        const payload = parsed.intent === 'delete' ? null : parsed.intent === 'config' ? { config: parsed.config, updated_at: new Date().toISOString() } : {
          id: parsed.id, type: reportType, name: parsed.name, source: parsed.source, report_data: parsed.report_data, config: parsed.config,
          ...(parsed.intent === 'create' ? { created_at: new Date().toISOString() } : { updated_at: new Date().toISOString() }),
        };
        dispatched = true;
        const query = parsed.intent === 'delete' ? supabase.from('sales_order_reports').delete().eq('id', parsed.id).eq('type', reportType).select('id')
          : parsed.intent === 'create' ? supabase.from('sales_order_reports').insert([payload!]).select().single()
            : supabase.from('sales_order_reports').update(payload!).eq('id', parsed.id).eq('type', reportType).select().single();
        const response = await withTimeout(query, 20_000, null, 'Gravar relatório de vendas');
        if (!response) throw requestError('O servidor não confirmou a gravação no prazo. Confira o relatório antes de repetir.', false);
        if (response.error) throw backendError(response.error);
        let saved: ReportRow | true;
        if (parsed.intent === 'delete') {
          const receipt = z.array(z.object({ id: z.uuid() })).safeParse(response.data);
          if (!receipt.success || receipt.data.length !== 1 || receipt.data[0].id !== parsed.id) throw requestError('A exclusão do relatório não foi confirmada.', false);
          saved = true;
        } else {
          const receipt = parsed.intent === 'config' ? (() => { try { return { success: true as const, data: readRow(response.data, reportType) }; } catch { return { success: false as const }; } })() : (reportType === 'abc_curve_bling' ? blingReportRowSchema : erpReportReadRowSchema).safeParse(response.data);
          if (!receipt.success || !(parsed.intent === 'config' ? receipt.data.id === parsed.id && receipt.data.type === reportType && canonicalJson(receipt.data.config) === canonicalJson(parsed.config) : ['id', 'type', 'name', 'source', 'report_data', 'config'].every(key => canonicalJson(receipt.data[key as keyof ReportRow]) === canonicalJson(payload![key as keyof typeof payload])))) throw requestError('O recibo não corresponde ao relatório enviado. Confira o registro salvo antes de repetir.', false);
          saved = receipt.data;
        }
        if (!mountedRef.current || scopeRef.current !== requestScope || options.isCurrent?.() === false) return false;
        if (parsed.intent === 'config') return saved;
        if (saved === true) setSavedReports(rows => rows.filter(row => row.id !== parsed.id));
        else setSavedReports(rows => [saved, ...rows.filter(row => row.id !== parsed.id)]);
        const refreshed = await listSavedReports();
        if (!mountedRef.current || scopeRef.current !== requestScope) return false;
        if (refreshed === false) showError(parsed.intent === 'delete' ? 'Relatório excluído. Não foi possível atualizar a lista; tente carregar novamente.' : 'Relatório salvo. Não foi possível atualizar a lista; tente carregar novamente.');
        return saved;
      }, invalid);
    } catch (failure) {
      if (dispatched && !(failure instanceof Error && 'knownFailure' in failure && failure.knownFailure === true)) uncertainScopesRef.current.add(requestScope);
      if (scopeRef.current === requestScope) showError(failure instanceof Error ? failure.message : 'Não foi possível confirmar a gravação do relatório.');
      return false;
    } finally { if (!options.queued) writeBusyRef.current = false; finish(); }
  }, [begin, invalid, listSavedReports, showError, validateWrite, reportType]);
  const saveReport = useCallback(async (name: string, source: 'erp' | 'csv' | 'bling', config: any, manualData?: any) => {
    const data = manualData ?? snapshotRef.current;
    let key: string | undefined;
    try { key = canonicalJson({ scope: scopeRef.current, name, source, config, data }); } catch { showError('Os dados do relatório não puderam ser preparados.'); return false; }
    if (!createIntentRef.current || createIntentRef.current.key !== key) createIntentRef.current = { key: key!, id: crypto.randomUUID() };
    const saved = await writeReport({ intent: 'create', id: createIntentRef.current.id, name, source, config, report_data: data });
    if (saved !== false) createIntentRef.current = null;
    return saved as ReportRow | false;
  }, [showError, writeReport]);
  const updateReport = useCallback((id: string, name: string, source: 'erp' | 'csv' | 'bling', config: any, manualData?: any) => writeReport({ intent: 'update', id, name, source, config, report_data: manualData ?? snapshotRef.current }) as Promise<ReportRow | false>, [writeReport]);
  const saveReportConfig = useCallback((id: string, config: Record<string, any>, isCurrent?: () => boolean) => writeReport({ intent: 'config', id, config }, { queued: true, isCurrent }) as Promise<ReportRow | false>, [writeReport]);
  const deleteReport = useCallback((id: string) => writeReport({ intent: 'delete', id }) as Promise<true | false>, [writeReport]);

  return { loading: activeOperations > 0, error, sessionKey, savedReports, saveReport, saveReportConfig, updateReport, deleteReport, listSavedReports, getReport, getProductMappings, begin, invalid, showError, scopeRef, mountedRef };
}
