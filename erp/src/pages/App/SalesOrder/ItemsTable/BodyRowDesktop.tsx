import React from 'react';
import Item from '../../../types/items.type';
import Product, { Variation } from '../../../types/product.type';
import { calcItemTotalValue } from '../../../utils/calculations';
import CurrencyOrPercentInput from '../../../../components/CurrencyOrPercentInput';
import UnitInput from './UnitInput';
import CurrencyInput from '../../../../components/CurrencyInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
import TemporaryProductWarning from './TemporaryProductWarning';
import { getSettings } from '@/pages/utils/settingsService';
import { isGenericHandlingLabel } from '@/pages/utils/handlingMigration';
import { BodyRowViewProps } from './BodyRowMobile';

const STOCK_ORIGIN_PRODUCT_KINDS = {
  '': ['normal', 'salvado', 'usado'],
  novo: ['normal'],
  salvado: ['salvado'],
  usado: ['usado'],
} as const;

export const BodyRowDesktop: React.FC<BodyRowViewProps> = ({
  item,
  idx,
  deliveryMethod,
  settings: propSettings,
  isBudget,
  isReturn,
  hideHandling,
  shouldHideHandling,
  highlightAsTemporary,
  pricing,
  onChange,
  onDelete,
  onSelectProduct,
  handleStockOriginChange,
  handleHandlingChange,
  isService,
  shouldShowStockOrigin,
  isLinkedProduct,
  showTemporaryProductLabel,
  error,
  handlingError,
  assemblyResponsibleRequired,
  assemblyResponsibleError,
  stockOriginError,
  serviceProductLink,
}) => {
  const {
    tempUnitPrice,
    setTempUnitPrice,
    commitUnitPrice,
    tempDiscountValue,
    setTempDiscountValue,
    commitDiscountValue,
    tempDiscountPercent,
    setTempDiscountPercent,
    commitDiscountPercent,
    tempSubtotal,
    setTempSubtotal,
    commitSubtotal,
    tempObservation,
    setTempObservation,
    commitObservation,
  } = pricing;

  const settings = propSettings || getSettings();

  return (
    <tr
      className={`group transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 font-sans ${
        highlightAsTemporary
          ? 'bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-inset ring-amber-400/50'
          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
      }`}
    >
      <td className="px-3 py-1.5 relative group/desc">
        {isService ? (
          <>
            <input
              type="text"
              aria-label="Descrição do serviço"
              value={item.description}
              onChange={(event) => onChange(idx, 'description', event.target.value)}
              placeholder="Descrição do serviço..."
              className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${error ? 'border-red-500 ring-2 ring-red-500' : 'border-slate-200'}`}
            />
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={tempObservation}
                onChange={(e) => setTempObservation(e.target.value)}
                onBlur={commitObservation}
                placeholder="Observação..."
                className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            {serviceProductLink}
          </>
        ) : !item.isComboItem ? (
          <>
            <ProductAutocomplete
              value={item.description}
              onChange={(val) => onChange(idx, 'description', val)}
              onSelect={(p, v) => onSelectProduct(idx, p, v)}
              allowedProductKinds={STOCK_ORIGIN_PRODUCT_KINDS[item.condition ?? '']}
              includeDeactivated
              placeholder="Busque ou digite um produto..."
              isTemporary={showTemporaryProductLabel}
              inputEndAdornment={showTemporaryProductLabel ? <TemporaryProductWarning /> : undefined}
              isSelected={isLinkedProduct}
              className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500' : ''}
            />
            <div className="mt-1 flex items-center gap-2">
              {shouldShowStockOrigin && (
                <>
                  <select
                    className={`w-[110px] shrink-0 bg-slate-50/60 dark:bg-slate-800/40 border px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                      stockOriginError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500'
                    }`}
                    value={item.condition ?? ''}
                    onChange={(e) => handleStockOriginChange(e.target.value)}
                    title="Origem do estoque"
                    aria-label="Origem do estoque (obrigatória)"
                    aria-required="true"
                    aria-invalid={Boolean(stockOriginError)}
                  >
                    <option value="">Selecione</option>
                    <option value="novo">Convencional</option>
                    <option value="salvado">Salvados</option>
                    <option value="usado">Usados</option>
                  </select>
                  <span className="text-[10px] font-black text-red-500" aria-hidden="true">
                    *
                  </span>
                </>
              )}
              <input
                type="text"
                value={tempObservation}
                onChange={(e) => setTempObservation(e.target.value)}
                onBlur={commitObservation}
                placeholder="Observação (ex: salvados, peça do mostruário com avaria)..."
                className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            {stockOriginError && (
              <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
                {stockOriginError}
              </span>
            )}
            {isLinkedProduct && (
              <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                <i className="bi bi-check-circle-fill text-emerald-500 text-[10px]" />
                <span>Produto vinculado ao catálogo</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 pl-3">
            <i className="bi bi-arrow-return-right text-slate-300" />
            <span className="text-xs italic text-slate-500 dark:text-slate-400">
              {item.description}
            </span>
          </div>
        )}
        {error && (
          <div className="absolute left-4 -top-8 hidden group-hover/desc:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap font-sans">
            {error}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
          </div>
        )}
      </td>
      {!shouldHideHandling && (
        <td className="px-2 py-1.5 w-[140px]">
          {!item.isComboItem && (
            <div className="relative group/hsel">
              <select
                aria-label="Manuseio"
                className={`w-full appearance-none border-b-2 bg-transparent px-2 py-1 text-[11px] font-bold text-slate-600 outline-none transition-colors dark:text-slate-400 ${
                  handlingError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'
                }`}
                value={item.handlingType || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (item.handlingType === val) return;
                  handleHandlingChange(val);
                }}
              >
                <option value="" disabled className="dark:bg-slate-900">
                  Selecione
                </option>
                {(() => {
                  const options =
                    deliveryMethod === 'pickup'
                      ? settings.pickupHandlingOptions || []
                      : settings.deliveryHandlingOptions || [];
                  const isSelectedInOptions =
                    item.handlingType && options.some((o) => o.label === item.handlingType);

                  return (
                    <>
                      {options.map((opt) => (
                        <option key={opt.label} value={opt.label} className="dark:bg-slate-900">
                          {opt.label}
                        </option>
                      ))}
                      {item.handlingType &&
                        !isSelectedInOptions &&
                        !isGenericHandlingLabel(item.handlingType) && (
                          <option value={item.handlingType} className="italic text-slate-400">
                            {item.handlingType} (Atual)
                          </option>
                        )}
                    </>
                  );
                })()}
              </select>
              {assemblyResponsibleRequired && (
                <div className="mt-2">
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Responsável pela montagem <span className="text-red-500">*</span>
                  </label>
                  <select
                    aria-label="Responsável pela montagem"
                    aria-required="true"
                    aria-invalid={Boolean(assemblyResponsibleError)}
                    required
                    className={`w-full appearance-none border-b-2 bg-transparent px-2 py-1 text-[10px] font-bold outline-none transition-colors dark:text-slate-300 ${
                      assemblyResponsibleError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'
                    }`}
                    value={item.assemblyResponsible || ''}
                    onChange={(e) => onChange(idx, 'assemblyResponsible', e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="Nossa equipe">Nossa equipe</option>
                    <option value="Montador terceirizado">Montador terceirizado</option>
                  </select>
                  {assemblyResponsibleError && (
                    <span className="mt-1 block text-[9px] text-red-600 dark:text-red-400">
                      {assemblyResponsibleError}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </td>
      )}
      {isService && !hideHandling && !isBudget && !isReturn && (
        <td className="px-2 py-1.5 w-[140px] text-center text-xs text-slate-300 dark:text-slate-700">
          -
        </td>
      )}
      <td className="px-2 py-1.5 w-[80px]">
        <UnitInput
          value={item.quantity}
          onChange={(value: number) => onChange(idx, 'quantity', value)}
          disabled={item.isComboItem}
        />
      </td>
      <td className="px-2 py-1.5 w-[110px]">
        {!item.isComboItem ? (
          <CurrencyInput
            value={tempUnitPrice}
            onChange={(val: number) => setTempUnitPrice(val)}
            onBlur={commitUnitPrice}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
          />
        ) : (
          <div className="text-right text-xs font-bold text-slate-400">-</div>
        )}
      </td>
      <td className="px-2 py-1.5 w-[100px]">
        {!item.isComboItem ? (
          <CurrencyInput
            value={tempDiscountValue}
            max={item.unitPrice || undefined}
            onChange={(val: number) => setTempDiscountValue(val)}
            onBlur={commitDiscountValue}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
          />
        ) : (
          <div className="text-right text-xs font-bold text-slate-400">-</div>
        )}
      </td>
      <td className="px-2 py-1.5 w-[85px]">
        {!item.isComboItem ? (
          <CurrencyOrPercentInput
            prefix=""
            suffix=" %"
            value={tempDiscountPercent}
            max={100}
            onChange={(val: number) => setTempDiscountPercent(val)}
            onBlur={commitDiscountPercent}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
          />
        ) : (
          <div className="text-right text-xs font-bold text-slate-400">-</div>
        )}
      </td>
      <td className="px-2 py-1.5 w-[110px]">
        {!item.isComboItem ? (
          <CurrencyInput
            value={tempSubtotal}
            max={item.unitPrice || undefined}
            onChange={(val: number) => setTempSubtotal(val)}
            onBlur={commitSubtotal}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
          />
        ) : (
          <div className="text-right text-xs font-bold text-slate-400">-</div>
        )}
      </td>
      <td className="px-2 py-1.5 w-[105px] text-right">
        <div className="font-bold text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
          <CurrencyDisplay value={calcItemTotalValue(item)} />
        </div>
      </td>
      <td className="px-2 py-1.5 w-[50px] text-center">
        {!item.isComboItem && (
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 mx-auto flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Excluir item"
          >
            <i className="bi bi-trash text-xs" />
          </button>
        )}
      </td>
    </tr>
  );
};
