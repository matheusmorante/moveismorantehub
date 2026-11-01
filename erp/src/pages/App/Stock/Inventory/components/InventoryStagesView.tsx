import React, { useMemo, useState } from 'react';
import type { AuditItem } from '../types/inventoryAudit.types';

interface Stage {
  supplierName: string;
  counted: number;
  countedQuantityTotal: number;
  total: number;
  started: boolean;
}

interface InventoryStagesViewProps {
  readonly items: AuditItem[];
  readonly variant?: 'stages' | 'summary' | 'selection';
  readonly onStartStage?: (supplierName: string) => Promise<void>;
  readonly onSelectSupplier?: (supplierName: string) => void;
  readonly onCancel?: () => void;
  readonly summaryAction?: React.ReactNode;
}

export const InventoryStagesView: React.FC<InventoryStagesViewProps> = ({
  items,
  variant = 'stages',
  onStartStage,
  onSelectSupplier,
  onCancel,
  summaryAction,
}) => {
  const [startingStage, setStartingStage] = useState<string | null>(null);
  const [startError, setStartError] = useState('');

  const stages = useMemo(() => {
    const stageMap = new Map<string, Stage>();

    for (const item of items) {
      const supplier = item.assignedSupplier || 'Sem fornecedor';
      if (!stageMap.has(supplier)) {
        stageMap.set(supplier, {
          supplierName: supplier,
          counted: 0,
          countedQuantityTotal: 0,
          total: 0,
          started: false,
        });
      }
      const stage = stageMap.get(supplier)!;
      stage.total++;
      if (typeof item.physicalCount === 'number') {
        stage.counted++;
        stage.countedQuantityTotal += Number.isFinite(item.physicalCount) ? item.physicalCount : 0;
        stage.started = true;
      }
      if (item.supplierStageStarted === true) stage.started = true;
    }

    const stagesArray = Array.from(stageMap.values());
    for (const stage of stagesArray) {
      if (variant === 'stages' && stage.started) stage.counted = stage.total;
    }

    // Items without a supplier remain available to the general scanner, not as a supplier card.
    const filteredStagesArray = stagesArray.filter(
      (stage) => stage.supplierName !== 'Sem fornecedor'
    );
    filteredStagesArray.sort((a, b) => {
      return a.supplierName.localeCompare(b.supplierName);
    });

    return filteredStagesArray;
  }, [items, variant]);

  const startStage = async (supplierName: string) => {
    if (startingStage || !onStartStage) return;
    setStartingStage(supplierName);
    setStartError('');
    try {
      await onStartStage(supplierName);
    } catch {
      setStartError('Não foi possível salvar o início desta etapa. Tente novamente.');
    } finally {
      setStartingStage(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {onCancel && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 font-bold rounded-xl transition-colors text-sm"
          >
            <i className="bi bi-arrow-left"></i>
            Voltar
          </button>
        </div>
      )}
      <div className="space-y-4">
        <div className={variant === 'summary' && summaryAction ? 'flex items-center justify-between gap-3' : ''}>
          <h3 className={`text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ${variant === 'summary' && summaryAction ? 'min-w-0 flex-1' : 'px-2'}`}>
            {variant === 'summary'
              ? 'Quantidades contadas por fornecedor'
              : variant === 'selection'
                ? 'Escolha o fornecedor para contar'
                : `Livre: Etapas por Fornecedor (${stages.length})`}
          </h3>
          {variant === 'summary' && summaryAction}
        </div>
        {variant === 'selection' && (
          <p className="px-2 -mt-2 text-sm text-slate-500 dark:text-slate-400">
            Abra um cartão para contar somente os produtos daquele fornecedor.
          </p>
        )}
        {variant === 'stages' ? (
          <p className="px-2 -mt-2 text-sm text-slate-500 dark:text-slate-400">
            Etapas não iniciadas ficam fora do ajuste. Clique em Iniciar ou Retomar para abrir a contagem; ao iniciar, campos sem quantidade valem 0.
          </p>
        ) : null}
        {variant !== 'summary' && startError && <p role="alert" className="px-2 text-sm font-semibold text-rose-600">{startError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {variant === 'selection' && stages.length === 0 && (
            <p className="col-span-full rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              Nenhum fornecedor com produtos disponíveis para este inventário.
            </p>
          )}
          {stages.map((stage) => {
            const isLightCard = variant === 'summary' || variant === 'selection' || stage.started;
            const cardContent = (
              <>
                <div className={`flex items-start justify-between w-full gap-3 ${variant === 'selection' ? '' : 'mb-4'}`}>
                  <div className={`min-w-0 font-black text-lg line-clamp-2 leading-tight ${isLightCard ? 'text-slate-800 dark:text-slate-100' : 'text-white'}`}>
                    {stage.supplierName}
                  </div>
                  {variant === 'selection' ? (
                    startingStage === stage.supplierName
                      ? <i className="bi bi-arrow-repeat animate-spin text-blue-600" aria-hidden="true" />
                      : <i className="bi bi-chevron-right text-slate-400" aria-hidden="true" />
                  ) : variant === 'summary' && onSelectSupplier ? (
                    <i className="bi bi-chevron-right text-slate-400" aria-hidden="true" />
                  ) : variant === 'stages' ? (
                    <button
                      type="button"
                      onClick={() => void startStage(stage.supplierName)}
                      disabled={startingStage !== null}
                      aria-label={`${stage.started ? 'Retomar' : 'Iniciar'} contagem de ${stage.supplierName}`}
                      title={`${stage.started ? 'Retomar' : 'Iniciar'} contagem`}
                      className={`flex min-h-10 min-w-[76px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${stage.started ? 'bg-emerald-600 text-white' : 'bg-white text-slate-900'}`}
                    >
                      {startingStage === stage.supplierName
                        ? <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />
                        : stage.started ? 'Retomar' : 'Iniciar'}
                    </button>
                  ) : null}
                </div>

                {variant !== 'selection' && (
                  <div className={`mt-auto w-full text-sm font-medium ${isLightCard ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300'} ${variant === 'stages' ? 'mb-4' : ''}`}>
                    <strong className={isLightCard ? 'text-slate-700 dark:text-slate-300' : 'text-white'}>
                      {variant === 'summary'
                        ? stage.countedQuantityTotal.toLocaleString('pt-BR')
                        : stage.counted}
                    </strong>{' '}
                    {variant === 'summary'
                      ? stage.countedQuantityTotal === 1 ? 'quantidade contada' : 'quantidades contadas'
                      : stage.counted === 1 ? 'produto considerado' : 'produtos considerados'}
                  </div>
                )}
              </>
            );

            const cardClass = `flex flex-col text-left border rounded-2xl p-5 shadow-sm transition-all ${isLightCard ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-950 border-slate-800 text-white'}`;
            return variant === 'selection' || (variant === 'summary' && onSelectSupplier) ? (
              <button
                key={stage.supplierName}
                type="button"
                disabled={variant === 'selection' && startingStage !== null}
                onClick={() => variant === 'selection'
                  ? void startStage(stage.supplierName)
                  : onSelectSupplier?.(stage.supplierName)}
                aria-label={`${variant === 'selection' ? 'Abrir contagem' : 'Abrir itens'} do fornecedor ${stage.supplierName}`}
                className={`${cardClass} w-full min-h-20 hover:border-blue-400 hover:shadow-md disabled:opacity-60`}
              >
                {cardContent}
              </button>
            ) : (
              <article key={stage.supplierName} className={cardClass}>
                {cardContent}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
