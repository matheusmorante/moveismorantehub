import React from 'react';
import { ImportRow } from './types';

interface PersonImportPreviewStepProps {
  importData: ImportRow[];
  selectedIndexes: Set<number>;
  busy: boolean;
  onToggleSelection: (idx: number) => void;
  onToggleAll: () => void;
}

export const PersonImportPreviewStep: React.FC<PersonImportPreviewStepProps> = ({
  importData,
  selectedIndexes,
  busy,
  onToggleSelection,
  onToggleAll,
}) => {
  const pendingCount = importData.filter((row) => row.status === 'pending').length;
  const allPendingSelected = selectedIndexes.size === pendingCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
          Registros encontrados ({importData.length})
        </h3>
        <button
          type="button"
          disabled={busy}
          onClick={onToggleAll}
          className="text-[10px] font-black text-blue-600 uppercase tracking-widest underline underline-offset-4"
        >
          {allPendingSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
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
                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                  !selectedIndexes.has(i) ? 'opacity-40' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${row.data.fullName || `registro ${i + 1}`}`}
                    checked={selectedIndexes.has(i)}
                    disabled={busy || row.status !== 'pending'}
                    onChange={() => onToggleSelection(i)}
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
                <td className="px-6 py-4 text-xs">
                  <span className={row.error ? 'text-red-600' : 'text-emerald-700'}>
                    {row.error ||
                      (row.status === 'success'
                        ? 'Importado'
                        : row.status === 'processing'
                        ? 'Importando...'
                        : 'Pronto para importar')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
