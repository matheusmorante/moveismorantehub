import React, { useMemo, useState } from 'react';
import { NfeItemWithFiscal, NfeItemFiscal } from './NfeItemsSection';
import { formatCurrency } from '@/pages/utils/formatters';
import { NcmSelect } from './NcmSelect';
import { composeServiceFiscalValues } from '@/pages/utils/nfe/serviceFiscalComposition';
import { UnregisteredProductIndicator } from '@/pages/App/SalesOrder/components/UnregisteredProductIndicator';
import {
  CSOSN_OPTIONS,
  ORIGEM_OPTIONS,
  CEST_OPTIONS,
} from '@/pages/utils/nfe/fiscalConstants';

export interface NfeItemCfopOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  item: NfeItemWithFiscal;
  itemIndex: number;
  cfopOptions?: readonly NfeItemCfopOption[];
  cfopContextMessage?: string;
  fieldError?: { field: 'ncm' | 'cfop' | 'cst' | 'origem'; message: string } | null;
  onUpdateFiscal: (field: keyof NfeItemFiscal, value: string) => void;
  onUpdateFiscalBlur?: () => void;
  onClearFieldError?: () => void;
}

export const NfeItemRow: React.FC<Props> = ({
  item,
  itemIndex,
  cfopOptions = [],
  cfopContextMessage,
  fieldError,
  onUpdateFiscal,
  onClearFieldError,
  onUpdateFiscalBlur,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cfopSearch, setCfopSearch] = useState('');
  const values = composeServiceFiscalValues([item]).products[0];
  const itemTotal = (values.vProdCents - values.vDescCents) / 100;
  const cleanNcm = (item.fiscal?.ncm || '').replace(/\D/g, '');
  const isNcmValid = cleanNcm.length === 8;

  const hasNcmError = fieldError?.field === 'ncm';
  const hasCfopError = fieldError?.field === 'cfop';
  const hasCstError = fieldError?.field === 'cst';
  const hasOrigemError = fieldError?.field === 'origem';
  const visibleCfopOptions = useMemo(() => {
    const search = cfopSearch.trim().toLocaleLowerCase('pt-BR');
    const selectedCfop = item.fiscal?.cfop || '';
    const options =
      selectedCfop && !cfopOptions.some((option) => option.value === selectedCfop)
        ? [
            {
              value: selectedCfop,
              label: `${selectedCfop} — incompatível com a operação atual`,
              disabled: true,
            },
            ...cfopOptions,
          ]
        : cfopOptions;
    return search
      ? options.filter(
          (option) =>
            option.value === selectedCfop ||
            option.label.toLocaleLowerCase('pt-BR').includes(search)
        )
      : options;
  }, [cfopOptions, cfopSearch, item.fiscal?.cfop]);

  // Se o erro estiver dentro da sanfona (CFOP, CSOSN, Origem), abre automaticamente
  React.useEffect(() => {
    if (hasCfopError || hasCstError || hasOrigemError) {
      setIsExpanded(true);
    }
  }, [hasCfopError, hasCstError, hasOrigemError]);

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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                  <i className="bi bi-check-circle-fill text-[10px]" />
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
            <label
              htmlFor={`nfe-item-ncm-${itemIndex}`}
              className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
                hasNcmError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
              }`}
            >
              NCM{' '}
              <span aria-hidden="true" className="text-rose-600">
                *
              </span>
            </label>
            <span
              className={`text-[10px] ${
                hasNcmError
                  ? 'text-rose-600 font-bold dark:text-rose-400'
                  : isNcmValid
                    ? 'text-emerald-600'
                    : 'text-rose-600'
              }`}
            >
              {isNcmValid ? '8 dígitos' : 'Informe 8 dígitos'}
            </span>
            <NcmSelect
              id={`nfe-item-ncm-${itemIndex}`}
              hasError={hasNcmError}
              value={item.fiscal?.ncm || ''}
              onBlur={onUpdateFiscalBlur}
              onChange={(val) => {
                if (hasNcmError && onClearFieldError) onClearFieldError();
                onUpdateFiscal('ncm', val);
              }}
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
            <label
              htmlFor={`nfe-item-cfop-${itemIndex}`}
              className={`text-[10px] font-black uppercase tracking-wider block mb-1 ${
                hasCfopError ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'
              }`}
            >
              CFOP{' '}
              <span aria-hidden="true" className="text-rose-600">
                *
              </span>
            </label>
            <input
              type="search"
              aria-label="Buscar CFOP por código ou descrição"
              value={cfopSearch}
              onChange={(e) => setCfopSearch(e.target.value)}
              placeholder="Buscar código ou descrição"
              className="mb-1 w-full rounded-none border-0 border-b border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />
            <select
              id={`nfe-item-cfop-${itemIndex}`}
              aria-label="CFOP"
              value={item.fiscal?.cfop || ''}
              onChange={(e) => {
                if (hasCfopError && onClearFieldError) onClearFieldError();
                onUpdateFiscal('cfop', e.target.value);
              }}
              className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-none border-0 border-b-2 outline-none ${
                hasCfopError
                  ? 'border-rose-500 bg-rose-50/50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100 focus:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-500'
              }`}
            >
              <option value="">Selecione o CFOP</option>
              {visibleCfopOptions.map((cf) => (
                <option key={cf.value} value={cf.value} disabled={cf.disabled}>
                  {cf.label}
                </option>
              ))}
            </select>
            {cfopContextMessage && (
              <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                {cfopContextMessage}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor={`nfe-item-csosn-${itemIndex}`}
              className={`text-[10px] font-black uppercase tracking-wider block mb-1 ${
                hasCstError ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'
              }`}
            >
              CSOSN{' '}
              <span aria-hidden="true" className="text-rose-600">
                *
              </span>
            </label>
            <select
              id={`nfe-item-csosn-${itemIndex}`}
              aria-label="CSOSN"
              value={item.fiscal?.cst || '103'}
              onChange={(e) => {
                if (hasCstError && onClearFieldError) onClearFieldError();
                onUpdateFiscal('cst', e.target.value);
              }}
              className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-none border-0 border-b-2 outline-none ${
                hasCstError
                  ? 'border-rose-500 bg-rose-50/50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100 focus:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-500'
              }`}
              title="Editar CSOSN do item"
            >
              {CSOSN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Sem produto cadastrado: padrão 103. Com produto cadastrado: usa o CSOSN do cadastro.
            </p>
          </div>
          <div>
            <label
              htmlFor={`nfe-item-origem-${itemIndex}`}
              className={`text-[10px] font-black uppercase tracking-wider block mb-1 ${
                hasOrigemError ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'
              }`}
            >
              Origem{' '}
              <span aria-hidden="true" className="text-rose-600">
                *
              </span>
            </label>
            <select
              id={`nfe-item-origem-${itemIndex}`}
              aria-label="Origem fiscal"
              value={item.fiscal?.origem || ''}
              onChange={(e) => {
                if (hasOrigemError && onClearFieldError) onClearFieldError();
                onUpdateFiscal('origem', e.target.value);
              }}
              className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-none border-0 border-b-2 outline-none ${
                hasOrigemError
                  ? 'border-rose-500 bg-rose-50/50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100 focus:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-500'
              }`}
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
            <label
              htmlFor={`nfe-item-cest-${itemIndex}`}
              className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1"
            >
              CEST
            </label>
            <select
              id={`nfe-item-cest-${itemIndex}`}
              aria-label="CEST"
              value={item.fiscal?.cest || ''}
              onChange={(e) => onUpdateFiscal('cest', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-none border-0 border-b-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-600 dark:focus:border-blue-500"
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
