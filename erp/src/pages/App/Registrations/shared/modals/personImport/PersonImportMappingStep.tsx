import React from 'react';
import type { PersonCsvColumnMapping } from '../../../../../../../../shared-utils/personImportFormSchemas';
import { MAPPING_FIELDS } from './csvMappingHeuristics';

interface PersonImportMappingStepProps {
  collectionName: string;
  defaultMarketingOrigin: '' | 'paid' | 'organic';
  setDefaultMarketingOrigin: (val: '' | 'paid' | 'organic') => void;
  mapping: PersonCsvColumnMapping;
  csvHeaders: string[];
  onMappingChange: (fieldId: keyof PersonCsvColumnMapping, value: string) => void;
  onProcessMapping: () => void;
  busy: boolean;
}

export const PersonImportMappingStep: React.FC<PersonImportMappingStepProps> = ({
  collectionName,
  defaultMarketingOrigin,
  setDefaultMarketingOrigin,
  mapping,
  csvHeaders,
  onMappingChange,
  onProcessMapping,
  busy,
}) => {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {collectionName === 'customers' && (
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Origem dos clientes quando não informada no CSV
          <select
            value={defaultMarketingOrigin}
            onChange={(event) =>
              setDefaultMarketingOrigin(event.target.value as '' | 'paid' | 'organic')
            }
            className="rounded-xl border p-3 dark:bg-slate-900"
          >
            <option value="">Selecione ou mapeie a coluna de origem</option>
            <option value="paid">Tráfego pago</option>
            <option value="organic">Orgânico</option>
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-x-12 gap-y-6 bg-slate-50 dark:bg-slate-800/30 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
        {MAPPING_FIELDS.map((field) => (
          <div key={field.id} className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {field.label} {field.required && '*'}
            </label>
            <select
              value={mapping[field.id] ?? ''}
              aria-label={field.label}
              onChange={(e) => onMappingChange(field.id, e.target.value)}
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
        type="button"
        disabled={busy}
        onClick={onProcessMapping}
        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200"
      >
        Avançar para Visualização
      </button>
    </div>
  );
};
