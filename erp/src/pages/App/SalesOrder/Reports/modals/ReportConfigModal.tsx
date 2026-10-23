import React, { useState, useEffect, useRef } from 'react';
import { readReportCsv } from '../utils/reportCsvInput';
import { salesReportCsvImportFormSchema } from '../../../../../../../shared-utils/salesReportFormSchemas';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { reportConfigFormSchema } from './reportFormSchemas';

interface ColumnMapping {
  date: string;
  product: string;
  supplier: string;
  quantity: string;
  cost: string;
  salesValue: string;
  profit: string;
}

interface ReportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void | boolean | Promise<void | boolean>;
  initialConfig?: any;
  initialSource?: 'erp' | 'csv';
  initialName?: string;
  initialExcludedItems?: string[];
  availableItems?: any[];
  loading?: boolean;
}

const ReportConfigModal: React.FC<ReportConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  initialSource,
  initialName,
  loading,
}) => {
  const [source, setSource] = useState<'erp' | 'csv'>(initialSource || 'erp');
  const [abcBasis, setAbcBasis] = useState<'revenue' | 'profit'>('profit');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    const m = {
      date: '',
      product: '',
      supplier: '',
      quantity: '',
      cost: '',
      salesValue: '',
      profit: '',
    };
    if (initialConfig) {
      Object.keys(m).forEach((key) => {
        if (initialConfig[key]) m[key as keyof ColumnMapping] = initialConfig[key];
      });
    }
    return m;
  });
  const [name, setName] = useState(initialName || '');
  const [turnoverThresholdMode, setTurnoverThresholdMode] = useState<'avg' | 'custom'>(
    initialConfig?.turnoverThresholdMode || 'avg'
  );
  const [profitThresholdMode, setProfitThresholdMode] = useState<'avg' | 'custom'>(
    initialConfig?.profitThresholdMode || 'avg'
  );
  const [turnoverThreshold, setTurnoverThreshold] = useState<number>(
    initialConfig?.turnoverThreshold || 0
  );
  const [profitThreshold, setProfitThreshold] = useState<number>(
    initialConfig?.profitThreshold || 0
  );
  const [validationError, setValidationError] = useState('');
  const [reading, setReading] = useState(false);
  const busyRef = useRef(false);
  const readerRef = useRef<AbortController | null>(null);
  const activeRef = useRef(true);
  const fileForm = useZodForm(salesReportCsvImportFormSchema, { file: undefined as unknown as File, config: {}, productMappings: {} });
  useEffect(() => {
    activeRef.current = isOpen;
    return () => { activeRef.current = false; readerRef.current?.abort(); };
  }, [isOpen, initialName, initialSource]);
  const form = useZodForm(reportConfigFormSchema, {
    name,
    source,
    config: {
      ...initialConfig,
      ...mapping,
      abcBasis,
      turnoverThresholdMode,
      profitThresholdMode,
      turnoverThreshold,
      profitThreshold,
    },
    csvData,
  });
  const submit = form.submit(async (values) => {
    setValidationError('');
    try {
      const saved = await onSave(values);
      if (saved === false) setValidationError('O relatório não foi confirmado. Seus dados foram preservados; confira a mensagem da operação.');
      return saved;
    }
    catch (failure) { setValidationError(failure instanceof Error ? failure.message : 'Não foi possível salvar o relatório.'); return false; }
  }, (errors) => setValidationError(Object.values(flattenFormErrors(errors))[0] || 'Confira a configuração do relatório.'));
  const handleSave = async () => {
    if (busyRef.current || loading) return;
    busyRef.current = true;
    try { return await submit(); } finally { busyRef.current = false; }
  };

  useEffect(() => {
    if (initialSource) setSource(initialSource);
    if (initialName) setName(initialName);
    if (initialConfig) {
      const m = {
        date: '',
        product: '',
        supplier: '',
        quantity: '',
        cost: '',
        salesValue: '',
        profit: '',
      };
      Object.keys(m).forEach((key) => {
        if (initialConfig[key]) m[key as keyof ColumnMapping] = initialConfig[key];
      });
      setMapping(m);
      setAbcBasis('profit');
      setTurnoverThresholdMode(initialConfig.turnoverThresholdMode || 'avg');
      setProfitThresholdMode(initialConfig.profitThresholdMode || 'avg');
      setTurnoverThreshold(initialConfig.turnoverThreshold || 0);
      setProfitThreshold(initialConfig.profitThreshold || 0);
    }
  }, [initialSource, initialName, initialConfig, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busyRef.current || loading) return;
    busyRef.current = true; setReading(true); setValidationError('');
    const controller = new AbortController(); readerRef.current = controller;

    try {
      await fileForm.validateAndRun({ file, config: {}, productMappings: {} }, async ({ file }) => {
      if (!activeRef.current || controller.signal.aborted) return false;
      const { data, headers: csvHeaders } = await readReportCsv(file, controller.signal);
      if (!activeRef.current || controller.signal.aborted) return false;
      if (!csvHeaders.length || !data.length) throw new Error('O CSV não contém dados para análise.');
      setCsvData(data);
      setHeaders(csvHeaders);

      const isMappingEmpty = Object.values(mapping).every((v) => v === '');
      if (isMappingEmpty) {
        const newMapping = { ...mapping };
        csvHeaders.forEach((field: string) => {
          const low = field.toLowerCase();
          if (low.includes('data')) newMapping.date = field;
          if (low.includes('desc') || low.includes('prod')) newMapping.product = field;
          if (low.includes('forn')) newMapping.supplier = field;
          if (low.includes('qtd') || low.includes('quant')) newMapping.quantity = field;
          if (low.includes('custo')) newMapping.cost = field;
          if (low.includes('valor') || low.includes('venda')) newMapping.salesValue = field;
          if (low.includes('lucro')) newMapping.profit = field;
        });
        setMapping(newMapping);
      }
      return true;
      }, errors => setValidationError(Object.values(flattenFormErrors(errors))[0] || 'Confira o arquivo CSV.'));
    } catch (failure) {
      if (activeRef.current && !controller.signal.aborted) setValidationError(failure instanceof Error ? failure.message : 'Não foi possível ler o CSV.');
    } finally { busyRef.current = false; if (activeRef.current) setReading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <i className="bi bi-gear-wide-connected text-indigo-600 text-2xl"></i> Configurar
            Relatório
          </h2>
          <button
            aria-label="Fechar configuração"
            onClick={() => { if (!busyRef.current && !loading) onClose(); }}
            disabled={loading || reading || form.formState.isSubmitting}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-955 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"
          >
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        <div className="p-10 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-3 block">
              Identificação do Relatório
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Análise de Inverno 2024"
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-3 block">
                Fonte de Dados
              </label>
              <div className="flex p-1.5 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSource('erp')}
                  className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${source === 'erp' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xl' : 'text-slate-400'}`}
                >
                  ERP
                </button>
                <button
                  onClick={() => setSource('csv')}
                  className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${source === 'csv' ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-xl' : 'text-slate-400'}`}
                >
                  CSV
                </button>
              </div>
            </div>
          </div>

          {source === 'csv' && (
            <div className="flex flex-col gap-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-[2rem] hover:border-indigo-400 transition-all cursor-pointer bg-indigo-50/5 dark:bg-indigo-900/10 group">
                <div className="flex flex-col items-center pt-2">
                  <i className="bi bi-cloud-arrow-up-fill text-4xl text-indigo-300 mb-3"></i>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {csvData.length > 0
                      ? 'Documento carregado'
                      : 'Carregar novo arquivo CSV (Opcional)'}
                  </p>
                </div>
                <input type="file" className="hidden" accept=".csv" disabled={loading || reading || form.formState.isSubmitting} onChange={handleFileUpload} />
              </label>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-955 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                {(Object.keys(mapping) as Array<keyof ColumnMapping>).map((key) => (
                  <div key={key} className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      {key === 'date'
                        ? 'Data da Venda'
                        : key === 'product'
                          ? 'Nome do Produto'
                          : key === 'supplier'
                            ? 'Fornecedor'
                            : key === 'quantity'
                              ? 'Quantidade'
                              : key === 'cost'
                                ? 'Preço de Custo'
                                : key === 'salesValue'
                                  ? 'Valor de Venda'
                                  : key === 'profit'
                                    ? 'Lucro Bruto'
                                    : key}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={mapping[key]}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[11px] font-bold outline-none text-slate-700 dark:text-slate-200"
                      required
                    >
                      <option value="">Selecionar Coluna...</option>
                      {headers.length > 0
                        ? headers.map((h: string) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))
                        : mapping[key] && <option value={mapping[key]}>{mapping[key]}</option>}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-955 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-8">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-4 block">
                Giro Médio Mensal (Eixo X)
              </label>
              <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                <button
                  onClick={() => setTurnoverThresholdMode('avg')}
                  className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${turnoverThresholdMode === 'avg' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-400'}`}
                >
                  Média
                </button>
                <button
                  onClick={() => setTurnoverThresholdMode('custom')}
                  className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${turnoverThresholdMode === 'custom' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600' : 'text-slate-400'}`}
                >
                  Valor Fixo
                </button>
              </div>
              {turnoverThresholdMode === 'custom' && (
                <input
                  type="number"
                  value={turnoverThreshold}
                  onChange={(e) => setTurnoverThreshold(Number(e.target.value))}
                  placeholder="Unidades"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[11px] font-bold outline-none animate-slide-up"
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-4 block">
                Lucratividade Média Mensal (Eixo Y)
              </label>
              <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                <button
                  onClick={() => setProfitThresholdMode('avg')}
                  className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${profitThresholdMode === 'avg' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-400'}`}
                >
                  Média
                </button>
                <button
                  onClick={() => setProfitThresholdMode('custom')}
                  className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${profitThresholdMode === 'custom' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600' : 'text-slate-400'}`}
                >
                  Valor Fixo
                </button>
              </div>
              {profitThresholdMode === 'custom' && (
                <input
                  type="number"
                  value={profitThreshold}
                  onChange={(e) => setProfitThreshold(Number(e.target.value))}
                  placeholder="R$ / mês"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[11px] font-bold outline-none animate-slide-up"
                />
              )}
            </div>
          </div>

          {validationError && <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400">{validationError}</p>}
          {reading && <p role="status" className="text-sm text-indigo-600">Lendo e conferindo o CSV...</p>}
          <button
            type="button"
            onClick={() => void handleSave()}
            aria-label="Salvar e Atualizar"
            disabled={loading || reading || form.formState.isSubmitting}
            className="w-full py-6 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-[2rem] shadow-xl shadow-indigo-500/30 text-[12px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4"
          >
            {loading ? (
              <i className="bi bi-arrow-clockwise animate-spin text-2xl"></i>
            ) : (
              <>
                <i className="bi bi-check-circle-fill text-xl"></i> Salvar e Atualizar Resultados
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportConfigModal;
