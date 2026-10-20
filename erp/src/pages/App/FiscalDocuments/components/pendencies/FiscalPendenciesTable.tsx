import React from 'react';
import type {
  FiscalPendencyItem,
  FiscalPendencyType,
} from '../../types/fiscalPendencies.types';
import type { ReplacementPendingAction } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { FiscalPendencyTypeBadge } from './FiscalPendencyTypeBadge';

interface FiscalPendenciesTableProps {
  readonly pendencies: readonly FiscalPendencyItem[];
  readonly loading: boolean;
  readonly onOpenAction: (item: FiscalPendencyItem, actionKind: ReplacementPendingAction) => void;
  readonly onViewDetails: (item: FiscalPendencyItem) => void;
}

export const FiscalPendenciesTable: React.FC<FiscalPendenciesTableProps> = ({
  pendencies,
  loading,
  onOpenAction,
  onViewDetails,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <i aria-hidden="true" className="bi bi-arrow-repeat mb-2 text-2xl animate-spin text-amber-600" />
        <p className="text-xs font-semibold">Identificando pendências fiscais em aberto…</p>
      </div>
    );
  }

  if (pendencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <i aria-hidden="true" className="bi bi-check2-circle text-3xl" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Nenhuma pendência fiscal aberta
        </h3>
        <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
          Todas as notas fiscais emitidas, estornadas e canceladas estão devidamente regularizadas na SEFAZ e sem ações pendentes.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3">Pedido / Cliente</th>
            <th scope="col" className="px-4 py-3">Tipo de Pendência</th>
            <th scope="col" className="px-4 py-3">Ambiente / Modelo</th>
            <th scope="col" className="px-4 py-3">Nota Anterior</th>
            <th scope="col" className="px-4 py-3">Situação Atual / Motivo</th>
            <th scope="col" className="px-4 py-3">Identificado em</th>
            <th scope="col" className="px-4 py-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {pendencies.map((item) => {
            const isHomologation = item.environment === 2;
            const envLabel = isHomologation ? 'NFH' : 'NF';
            const envClass = isHomologation
              ? 'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200'
              : 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';

            return (
              <tr
                key={item.id}
                onClick={() => onViewDetails(item)}
                className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                {/* Pedido e Cliente */}
                <td className="px-4 py-3.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {item.orderIndex}
                  </div>
                  <div className="mt-0.5 font-medium text-slate-600 dark:text-slate-300">
                    {item.customerName}
                  </div>
                  {item.customerDocument && (
                    <div className="font-mono text-[10px] text-slate-400">
                      {item.customerDocument}
                    </div>
                  )}
                </td>

                {/* Tipo de Pendência */}
                <td className="px-4 py-3.5">
                  <FiscalPendencyTypeBadge type={item.pendencyType} />
                </td>

                {/* Ambiente e Modelo */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black border ${envClass}`}>
                      {envLabel}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Mod. {item.model}
                    </span>
                  </div>
                </td>

                {/* Nota Anterior */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {item.originalDocumentNumber ? (
                    <div className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <span>NF {item.originalDocumentNumber}</span>
                      <span>·</span>
                      <span className="capitalize">{item.originalDocumentClosure || 'estornada'}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px]">—</span>
                  )}
                </td>

                {/* Situação Atual e Motivo */}
                <td className="px-4 py-3.5 max-w-[320px]">
                  <div className="flex flex-col gap-0.5">
                    {item.currentAttemptStatus && (
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 capitalize">
                        Tentativa: {item.currentAttemptStatus} {item.currentDocumentNumber ? `(nº ${item.currentDocumentNumber})` : ''}
                      </span>
                    )}
                    {item.reason ? (
                      <p className="line-clamp-2 text-[11px] font-semibold text-red-700 dark:text-red-400" title={item.reason}>
                        {item.reason}
                      </p>
                    ) : (
                      <span className="text-slate-500 text-[11px]">
                        Aguardando conclusão do procedimento fiscal.
                      </span>
                    )}
                  </div>
                </td>

                {/* Data */}
                <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-medium">
                  {new Date(item.identifiedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>

                {/* Ação */}
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAction(item, item.actionKind);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#3b1900] px-3 py-1.5 text-xs font-black text-amber-300 shadow transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b1900] dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300"
                  >
                    <i aria-hidden="true" className={`bi ${item.actionIcon}`} />
                    <span>{item.actionLabel}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
