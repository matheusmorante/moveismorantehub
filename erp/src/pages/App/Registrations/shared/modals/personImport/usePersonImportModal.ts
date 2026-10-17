import React, { useState, useRef, useEffect } from 'react';
import Person from '../../../../../types/person.type';
import { savePeopleBatch, mapAddress } from '@/pages/utils/personService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  createPersonFormSchema,
  createPersonImportFormSchema,
} from '../../../../../../../../shared-utils/personDomainValidation';
import {
  personCsvUploadFormSchema,
  personCsvPreviewFormSchema,
  type PersonCsvColumnMapping,
} from '../../../../../../../../shared-utils/personImportFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { getSettings } from '@/pages/utils/settingsService';
import { ImportRow, ImportStep, ImportBusyState, emptyMapping, PersonImportModalProps } from './types';
import { parseCSV, parseBoolean, parseMarketingOrigin } from './csvParser';
import { autoMapCsvHeaders } from './csvMappingHeuristics';

export const usePersonImportModal = ({
  isOpen,
  onClose,
  onSuccess,
  collectionName,
}: PersonImportModalProps) => {
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState<ImportBusyState>(null);
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
  const previewForm = useZodForm(personCsvPreviewFormSchema, {
    headers: [],
    rows: [],
    mapping: emptyMapping,
    defaultMarketingOrigin,
  });

  // Mapping States
  const [step, setStep] = useState<ImportStep>('upload');
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

  const isCurrent = (revision: number) =>
    revision === session.current && latest.current.isOpen && latest.current.collectionName === collectionName;

  const showError = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    showError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da importação.');

  useEffect(() => {
    session.current += 1;
    operation.current = null;
    setBusy(null);
    setStep('upload');
    setImportData([]);
    setCsvHeaders([]);
    setCsvRows([]);
    setProgress(0);
    setIsCompleted(false);
    setSelectedIndexes(new Set());
    setDefaultMarketingOrigin('');
    setMapping({ ...emptyMapping });
    setError(null);
    setHasStartedImport(false);
    return () => {
      session.current += 1;
      operation.current = null;
      readerRef.current?.abort();
      readerRef.current = null;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
    };
  }, [isOpen, collectionName]);

  const previousImportPending = form.formState.isSubmitting && operation.current !== session.current;

  const handleFileLoad = async (selectedFile: File) => {
    if (operation.current !== null) return;
    const revision = session.current;
    operation.current = revision;
    setBusy('read');
    setError(null);
    try {
      await uploadForm.validateAndRun(
        { file: selectedFile, encoding },
        async (values) => {
          if (!isCurrent(revision)) return;
          const reader = new FileReader();
          readerRef.current = reader;
          const text = await withTimeout(
            new Promise<string>((resolve, reject) => {
              reader.onload = () =>
                typeof reader.result === 'string'
                  ? resolve(reader.result)
                  : reject(new Error('Não foi possível ler o CSV.'));
              reader.onerror = () => reject(new Error('Não foi possível ler o CSV.'));
              reader.onabort = () => reject(new Error('Leitura do CSV interrompida.'));
              reader.readAsText(values.file, values.encoding);
            }),
            15_000,
            null,
            'pessoas:ler-csv'
          );
          if (text === null) {
            reader.abort();
            throw new Error('A leitura demorou demais. Selecione o CSV novamente.');
          }
          if (!isCurrent(revision)) return;
          const rows = parseCSV(text);
          if (rows.length < 2) throw new Error('CSV vazio ou inválido.');
          setCsvHeaders(rows[0]);
          setCsvRows(rows.slice(1));
          const newMapping = autoMapCsvHeaders(rows[0]);
          setMapping(newMapping);
          setStep('mapping');
        },
        (errors) => {
          if (isCurrent(revision)) invalid(errors);
        }
      );
    } catch (err) {
      if (isCurrent(revision)) showError(err instanceof Error ? err.message : 'Não foi possível ler o CSV.');
    } finally {
      if (isCurrent(revision)) {
        readerRef.current = null;
        operation.current = null;
        setBusy(null);
      }
    }
  };

  const handleMappingChange = (fieldId: keyof PersonCsvColumnMapping, value: string) => {
    const numValue = value === '' ? null : Number(value);
    setMapping((prev) => ({ ...prev, [fieldId]: numValue }));
  };

  const processMappingToPreview = async () => {
    if (operation.current !== null || hasStartedImport) return;
    const revision = session.current;
    operation.current = revision;
    setBusy('preview');
    setError(null);
    try {
      await previewForm.validateAndRun(
        { headers: csvHeaders, rows: csvRows, mapping, defaultMarketingOrigin },
        (values) => {
          if (!isCurrent(revision)) return;
          const mapped: ImportRow[] = values.rows.map((row): ImportRow => {
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
                marketingOrigin:
                  collectionName === 'customers'
                    ? parseMarketingOrigin(getVal('marketingOrigin'), values.defaultMarketingOrigin)
                    : undefined,
                fullAddress: mapAddress(addrData),
                observation: getVal('observation'),
                active: true,
                type: collectionName as any,
              } as any,
            };
          });

          const checked = mapped.map((row) => {
            const parsed = personSchema.safeParse(row.data);
            return parsed.success
              ? { ...row, data: parsed.data as Partial<Person> }
              : { ...row, status: 'error' as const, error: parsed.error.issues[0]?.message };
          });
          setImportData(checked);
          setSelectedIndexes(new Set(checked.flatMap((row, i) => (row.status === 'pending' ? [i] : []))));
          setStep('preview');
        },
        (errors) => {
          if (isCurrent(revision)) invalid(errors);
        }
      );
    } catch {
      if (isCurrent(revision)) showError('Não foi possível preparar os registros do CSV.');
    } finally {
      if (isCurrent(revision)) {
        operation.current = null;
        setBusy(null);
      }
    }
  };

  const runImport = async () => {
    if (operation.current !== null || isCompleted || form.formState.isSubmitting) return;
    const revision = session.current;
    operation.current = revision;
    setBusy('import');
    setError(null);
    setProgress(0);
    const targetCollection = collectionName;
    const selected = importData.flatMap((row, index) =>
      selectedIndexes.has(index) && row.status === 'pending' ? [{ row, index }] : []
    );
    try {
      await form.validateAndRun(
        { rows: selected.map(({ row }) => row.data) },
        async ({ rows }) => {
          if (!isCurrent(revision)) return;
          const total = rows.length;
          for (let start = 0; start < total; start += 50) {
            if (!isCurrent(revision)) return;
            const indexes = selected.slice(start, start + 50).map(({ index }) => index);
            setHasStartedImport(true);
            setImportData((current) =>
              current.map((row, index) => (indexes.includes(index) ? { ...row, status: 'processing' } : row))
            );
            try {
              const result = await withTimeout(
                savePeopleBatch(targetCollection, rows.slice(start, start + 50) as Partial<Person>[]).then(
                  () => true
                ),
                30_000,
                false,
                'pessoas:importar-lote'
              );
              if (!isCurrent(revision)) return;
              if (!result) throw new Error('A gravação demorou demais.');
            } catch {
              if (!isCurrent(revision)) return;
              const message =
                'A gravação de ' +
                indexes.length +
                ' registros não foi confirmada. Confira os cadastros antes de repetir esse bloco.';
              setImportData((current) =>
                current.map((row, index) =>
                  indexes.includes(index) ? { ...row, status: 'uncertain', error: message } : row
                )
              );
              setSelectedIndexes(
                (current) => new Set([...current].filter((index) => !indexes.includes(index)))
              );
              showError(message);
              return;
            }
            setImportData((current) =>
              current.map((row, index) => (indexes.includes(index) ? { ...row, status: 'success' } : row))
            );
            setSelectedIndexes(
              (current) => new Set([...current].filter((index) => !indexes.includes(index)))
            );
            setProgress(Math.round((Math.min(start + 50, total) / total) * 100));
          }
          if (!isCurrent(revision)) return;
          setIsCompleted(true);
          toast.success(total + ' registros importados com sucesso! ✨');
          try {
            latest.current.onSuccess();
          } catch {
            showError('Importação concluída. Reabra a listagem para atualizar os cadastros.');
          }
          if (!hasUnconfirmedRows) {
            closeTimer.current = setTimeout(() => {
              if (isCurrent(revision)) latest.current.onClose();
            }, 1500);
          }
        },
        (errors) => {
          if (isCurrent(revision)) invalid(errors);
        }
      );
    } catch {
      if (isCurrent(revision)) showError('Não foi possível preparar a importação.');
    } finally {
      if (isCurrent(revision)) {
        operation.current = null;
        setBusy(null);
      }
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
    const validIndexes = importData.flatMap((row, i) => (row.status === 'pending' ? [i] : []));
    if (selectedIndexes.size === validIndexes.length) setSelectedIndexes(new Set());
    else setSelectedIndexes(new Set(validIndexes));
  };

  return {
    importData,
    busy,
    isImporting,
    error,
    setError,
    hasStartedImport,
    isCompleted,
    hasUnconfirmedRows,
    progress,
    encoding,
    setEncoding,
    selectedIndexes,
    defaultMarketingOrigin,
    setDefaultMarketingOrigin,
    step,
    setStep,
    csvHeaders,
    mapping,
    fileInputRef,
    previousImportPending,
    operation,
    handleFileLoad,
    handleMappingChange,
    processMappingToPreview,
    runImport,
    toggleSelection,
    toggleAll,
  };
};
