import React, { useState, useRef } from 'react';
import Person from '../../../../types/person.type';
import { savePeopleBatch, mapAddress } from '@/pages/utils/personService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createPersonFormSchema, createPersonImportFormSchema } from '../../../../../../../shared-utils/personDomainValidation';
import { personCsvUploadFormSchema, personCsvPreviewFormSchema, type PersonCsvColumnMapping } from '../../../../../../../shared-utils/personImportFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { getSettings } from '@/pages/utils/settingsService';

interface PersonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  collectionName: string;
  title: string;
}

interface ImportRow {
  status: 'pending' | 'processing' | 'success' | 'error' | 'uncertain';
  error?: string;
  data: Partial<Person>;
  csvRow: string[];
}

const emptyMapping: PersonCsvColumnMapping = {
  id: null, fullName: null, nickname: null, personType: null, cpfCnpj: null, rgIe: null, email: null,
  phone: null, zipCode: null, street: null, number: null, complement: null, neighborhood: null,
  city: null, state: null, observation: null, marketingOrigin: null, noPhone: null, noAddress: null,
};

const PersonImportModal: React.FC<PersonImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  collectionName,
  title,
}) => {
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState<'read' | 'preview' | 'import' | null>(null);
  const isImporting = busy === 'import';
  const [error, setError] = useState<string | null>(null);
  const [hasStartedImport, setHasStartedImport] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const hasUnconfirmedRows = importData.some((row) => row.status === 'uncertain');
  const [progress, setProgress] = useState(0);
  const [encoding, setEncoding] = useState<'UTF-8' | 'ISO-8859-1'>('UTF-8');
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [defaultMarketingOrigin, setDefaultMarketingOrigin] = useState<'' | 'paid' | 'organic'>('');
  const requiredFields = getSettings().requiredFields;
  const personSchema = createPersonFormSchema(collectionName, requiredFields);
  const form = useZodForm(createPersonImportFormSchema(collectionName, requiredFields), { rows: [] });
  const uploadForm = useZodForm(personCsvUploadFormSchema, { file: undefined as unknown as File, encoding });
  const previewForm = useZodForm(personCsvPreviewFormSchema, { headers: [], rows: [], mapping: emptyMapping, defaultMarketingOrigin });

  // Mapping States
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<PersonCsvColumnMapping>({ ...emptyMapping });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = useRef(0);
  const operation = useRef<number | null>(null);
  const latest = useRef({ isOpen, collectionName, onSuccess, onClose });
  latest.current = { isOpen, collectionName, onSuccess, onClose };
  const isCurrent = (revision: number) => revision === session.current && latest.current.isOpen && latest.current.collectionName === collectionName;
  const showError = (message: string) => { setError(message); toast.error(message); };
  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => showError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da importação.');

  React.useEffect(() => {
    session.current += 1; operation.current = null; setBusy(null);
    setStep('upload'); setImportData([]); setCsvHeaders([]); setCsvRows([]);
    setProgress(0); setIsCompleted(false); setSelectedIndexes(new Set()); setDefaultMarketingOrigin('');
    setMapping({ ...emptyMapping }); setError(null); setHasStartedImport(false);
    return () => {
      session.current += 1; operation.current = null; readerRef.current?.abort(); readerRef.current = null;
      if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = null;
    };
  }, [isOpen, collectionName]);

  const previousImportPending = form.formState.isSubmitting && operation.current !== session.current;
  if (!isOpen) return null;

  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    const firstLine = text.split('\n')[0];
    const delimiter =
      (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') inQuotes = false;
        else currentField += char;
      } else {
        if (char === '"') inQuotes = true;
        else if (char === delimiter) {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') i++;
          currentRow.push(currentField.trim());
          if (currentRow.some((f) => f !== '')) rows.push(currentRow);
          currentRow = [];
          currentField = '';
        } else currentField += char;
      }
    }

    if (currentRow.length > 0 || currentField !== '') {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f !== '')) rows.push(currentRow);
    }
    if (inQuotes) throw new Error('O CSV contém aspas sem fechamento.');
    return rows;
  };

  const handleFileLoad = async (selectedFile: File) => {
    if (operation.current !== null) return;
    const revision = session.current; operation.current = revision; setBusy('read'); setError(null);
    try {
      await uploadForm.validateAndRun({ file: selectedFile, encoding }, async (values) => {
        if (!isCurrent(revision)) return;
        const reader = new FileReader(); readerRef.current = reader;
        const text = await withTimeout(new Promise<string>((resolve, reject) => {
          reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler o CSV.'));
          reader.onerror = () => reject(new Error('Não foi possível ler o CSV.'));
          reader.onabort = () => reject(new Error('Leitura do CSV interrompida.'));
          reader.readAsText(values.file, values.encoding);
        }), 15_000, null, 'pessoas:ler-csv');
        if (text === null) { reader.abort(); throw new Error('A leitura demorou demais. Selecione o CSV novamente.'); }
        if (!isCurrent(revision)) return;
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error('CSV vazio ou inválido.');
        setCsvHeaders(rows[0]); setCsvRows(rows.slice(1));
        const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
        const headers = rows[0].map(normalize);
        const newMapping = { ...emptyMapping };
        const fieldKeywords: Partial<Record<keyof PersonCsvColumnMapping, string[]>> = {
          id: ['ID', 'UUID', 'PK'], fullName: ['NOME', 'RAZAO', 'FULL NAME', 'CLIENTE', 'FORNECEDOR'],
          nickname: ['FANTASIA', 'NICKNAME', 'APELIDO'], cpfCnpj: ['CPF', 'CNPJ', 'DOCUMENTO'],
          rgIe: ['RG', 'IE', 'INSCRICAO'], email: ['EMAIL', 'E-MAIL'], phone: ['FONE', 'TELEFONE', 'CELULAR', 'WHATSAPP'],
          noPhone: ['SEM TELEFONE', 'SEM FONE', 'NOPHONE'], noAddress: ['SEM ENDERECO', 'NOADDRESS'],
          marketingOrigin: ['ORIGEM', 'MARKETINGORIGIN'], zipCode: ['CEP', 'ZIP'], street: ['RUA', 'ENDERECO', 'LOGRADOURO'],
          number: ['NUMERO'], complement: ['COMPLEMENTO'], neighborhood: ['BAIRRO'], city: ['CIDADE', 'MUNICIPIO'],
          state: ['UF', 'ESTADO'], observation: ['OBS', 'OBSERVACAO'],
        };
        for (const field of Object.keys(fieldKeywords) as Array<keyof PersonCsvColumnMapping>) {
          const keywords = fieldKeywords[field]!;
          const allowed = (header: string) => !(field === 'phone' && /SEM (TELEFONE|FONE)|NOPHONE/.test(header)) && !(field === 'street' && /SEM ENDERECO|NOADDRESS/.test(header));
          let index = headers.findIndex((header) => allowed(header) && keywords.includes(header));
          if (index === -1 && field !== 'id') index = headers.findIndex((header) => allowed(header) && keywords.some((keyword) => header.includes(keyword)));
          if (index !== -1) newMapping[field] = index;
        }
        setMapping(newMapping); setStep('mapping');
      }, (errors) => { if (isCurrent(revision)) invalid(errors); });
    } catch (err) {
      if (isCurrent(revision)) showError(err instanceof Error ? err.message : 'Não foi possível ler o CSV.');
    } finally {
      if (isCurrent(revision)) { readerRef.current = null; operation.current = null; setBusy(null); }
    }
  };

  const handleMappingChange = (fieldId: keyof PersonCsvColumnMapping, value: string) => {
    const numValue = value === '' ? null : Number(value);
    setMapping((prev) => ({ ...prev, [fieldId]: numValue }));
  };
  const parseBoolean = (value?: string) => {
    const normalized = value?.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return undefined;
    if (['sim', 'true', '1', 'yes'].includes(normalized)) return true;
    if (['não', 'nao', 'false', '0', 'no'].includes(normalized)) return false;
    return value;
  };
  const parseMarketingOrigin = (value: string | undefined, fallback: string) => {
    const normalized = value?.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return fallback;
    if (['paid', 'pago', 'tráfego pago', 'trafego pago', 'sim'].includes(normalized)) return 'paid';
    if (['organic', 'orgânico', 'organico', 'não', 'nao'].includes(normalized)) return 'organic';
    return normalized;
  };

  const processMappingToPreview = async () => {
    if (operation.current !== null || hasStartedImport) return;
    const revision = session.current; operation.current = revision; setBusy('preview'); setError(null);
    try {
      await previewForm.validateAndRun({ headers: csvHeaders, rows: csvRows, mapping, defaultMarketingOrigin }, (values) => {
        if (!isCurrent(revision)) return;
        const mapped: ImportRow[] = values.rows
          .map((row): ImportRow => {
            const getVal = (field: keyof PersonCsvColumnMapping) =>
              values.mapping[field] !== null ? row[values.mapping[field]!] : undefined;

            const addrData = {
              zipCode: getVal('zipCode'),
              street: getVal('street'),
              number: getVal('number'),
              complement: getVal('complement'),
              neighborhood: getVal('neighborhood'),
              city: getVal('city'),
              state: getVal('state'),
            };

            return {
              status: 'pending',
              csvRow: row,
              data: {
                id: getVal('id'),
                fullName: getVal('fullName') || '',
                nickname: getVal('nickname'),
                personType:
                  String(getVal('cpfCnpj') || '').replace(/[^0-9A-Z]/gi, '').length === 14
                    ? 'PJ'
                    : 'PF',
                cpfCnpj: getVal('cpfCnpj'),
                rgIe: getVal('rgIe'),
                email: getVal('email'),
                phone: getVal('phone'),
                noPhone: parseBoolean(getVal('noPhone')),
                noAddress: parseBoolean(getVal('noAddress')),
                marketingOrigin: collectionName === 'customers' ? parseMarketingOrigin(getVal('marketingOrigin'), values.defaultMarketingOrigin) : undefined,
                fullAddress: mapAddress(addrData),
                observation: getVal('observation'),
                active: true,
                type: collectionName as any,
              } as any,
            };
          });

        const checked = mapped.map((row) => {
          const parsed = personSchema.safeParse(row.data);
          return parsed.success ? { ...row, data: parsed.data as Partial<Person> } : { ...row, status: 'error' as const, error: parsed.error.issues[0]?.message };
        });
        setImportData(checked);
        setSelectedIndexes(new Set(checked.flatMap((row, i) => row.status === 'pending' ? [i] : [])));
        setStep('preview');
      }, (errors) => { if (isCurrent(revision)) invalid(errors); });
    } catch {
      if (isCurrent(revision)) showError('Não foi possível preparar os registros do CSV.');
    } finally {
      if (isCurrent(revision)) { operation.current = null; setBusy(null); }
    }
  };

  const runImport = async () => {
    if (operation.current !== null || isCompleted || form.formState.isSubmitting) return;
    const revision = session.current; operation.current = revision; setBusy('import'); setError(null); setProgress(0);
    const targetCollection = collectionName;
    const selected = importData.flatMap((row, index) => selectedIndexes.has(index) && row.status === 'pending' ? [{ row, index }] : []);
    try {
      await form.validateAndRun({ rows: selected.map(({ row }) => row.data) }, async ({ rows }) => {
        if (!isCurrent(revision)) return;
        const total = rows.length;
        for (let start = 0; start < total; start += 50) {
          if (!isCurrent(revision)) return;
          const indexes = selected.slice(start, start + 50).map(({ index }) => index);
          setHasStartedImport(true);
          setImportData((current) => current.map((row, index) => indexes.includes(index) ? { ...row, status: 'processing' } : row));
          try {
            const result = await withTimeout(savePeopleBatch(targetCollection, rows.slice(start, start + 50) as Partial<Person>[]).then(() => true), 30_000, false, 'pessoas:importar-lote');
            if (!isCurrent(revision)) return;
            if (!result) throw new Error('A gravação demorou demais.');
          } catch {
            if (!isCurrent(revision)) return;
            const message = 'A gravação de ' + indexes.length + ' registros não foi confirmada. Confira os cadastros antes de repetir esse bloco.';
            setImportData((current) => current.map((row, index) => indexes.includes(index) ? { ...row, status: 'uncertain', error: message } : row));
            setSelectedIndexes((current) => new Set([...current].filter((index) => !indexes.includes(index))));
            showError(message); return;
          }
          setImportData((current) => current.map((row, index) => indexes.includes(index) ? { ...row, status: 'success' } : row));
          setSelectedIndexes((current) => new Set([...current].filter((index) => !indexes.includes(index))));
          setProgress(Math.round((Math.min(start + 50, total) / total) * 100));
        }
        if (!isCurrent(revision)) return;
        setIsCompleted(true); toast.success(total + ' registros importados com sucesso! ✨');
        try { latest.current.onSuccess(); } catch { showError('Importação concluída. Reabra a listagem para atualizar os cadastros.'); }
        if (!hasUnconfirmedRows) closeTimer.current = setTimeout(() => { if (isCurrent(revision)) latest.current.onClose(); }, 1500);
      }, (errors) => { if (isCurrent(revision)) invalid(errors); });
    } catch {
      if (isCurrent(revision)) showError('Não foi possível preparar a importação.');
    } finally {
      if (isCurrent(revision)) { operation.current = null; setBusy(null); }
    }
  };

  const toggleSelection = (idx: number) => {
    if (operation.current !== null || importData[idx]?.status !== 'pending') return;
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (operation.current !== null) return;
    const validIndexes = importData.flatMap((row, i) => row.status === 'pending' ? [i] : []);
    if (selectedIndexes.size === validIndexes.length) setSelectedIndexes(new Set());
    else setSelectedIndexes(new Set(validIndexes));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={!busy ? onClose : undefined}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              Importação de {title}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Carregue sua planilha CSV para processamento em lote
            </p>
          </div>

          <div className="flex items-center gap-4">
            {step === 'upload' && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-[9px] font-black uppercase text-slate-400 px-2">
                  Encoding:
                </span>
                <button
                  type="button" disabled={!!busy}
                  onClick={() => setEncoding('UTF-8')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold ${encoding === 'UTF-8' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  UTF-8
                </button>
                <button
                  type="button" disabled={!!busy}
                  onClick={() => setEncoding('ISO-8859-1')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold ${encoding === 'ISO-8859-1' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  ANSI
                </button>
              </div>
            )}
            <button
              type="button" aria-label="Fechar importação"
              onClick={onClose}
              disabled={!!busy}
              className="p-2 text-slate-400 hover:text-red-500"
            >
              <i className="bi bi-x-lg text-xl"></i>
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mx-10 mt-4 text-sm text-red-600">{error}</p>}
        {busy === 'read' && <p role="status" className="mx-10 mt-4 text-sm text-slate-500">Lendo CSV...</p>}
        {previousImportPending && <p role="status" className="mx-10 mt-4 text-sm text-slate-500">Aguardando a importação anterior terminar...</p>}
        {isCompleted && <p role="status" className="mx-10 mt-4 text-sm text-emerald-700">{hasUnconfirmedRows ? 'Registros selecionados importados. Confira os registros sem confirmação antes de fechar.' : 'Importação concluída.'}</p>}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {step === 'upload' && (
            <div
              role="button" tabIndex={busy ? -1 : 0} aria-label="Selecionar arquivo CSV" aria-disabled={!!busy}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!busy) fileInputRef.current?.click(); } }}
              onClick={() => { if (!busy) fileInputRef.current?.click(); }}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-32 flex flex-col items-center justify-center gap-6 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="bi bi-file-earmark-arrow-up text-4xl text-blue-600"></i>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                  Arraste seu arquivo CSV
                </h3>
                <p className="text-slate-400 font-medium max-w-sm">
                  Dica: Utilize cabeçalhos claros como Nome, CPF/CNPJ, Email, Telefone, CEP, Cidade.
                </p>
              </div>
              <input
                type="file"
                aria-label="Arquivo CSV" disabled={!!busy}
                ref={fileInputRef}
                onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void handleFileLoad(file); }}
                accept=".csv"
                className="hidden"
              />
            </div>
          )}

          {step === 'mapping' && (
            <div className="flex flex-col gap-8 max-w-4xl mx-auto">
              {collectionName === 'customers' && <label className="flex flex-col gap-2 text-sm font-semibold">
                Origem dos clientes quando não informada no CSV
                <select value={defaultMarketingOrigin} onChange={(event) => setDefaultMarketingOrigin(event.target.value as '' | 'paid' | 'organic')} className="rounded-xl border p-3 dark:bg-slate-900">
                  <option value="">Selecione ou mapeie a coluna de origem</option>
                  <option value="paid">Tráfego pago</option><option value="organic">Orgânico</option>
                </select>
              </label>}
              <div className="grid grid-cols-2 gap-x-12 gap-y-6 bg-slate-50 dark:bg-slate-800/30 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                {[
                  { id: 'fullName', label: 'Nome Completo / Razão Social', required: true },
                  { id: 'nickname', label: 'Nome Fantasia / Apelido' },
                  { id: 'cpfCnpj', label: 'CPF / CNPJ' },
                  { id: 'email', label: 'E-mail' },
                  { id: 'phone', label: 'Telefone' },
                  { id: 'noPhone', label: 'Sem telefone (sim/não)' },
                  { id: 'noAddress', label: 'Sem endereço (sim/não)' },
                  { id: 'marketingOrigin', label: 'Origem (paid/organic)' },
                  { id: 'zipCode', label: 'CEP' },
                  { id: 'street', label: 'Logradouro / Rua' },
                  { id: 'number', label: 'Número' },
                  { id: 'complement', label: 'Complemento' },
                  { id: 'neighborhood', label: 'Bairro' },
                  { id: 'city', label: 'Cidade' },
                  { id: 'state', label: 'UF / Estado' },
                  { id: 'observation', label: 'Observações' },
                ].map((field) => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {field.label} {field.required && '*'}
                    </label>
                    <select
                      value={mapping[field.id as keyof PersonCsvColumnMapping] ?? ''}
                      aria-label={field.label}
                      onChange={(e) => handleMappingChange(field.id as keyof PersonCsvColumnMapping, e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold"
                    >
                      <option value="">-- Ignorar --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button
                type="button" disabled={!!busy}
                onClick={() => void processMappingToPreview()}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200"
              >
                Avançar para Visualização
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Registros encontrados ({importData.length})
                </h3>
                <button
                  type="button" disabled={!!busy}
                  onClick={toggleAll}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest underline underline-offset-4"
                >
                  {selectedIndexes.size === importData.filter((row) => row.status === 'pending').length
                    ? 'Desmarcar Todos'
                    : 'Selecionar Todos'}
                </button>
              </div>
              <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 w-10"></th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        CPF/CNPJ
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Contato
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Localidade
                      </th>
                      <th className="px-6 py-4 text-xs font-bold">Validação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {importData.map((row, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${!selectedIndexes.has(i) ? 'opacity-40' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${row.data.fullName || `registro ${i + 1}`}`}
                            checked={selectedIndexes.has(i)}
                            disabled={!!busy || row.status !== 'pending'}
                            onChange={() => toggleSelection(i)}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                          {row.data.fullName}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-400">
                          {row.data.cpfCnpj || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            {row.data.email}
                          </p>
                          <p className="text-[10px] text-slate-400">{row.data.phone}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-400">
                          {row.data.fullAddress?.city} - {row.data.fullAddress?.state}
                        </td>
                        <td className="px-6 py-4 text-xs"><span className={row.error ? 'text-red-600' : 'text-emerald-700'}>{row.error || (row.status === 'success' ? 'Importado' : row.status === 'processing' ? 'Importando...' : 'Pronto para importar')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {isImporting && (
          <div className="px-10 py-4 bg-slate-900 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                Processando Importação...
              </span>
              <span className="text-[10px] font-black text-blue-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {step === 'preview' && !isImporting && !isCompleted && (
          <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button
              type="button" disabled={!!busy || hasStartedImport}
              onClick={() => { if (!hasStartedImport && operation.current === null) { setError(null); setStep('mapping'); } }}
              className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest"
            >
              Voltar
            </button>
            <button
              type="button" disabled={!!busy || previousImportPending}
              onClick={() => void runImport()}
              className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200/50 flex items-center justify-center gap-3"
            >
              <i className="bi bi-cloud-arrow-up-fill text-lg" />
              Finalizar Importação ({selectedIndexes.size} Registros)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonImportModal;
