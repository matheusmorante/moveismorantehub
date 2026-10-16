import React from 'react';
import Item from '../../../types/items.type';
import Product, { Variation } from '../../../types/product.type';
import Service from '../../../types/service.type';
import { calcItemTotalValue } from '../../../utils/calculations';
import CurrencyOrPercentInput from '../../../../components/CurrencyOrPercentInput';
import UnitInput from './UnitInput';
import CurrencyInput from '../../../../components/CurrencyInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
import ServiceAutocomplete from './ServiceAutocomplete';
import TemporaryProductWarning from './TemporaryProductWarning';
import { BodyRowPricing } from './useBodyRowPricing';
import { getSettings, AppSettings } from '@/pages/utils/settingsService';
import { isGenericHandlingLabel } from '@/pages/utils/handlingMigration';

const STOCK_ORIGIN_PRODUCT_KINDS = {
  '': ['normal', 'salvado', 'usado'],
  novo: ['normal'],
  salvado: ['salvado'],
  usado: ['usado'],
} as const;

export interface BodyRowViewProps {
  item: Item;
  idx: number;
  deliveryMethod: 'delivery' | 'pickup';
  settings?: AppSettings;
  isBudget?: boolean;
  isReturn?: boolean;
  hideHandling?: boolean;
  highlightAsTemporary?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  pricing: BodyRowPricing;
  onChange: (idx: number, key: keyof Item, value: string | number) => void;
  onBatchChange: (idx: number, changes: Partial<Item>) => void;
  onToggleDiscountType: () => void;
  onDelete: () => void;
  onSelectProduct: (idx: number, product: Product, variation?: Variation) => void;
  handleSelectService: (service: Service) => void;
  handleStockOriginChange: (rawCondition: string) => void;
  isService: boolean;
  shouldShowStockOrigin: boolean;
  shouldHideHandling: boolean;
  isLinkedProduct: boolean;
  isTemporaryProduct: boolean;
  itemHasError: boolean;
  error?: string;
  handlingError?: string | boolean;
  stockOriginError?: string | boolean;
  serviceProductLink: React.ReactNode;
}

export const BodyRowMobile: React.FC<BodyRowViewProps> = ({
  item,
  idx,
  deliveryMethod,
  settings: propSettings,
  isBudget,
  isReturn,
  shouldHideHandling,
  highlightAsTemporary,
  isExpanded = true,
  onToggleExpand,
  pricing,
  onChange,
  onDelete,
  onSelectProduct,
  handleSelectService,
  handleStockOriginChange,
  isService,
  shouldShowStockOrigin,
  isLinkedProduct,
  isTemporaryProduct,
  itemHasError,
  error,
  handlingError,
  stockOriginError,
  serviceProductLink,
}) => {
  const settings = propSettings || getSettings();
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

  // MODO COMPACTO
  if (!isExpanded) {
    return (
      <div
        onClick={onToggleExpand}
        className={`px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-2xl ${
          highlightAsTemporary
            ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/10 dark:bg-amber-950/10'
            : itemHasError
              ? 'border-red-500 ring-2 ring-red-500/10'
              : 'border-slate-200/80 dark:border-slate-800'
        } shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
              isService
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
            }`}
          >
            <i className={`bi ${isService ? 'bi-tools' : 'bi-box-seam'}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-bold truncate ${itemHasError ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}
              >
                {item.description?.trim() || (
                  <span className="text-slate-400 italic font-normal">
                    {isService ? 'Serviço sem descrição' : 'Produto sem descrição'}
                  </span>
                )}
              </span>
              {item.handlingType && !shouldHideHandling && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500">
                  {item.handlingType}
                </span>
              )}
            </div>
            {item.observation && (
              <div className="text-[10px] text-slate-400 truncate max-w-sm mt-0.5">
                {item.observation}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {item.quantity}x <CurrencyDisplay value={tempSubtotal} />
            </div>
            <div className="text-xs font-black text-blue-600 dark:text-blue-400">
              <CurrencyDisplay value={calcItemTotalValue(item)} />
            </div>
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <i className="bi bi-chevron-down text-xs transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // MODO EXPANDIDO
  return (
    <div
      className={`p-3.5 bg-white dark:bg-slate-900 border rounded-2xl ${
        highlightAsTemporary
          ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/10 dark:bg-amber-950/10'
          : itemHasError
            ? 'border-red-500 ring-2 ring-red-500/10'
            : 'border-slate-200/80 dark:border-slate-800'
      } shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative group`}
    >
      {/* Linha 1: Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold">
            #{idx + 1}
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isService
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
            }`}
          >
            {isService ? 'Serviço' : 'Produto'}
          </span>
          {isLinkedProduct && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">
              <i className="bi bi-check-circle-fill" /> Vinculado
            </span>
          )}
          {isTemporaryProduct && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/40">
              <i className="bi bi-clock-history" /> Temporário
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              title="Recolher item"
            >
              <i className="bi bi-chevron-up text-xs" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
            title="Remover item"
          >
            <i className="bi bi-trash3 text-xs" />
          </button>
        </div>
      </div>

      {/* Linha 2: Busca e Descrição */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">
          {isService ? 'Descrição do Serviço' : 'Descrição do Produto'}{' '}
          <span className="text-red-500">*</span>
        </label>
        {isService ? (
          <>
            <ServiceAutocomplete
              value={item.description}
              onChange={(val) => onChange(idx, 'description', val)}
              onSelectService={handleSelectService}
              placeholder="Digite para buscar um serviço ou adicione um novo..."
              className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500/20' : ''}
            />
            {serviceProductLink}
          </>
        ) : !item.isComboItem ? (
          <ProductAutocomplete
            value={item.description}
            onChange={(val) => onChange(idx, 'description', val)}
            onSelect={(p, v) => onSelectProduct(idx, p, v)}
            allowedProductKinds={STOCK_ORIGIN_PRODUCT_KINDS[item.condition ?? '']}
            includeDeactivated
            placeholder="Digite para buscar um produto..."
            isTemporary={isTemporaryProduct}
            inputEndAdornment={isTemporaryProduct ? <TemporaryProductWarning /> : undefined}
            isSelected={isLinkedProduct}
            className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500/20' : ''}
          />
        ) : (
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>{item.description}</span>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">
              Combo
            </span>
          </div>
        )}
        {error && (
          <span className="text-[10px] text-red-600 dark:text-red-400 font-medium ml-1">
            {error}
          </span>
        )}
      </div>

      {/* Linha 2.5: Manuseio, Origem do Estoque e Observações */}
      {!item.isComboItem && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          {!shouldHideHandling && (
            <div className="min-w-[140px] flex-1 sm:flex-initial">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                Manuseio <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Manuseio"
                className={`w-full bg-slate-50/70 dark:bg-slate-800/40 border px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                  handlingError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                }`}
                value={item.handlingType || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val || item.handlingType === val) return;
                  onChange(idx, 'handlingType', val);
                }}
              >
                <option value="" disabled className="dark:bg-slate-900">
                  Manuseio...
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
              {handlingError && (
                <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
                  {handlingError}
                </span>
              )}
            </div>
          )}

          {shouldShowStockOrigin && (
            <div className="min-w-[140px] flex-1 sm:flex-initial">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                Estoque <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full bg-slate-50/70 dark:bg-slate-800/40 border px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                  stockOriginError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                }`}
                value={item.condition ?? ''}
                onChange={(e) => handleStockOriginChange(e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="novo">Convencional</option>
                <option value="salvado">Salvados</option>
                <option value="usado">Usados</option>
              </select>
              {stockOriginError && (
                <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
                  {stockOriginError}
                </span>
              )}
            </div>
          )}

          <div className="flex-1 min-w-[200px] w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Observação
            </label>
            <input
              type="text"
              value={tempObservation}
              onChange={(e) => setTempObservation(e.target.value)}
              onBlur={commitObservation}
              placeholder="Observação sobre este item..."
              className="w-full bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* Linha 3: Grid de Valores */}
      {!item.isComboItem && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end pt-1">
          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Qtd. <span className="text-red-500">*</span>
            </label>
            <UnitInput
              value={item.quantity}
              onChange={(value: number) => onChange(idx, 'quantity', value)}
              disabled={item.isComboItem}
            />
          </div>

          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Preço Un. <span className="text-red-500">*</span>
            </label>
            <CurrencyInput
              value={tempUnitPrice}
              onChange={(val: number) => setTempUnitPrice(val)}
              onBlur={commitUnitPrice}
            />
          </div>

          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Desc. R$
            </label>
            <CurrencyInput
              value={tempDiscountValue}
              max={item.unitPrice || undefined}
              onChange={(val: number) => setTempDiscountValue(val)}
              onBlur={commitDiscountValue}
            />
          </div>

          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Desc. %
            </label>
            <CurrencyOrPercentInput
              prefix=""
              suffix=" %"
              value={tempDiscountPercent}
              max={100}
              onChange={(val: number) => setTempDiscountPercent(val)}
              onBlur={commitDiscountPercent}
            />
          </div>

          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Preço Un. Líq.
            </label>
            <CurrencyInput
              value={tempSubtotal}
              max={item.unitPrice || undefined}
              onChange={(val: number) => setTempSubtotal(val)}
              onBlur={commitSubtotal}
            />
          </div>

          {/* Total do Item */}
          <div className="w-full flex flex-col items-end justify-center px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100/80 dark:border-blue-900/40 rounded-xl min-h-[44px]">
            <span className="text-[8px] font-black uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest">
              Total
            </span>
            <div className="text-xs font-black text-blue-600 dark:text-blue-400">
              <CurrencyDisplay value={calcItemTotalValue(item)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
