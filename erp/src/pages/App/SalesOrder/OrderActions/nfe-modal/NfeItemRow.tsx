import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NcmChangeConfirmation, NfeItemWithFiscal, NfeItemFiscal } from './NfeItemsSection';
import { formatCurrency } from '@/pages/utils/formatters';
import { NcmSelect } from './NcmSelect';
import { composeServiceFiscalValues } from '@/pages/utils/nfe/serviceFiscalComposition';
import { UnregisteredProductIndicator } from '@/pages/App/SalesOrder/components/UnregisteredProductIndicator';
import {
  CFOP_OPTIONS,
  CSOSN_OPTIONS,
  ORIGEM_OPTIONS,
  CEST_OPTIONS,
} from '@/pages/utils/nfe/fiscalConstants';

interface Props {
  item: NfeItemWithFiscal;
  onUpdateFiscal: (field: keyof NfeItemFiscal, value: string) => void;
  showNcmError?: boolean;
  disabled?: boolean;
  pendingNcmConfirmation?: NcmChangeConfirmation;
  onNcmBlur?: (value: string) => void;
  onResolveNcmConfirmation?: (updateCatalog: boolean) => void;
}

export const NfeItemRow: React.FC<Props> = ({
  item,
  onUpdateFiscal,
  showNcmError = false,
  disabled = false,
  pendingNcmConfirmation,
  onNcmBlur,
  onResolveNcmConfirmation,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ncmFieldRef = useRef<HTMLDivElement>(null);
  const [confirmationPosition, setConfirmationPosition] = useState<{
    top: number;
    left: number;
    width: number;
    above: boolean;
  } | null>(null);
  const values = composeServiceFiscalValues([item]).products[0];
  const itemTotal = (values.vProdCents - values.vDescCents) / 100;
  const cleanNcm = (item.fiscal?.ncm || '').replace(/\D/g, '');
  const isNcmValid = cleanNcm.length === 8;
  const isUnregisteredConventional = item.isUnregistered && item.condition === 'novo';

  useLayoutEffect(() => {
    if (!pendingNcmConfirmation || !ncmFieldRef.current) {
      setConfirmationPosition(null);
      return;
    }
    const updatePosition = () => {
      const rect = ncmFieldRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(340, window.innerWidth - 16);
      const above = rect.top >= 190;
      setConfirmationPosition({
        top: above ? rect.top - 8 : rect.bottom + 8,
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        width,
        above,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [pendingNcmConfirmation]);

  return (
    <div
      className={`p-3 rounded-2xl border transition-all ${
        isUnregisteredConventional
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
              {isUnregisteredConventional ? (
                <UnregisteredProductIndicator />
              ) : !item.isUnregistered ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Produto cadastrado
                </span>
              ) : null}
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
            {isNcmValid ? (
              <span className="text-[10px] text-emerald-600">8 dígitos</span>
            ) : showNcmError ? (
              <span className="text-[10px] text-rose-600">Informe 8 dígitos</span>
            ) : null}
            <div ref={ncmFieldRef}>
              <NcmSelect
                value={item.fiscal?.ncm || ''}
                onChange={(val) => onUpdateFiscal('ncm', val)}
                onBlur={(value) => onNcmBlur?.(value)}
                hasError={showNcmError}
                disabled={disabled}
              />
            </div>
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
              className="w-full px-1 py-1.5 text-xs font-bold border-0 border-b border-slate-300 dark:border-slate-600 rounded-none bg-transparent text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
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
              className="w-full px-1 py-1.5 text-xs font-bold border-0 border-b border-slate-300 dark:border-slate-600 rounded-none bg-transparent text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
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
              className="w-full px-1 py-1.5 text-xs font-bold border-0 border-b border-slate-300 dark:border-slate-600 rounded-none bg-transparent text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
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
              className="w-full px-1 py-1.5 text-xs font-bold border-0 border-b border-slate-300 dark:border-slate-600 rounded-none bg-transparent text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
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
      {pendingNcmConfirmation && confirmationPosition && createPortal(
        <div
          role="alertdialog"
          aria-label="Confirmar atualização do NCM do produto"
          className="fixed z-[100000001] rounded-xl border border-blue-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{
            top: confirmationPosition.top,
            left: confirmationPosition.left,
            width: confirmationPosition.width,
            transform: confirmationPosition.above ? 'translateY(-100%)' : undefined,
          }}
        >
          <p className="text-[11px] font-bold leading-relaxed text-slate-800 dark:text-slate-100">
            Você alterou o NCM deste produto. Deseja atualizar o NCM do cadastro?
          </p>
          <p className="mt-1.5 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Cadastro: {pendingNcmConfirmation.previousNcm || 'Não informado'} → Nota: {pendingNcmConfirmation.nextNcm || 'Não informado'}
          </p>
          {pendingNcmConfirmation.nextNcm.length !== 8 && (
            <p className="mt-1 text-[10px] text-rose-600">Para atualizar o cadastro, informe um NCM com 8 dígitos.</p>
          )}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => onResolveNcmConfirmation?.(false)}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Prosseguir sem atualizar
            </button>
            <button
              type="button"
              disabled={pendingNcmConfirmation.nextNcm.length !== 8}
              onClick={() => onResolveNcmConfirmation?.(true)}
              className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Atualizar cadastro
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
