import React from 'react';
import Item from '../../../types/items.type';
import Product, { Variation } from '../../../types/product.type';
import { calcItemTotalValue } from '../../../utils/calculations';
import UnitInput from './UnitInput';
import CurrencyInput from '../../../../components/CurrencyInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
import TemporaryProductWarning from './TemporaryProductWarning';
import { BodyRowPricing } from './useBodyRowPricing';
import { getSettings, AppSettings } from '@/pages/utils/settingsService';
import { isGenericHandlingLabel } from '@/pages/utils/handlingMigration';
import DiscountInput from './DiscountInput';

const STOCK_ORIGIN_PRODUCT_KINDS = {
  '': ['normal', 'salvado', 'usado'],
  novo: ['normal'],
  salvado: ['salvado'],
  usado: ['usado'],
} as const;

export interface BodyRowViewProps {
  item: Item;
  idx: number;
  displayNumber?: string;
  isCompositionComponent?: boolean;
  deliveryMethod: 'delivery' | 'pickup';
  settings?: AppSettings;
  isBudget?: boolean;
  isReturn?: boolean;
  hideHandling?: boolean;
  highlightAsTemporary?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  autoFocusDescription?: boolean;
  onAutoExpand?: () => void;
  onDescriptionBlur?: () => void;
  pricing: BodyRowPricing;
  onChange: (idx: number, key: keyof Item, value: string | number) => void;
  onBatchChange: (idx: number, changes: Partial<Item>) => void;
  onToggleDiscountType: () => void;
  onDelete: () => void;
  onSelectProduct: (idx: number, product: Product, variation?: Variation) => void;
  handleStockOriginChange: (rawCondition: string) => void;
  handleHandlingChange: (handlingType: string) => void;
  isService: boolean;
  shouldShowStockOrigin: boolean;
  shouldHideHandling: boolean;
  isLinkedProduct: boolean;
  showTemporaryProductLabel: boolean;
  itemHasError: boolean;
  error?: string;
  handlingError?: string | boolean;
  assemblyResponsibleRequired: boolean;
  assemblyResponsibleError?: string;
  stockOriginError?: string | boolean;
  serviceProductLink: React.ReactNode;
}

export const BodyRowMobile: React.FC<BodyRowViewProps> = ({
  item,
  idx,
  displayNumber = String(idx + 1),
  isCompositionComponent = false,
  deliveryMethod,
  settings: propSettings,
  isBudget,
  isReturn,
  shouldHideHandling,
  highlightAsTemporary,
  isExpanded = true,
  onToggleExpand,
  autoFocusDescription = false,
  onAutoExpand,
  onDescriptionBlur,
  pricing,
  onChange,
  onDelete,
  onToggleDiscountType,
  onSelectProduct,
  handleStockOriginChange,
  handleHandlingChange,
  isService,
  shouldShowStockOrigin,
  isLinkedProduct,
  showTemporaryProductLabel,
  itemHasError,
  error,
  handlingError,
  assemblyResponsibleRequired,
  assemblyResponsibleError,
  stockOriginError,
  serviceProductLink,
}) => {
  const settings = propSettings || getSettings();
  const autoExpandPending = React.useRef(
    !isCompositionComponent && !item.compositionGroup && !item.description?.trim()
  );
  const handleDescriptionBlur = (description: string) => {
    onDescriptionBlur?.();
    if (!autoExpandPending.current || !description.trim()) return;
    autoExpandPending.current = false;
    onAutoExpand?.();
  };
  const handleProductSelect = (product: Product, variation?: Variation) => {
    const shouldAutoExpand = autoExpandPending.current;
    autoExpandPending.current = false;
    onDescriptionBlur?.();
    onSelectProduct(idx, product, variation);
    if (shouldAutoExpand) onAutoExpand?.();
  };

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
    const hasDescription = Boolean(item.description?.trim());
    const canExpand = hasDescription || isCompositionComponent || item.isComboItem;

    return (
      <div
        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 border-b transition-colors last:border-b-0 group ${
          highlightAsTemporary
            ? 'border-b-amber-400 bg-amber-50/20 dark:border-b-amber-500 dark:bg-amber-950/10'
            : itemHasError
              ? 'border-b-red-400 bg-white dark:border-b-red-500 dark:bg-slate-900'
              : 'border-b-slate-200/80 bg-white dark:border-b-slate-800 dark:bg-slate-900'}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className={`flex h-7 min-w-7 shrink-0 items-center justify-center gap-1 rounded-xl px-1.5 text-[9px] font-bold ${isService ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
            <i className={`bi ${isService ? 'bi-tools' : 'bi-box-seam'} text-xs`} aria-hidden="true" />
            {displayNumber}
          </span>

          <div className="min-w-0 flex-1">
            {isCompositionComponent ? (
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {item.description}
              </div>
            ) : isService ? (
              <input
                type="text"
                aria-label="Descrição do serviço"
                autoFocus={autoFocusDescription}
                value={item.description}
                onChange={(event) => onChange(idx, 'description', event.target.value)}
                onBlur={(event) => handleDescriptionBlur(event.currentTarget.value)}
                placeholder="Descrição do serviço..."
                className="w-full border-x-0 border-t-0 border-b-2 border-b-slate-200 bg-transparent px-1 py-1 text-xs font-semibold text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-b-blue-500 dark:border-b-slate-700 dark:text-slate-100 dark:focus:border-b-blue-500"
              />
            ) : !item.isComboItem ? (
              <ProductAutocomplete
                value={item.description}
                onChange={(value) => onChange(idx, 'description', value)}
                onSelect={handleProductSelect}
                onBlur={(event) => handleDescriptionBlur(event.currentTarget.value)}
                autoFocus={autoFocusDescription}
                preventBlurOnSelect
                inputAriaLabel="Descrição do produto"
                allowedProductKinds={STOCK_ORIGIN_PRODUCT_KINDS[item.condition ?? '']}
                includeDeactivated
                placeholder="Busque ou descreva o produto... (mínimo de 3 caracteres para buscar)"
                maxSuggestions={5}
                productsOnly
                excludeCombos
                isTemporary={showTemporaryProductLabel}
                inputEndAdornment={showTemporaryProductLabel ? <TemporaryProductWarning /> : undefined}
                isSelected={isLinkedProduct}
                className={error ? 'border-red-500 focus:border-red-500 dark:border-red-500 dark:focus:border-red-500' : 'w-full'}
                inputClassName="w-full border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-b-blue-500 dark:text-slate-100"
              />
            ) : (
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {item.description}
              </div>
            )}

            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
              {isCompositionComponent && (
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Componente {Number(item.compositionGroup?.componentIndex ?? 0) + 1}/{item.compositionGroup?.componentCount}
                </span>
              )}
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
            {itemHasError && <span className="mt-0.5 block text-[9px] font-bold text-red-600 dark:text-red-400">Pendência no item</span>}
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
            aria-label={`${canExpand ? 'Expandir' : 'Aguarde a descrição para expandir'} item ${displayNumber}`}
            aria-expanded={false}
            disabled={!canExpand}
            onClick={onToggleExpand}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${canExpand ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300' : 'cursor-not-allowed text-slate-300 dark:text-slate-700'}`}
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
      className={`relative flex flex-col gap-3 border-b-2 p-3.5 transition-colors last:border-b-0 group ${
        highlightAsTemporary
          ? 'border-b-amber-400 bg-amber-50/30 dark:border-b-amber-500 dark:bg-amber-950/10'
          : itemHasError
            ? 'border-b-red-400 bg-red-50/30 dark:border-b-red-500 dark:bg-red-950/10'
            : 'border-b-blue-200 bg-blue-50/50 dark:border-b-blue-900/60 dark:bg-blue-950/20'}`}
    >
      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-500" />
      {/* Linha 1: Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-lg bg-slate-100 px-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            #{displayNumber}
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isService
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
            }`}
          >
            <i className={`bi ${isService ? 'bi-tools' : 'bi-box-seam'} mr-1`} aria-hidden="true" />
            {isService ? 'Serviço' : isCompositionComponent ? `Componente ${Number(item.compositionGroup?.componentIndex ?? 0) + 1}/${item.compositionGroup?.componentCount}` : 'Produto'}
          </span>
          {isLinkedProduct && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">
              <i className="bi bi-check-circle-fill" /> Vinculado
            </span>
          )}
          {showTemporaryProductLabel && (
            <span className="inline-flex max-w-full flex-wrap items-center gap-1 text-[9px] leading-tight font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/40">
              <i className="bi bi-clock-history" /> Temporário — Pendente de conciliação
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
          {!isCompositionComponent && (
            <button
              type="button"
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              title="Remover item"
            >
              <i className="bi bi-trash3 text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Linha 2: Busca e Descrição */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">
          {isService ? 'Descrição do Serviço' : 'Busque ou descreva o produto'}{' '}
          <span className="text-red-500">*</span>
        </label>
        {isService ? (
          <>
            <input
              type="text"
              aria-label="Descrição do serviço"
              autoFocus={autoFocusDescription}
              value={item.description}
              onChange={(event) => onChange(idx, 'description', event.target.value)}
              onBlur={(event) => handleDescriptionBlur(event.currentTarget.value)}
              placeholder="Digite a descrição do serviço..."
              className={`w-full border-x-0 border-t-0 border-b-2 rounded-none bg-slate-50/70 px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-b-blue-500 dark:bg-slate-800/40 dark:text-slate-200 ${error ? 'border-b-red-500 dark:border-b-red-500 focus:border-b-red-500 dark:focus:border-b-red-500' : 'border-b-slate-200 dark:border-b-slate-700'}`}
            />
            {serviceProductLink}
          </>
        ) : isCompositionComponent ? (
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-200">
            <span>{item.description}</span>
            <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
              Produto fixo na composição
            </span>
          </div>
        ) : !item.isComboItem ? (
          <ProductAutocomplete
            value={item.description}
            onChange={(val) => onChange(idx, 'description', val)}
            onSelect={handleProductSelect}
            onBlur={(event) => handleDescriptionBlur(event.currentTarget.value)}
            allowedProductKinds={STOCK_ORIGIN_PRODUCT_KINDS[item.condition ?? '']}
            includeDeactivated
            placeholder="Busque ou descreva o produto... (mínimo de 3 caracteres para buscar)"
            maxSuggestions={5}
            productsOnly
            excludeCombos
            isTemporary={showTemporaryProductLabel}
            inputEndAdornment={showTemporaryProductLabel ? <TemporaryProductWarning /> : undefined}
            isSelected={isLinkedProduct}
            className={error ? 'border-red-500 focus:border-red-500 dark:border-red-500 dark:focus:border-red-500' : ''}
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
                className={`w-full bg-slate-50/70 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 px-3 py-1.5 rounded-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                  handlingError
                    ? 'border-b-red-500 focus:border-b-red-500'
                    : 'border-b-slate-200 dark:border-b-slate-700 focus:border-b-blue-500'
                }`}
                value={item.handlingType || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val || item.handlingType === val) return;
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
              {handlingError && (
                <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
                  {handlingError}
                </span>
              )}
            </div>
          )}

          {assemblyResponsibleRequired && (
            <div className="min-w-[180px] flex-1 sm:flex-initial">
              <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Responsável pela montagem <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Responsável pela montagem"
                aria-required="true"
                aria-invalid={Boolean(assemblyResponsibleError)}
                required
                className={`w-full border-x-0 border-t-0 border-b-2 rounded-none bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all dark:bg-slate-800/40 dark:text-slate-200 ${
                  assemblyResponsibleError
                    ? 'border-b-red-500 focus:border-b-red-500'
                    : 'border-b-slate-200 focus:border-b-blue-500 dark:border-b-slate-700'
                }`}
                value={item.assemblyResponsible || ''}
                onChange={(e) => onChange(idx, 'assemblyResponsible', e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="Nossa equipe">Nossa equipe</option>
                <option value="Montador terceirizado">Montador terceirizado</option>
              </select>
              {assemblyResponsibleError && (
                <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
                  {assemblyResponsibleError}
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
                className={`w-full bg-slate-50/70 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 px-3 py-1.5 rounded-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                  stockOriginError
                    ? 'border-b-red-500 focus:border-b-red-500'
                    : 'border-b-slate-200 dark:border-b-slate-700 focus:border-b-blue-500'
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

        </div>
      )}

      {/* Linha 3: Grid de Valores */}
      {!item.isComboItem && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 items-end gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Quantidade <span className="text-red-500">*</span>
            </label>
            <UnitInput
              value={item.quantity}
              onChange={(value: number) => onChange(idx, 'quantity', value)}
              disabled={item.isComboItem || isCompositionComponent}
            />
          </div>

          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Preço unitário <span className="text-red-500">*</span>
            </label>
            <CurrencyInput
              value={tempUnitPrice}
              onChange={(val: number) => setTempUnitPrice(val)}
              onBlur={commitUnitPrice}
            />
          </div>

          <div className="w-full min-w-0">
            <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Desconto
            </label>
            <DiscountInput
              discountType={item.discountType}
              fixedValue={tempDiscountValue}
              percentageValue={tempDiscountPercent}
              unitPrice={item.unitPrice}
              onFixedValueChange={setTempDiscountValue}
              onPercentageValueChange={setTempDiscountPercent}
              onFixedBlur={commitDiscountValue}
              onPercentageBlur={commitDiscountPercent}
              onToggleType={onToggleDiscountType}
            />
          </div>

          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
              Preço final unitário
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
          <div className="w-full">
            <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Observação
            </label>
            <textarea
              rows={1}
              value={tempObservation}
              onChange={(event) => setTempObservation(event.target.value)}
              onBlur={commitObservation}
              placeholder="Adicionar observação sobre o item..."
              className="min-h-8 w-full resize-y border-x-0 border-t-0 border-b-2 border-b-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-b-blue-500 dark:border-b-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
};
