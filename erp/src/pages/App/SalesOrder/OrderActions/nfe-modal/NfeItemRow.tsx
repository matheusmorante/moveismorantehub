import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NfeItemWithFiscal, NfeItemFiscal } from './NfeItemsSection';
import { formatCurrency } from '@/pages/utils/formatters';
import { NcmSelect } from './NcmSelect';
import { composeServiceFiscalValues } from '@/pages/utils/nfe/serviceFiscalComposition';
import {
  CFOP_OPTIONS,
  CSOSN_OPTIONS,
  ORIGEM_OPTIONS,
  CEST_OPTIONS,
} from '@/pages/utils/nfe/fiscalConstants';

const UnregisteredProductIndicator: React.FC = () => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: 'above' | 'below';
  } | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const placement = rect.bottom + 88 <= window.innerHeight ? 'below' : 'above';
    setPosition({
      top: placement === 'below' ? rect.bottom + 8 : Math.max(8, rect.top - 8),
      left,
      placement,
    });
  }, []);

  useEffect(() => {
    if (!isTooltipOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTooltipOpen, updatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        role="img"
        tabIndex={0}
        aria-label="Produto não cadastrado no ERP"
        aria-describedby={isTooltipOpen ? tooltipId : undefined}
        onMouseEnter={() => setIsTooltipOpen(true)}
        onMouseLeave={() => setIsTooltipOpen(false)}
        onFocus={() => setIsTooltipOpen(true)}
        onBlur={() => setIsTooltipOpen(false)}
        className="inline-flex shrink-0 cursor-help rounded-sm text-amber-600 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400"
      >
        <i className="bi bi-exclamation-triangle-fill text-xs" aria-hidden="true" />
      </span>
      {isTooltipOpen && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className={`fixed z-[100000000] w-[min(17.5rem,calc(100vw-1rem))] rounded-xl border border-amber-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-2xl dark:border-amber-900/70 dark:bg-slate-900 dark:text-slate-200 ${
                position.placement === 'above' ? '-translate-y-full' : ''
              }`}
            >
              <p className="font-bold text-amber-700 dark:text-amber-300">
                Produto não cadastrado no ERP
              </p>
              <p className="mt-1 leading-relaxed">
                Por isso, o NCM não foi carregado automaticamente do cadastro do produto.
              </p>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

interface Props {
  item: NfeItemWithFiscal;
  onUpdateFiscal: (field: keyof NfeItemFiscal, value: string) => void;
}

export const NfeItemRow: React.FC<Props> = ({ item, onUpdateFiscal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const values = composeServiceFiscalValues([item]).products[0];
  const itemTotal = (values.vProdCents - values.vDescCents) / 100;
  const cleanNcm = (item.fiscal?.ncm || '').replace(/\D/g, '');
  const isNcmValid = cleanNcm.length === 8;

  return (
    <div
      className={`p-3 rounded-2xl border transition-all ${
        item.isUnregistered
          ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/40'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Linha Principal do Item */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                {item.description || 'Produto sem descrição'}
              </p>
              {item.isUnregistered ? (
                <UnregisteredProductIndicator />
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Cadastrado no ERP
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Qtd:{' '}
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {item.quantity} UN
              </span>{' '}
              • Preço Un:{' '}
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {formatCurrency(item.unitPrice || 0)}
              </span>{' '}
              • Total:{' '}
              <span className="font-black text-slate-700 dark:text-slate-200">
                {formatCurrency(itemTotal)}
              </span>
            </p>
          </div>
        </div>

        {/* Campos Fiscais Rápidos (NCM via Select/Pesquisa) */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <div className="flex flex-col items-stretch gap-1.5 min-w-[190px] sm:min-w-[220px]">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
              NCM:
            </label>
            <span className={`text-[10px] ${isNcmValid ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isNcmValid ? '8 dígitos' : 'Informe 8 dígitos'}
            </span>
            <NcmSelect
              value={item.fiscal?.ncm || ''}
              onChange={(val) => onUpdateFiscal('ncm', val)}
            />
          </div>

          {/* Botão de Expandir Campos Fiscais Avançados */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              isExpanded ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
            }`}
            title="Ver / editar CFOP, CSOSN, Origem e CEST"
          >
            <i className="bi bi-chevron-down text-xs" />
          </button>
        </div>
      </div>

      {/* Campos Tributários Avançados (Sanfona Expansível com Selects) */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              CFOP *
            </label>
            <select
              aria-label="CFOP"
              value={item.fiscal?.cfop || ''}
              onChange={(e) => onUpdateFiscal('cfop', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">Selecione o CFOP</option>
              {CFOP_OPTIONS.map((cf) => (
                <option key={cf.value} value={cf.value}>
                  {cf.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              CSOSN *
            </label>
            <select
              aria-label="CSOSN"
              value={item.fiscal?.cst || ''}
              onChange={(e) => onUpdateFiscal('cst', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">Selecione o CSOSN</option>
              {CSOSN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Padrão definido nas Configurações Fiscais para este ambiente; ajuste conforme a operação.
            </p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Origem *
            </label>
            <select
              aria-label="Origem fiscal"
              value={item.fiscal?.origem || ''}
              onChange={(e) => onUpdateFiscal('origem', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">Selecione a origem</option>
              {ORIGEM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              CEST
            </label>
            <select
              aria-label="CEST"
              value={item.fiscal?.cest || ''}
              onChange={(e) => onUpdateFiscal('cest', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              {CEST_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
