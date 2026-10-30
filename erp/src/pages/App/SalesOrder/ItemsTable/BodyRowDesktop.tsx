import React from 'react';
import Item from '../../../types/items.type';
import Product, { Variation } from '../../../types/product.type';
import { calcItemTotalValue, getFixedDiscount } from '../../../utils/calculations';
import UnitInput from './UnitInput';
import CurrencyInput from '../../../../components/CurrencyInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
import TemporaryProductWarning from './TemporaryProductWarning';
import { getSettings } from '@/pages/utils/settingsService';
import { isGenericHandlingLabel } from '@/pages/utils/handlingMigration';
import { BodyRowViewProps } from './BodyRowMobile';
import DiscountInput from './DiscountInput';

const STOCK_ORIGIN_PRODUCT_KINDS = {
  '': ['normal', 'salvado', 'usado'],
  novo: ['normal'],
  salvado: ['salvado'],
  usado: ['usado'],
} as const;

export const BodyRowDesktop: React.FC<BodyRowViewProps> = ({
  item,
  idx,
  displayNumber = String(idx + 1),
  isCompositionComponent = false,
  deliveryMethod,
  settings: propSettings,
  isBudget,
  isReturn,
  hideHandling,
  shouldHideHandling,
  highlightAsTemporary,
  isExpanded = true,
  compactDesktop = false,
  autoFocusDescription = false,
  onDescriptionBlur,
  pricing,
  onChange,
  onDelete,
  onToggleExpand,
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
  const handlingOptions =
    (deliveryMethod === 'pickup'
      ? settings.pickupHandlingOptions
      : settings.deliveryHandlingOptions) || [];
  const isSelectedHandlingInOptions =
    item.handlingType && handlingOptions.some((option) => option.label === item.handlingType);
  const handlingControl = !item.isComboItem ? (
    <div className="relative group/hsel">
      <select
        aria-label="Manuseio"
        className={`w-full appearance-none border-b-2 bg-transparent px-2 py-1 text-[11px] font-bold text-slate-600 outline-none transition-colors dark:text-slate-400 ${
          handlingError
            ? 'border-red-500 focus:border-red-500'
            : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'
        }`}
        value={item.handlingType || ''}
        onChange={(event) => {
          const value = event.target.value;
          if (value && item.handlingType !== value) handleHandlingChange(value);
        }}
      >
        <option value="" disabled className="dark:bg-slate-900">Selecione</option>
        {handlingOptions.map((option) => (
          <option key={option.label} value={option.label} className="dark:bg-slate-900">
            {option.label}
          </option>
        ))}
        {item.handlingType && !isSelectedHandlingInOptions && !isGenericHandlingLabel(item.handlingType) && (
          <option value={item.handlingType} className="italic text-slate-400">
            {item.handlingType} (Atual)
          </option>
        )}
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
            onChange={(event) => onChange(idx, 'assemblyResponsible', event.target.value)}
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
  ) : null;
  const collapseButton = onToggleExpand ? (
    <button
      type="button"
      onClick={onToggleExpand}
      aria-label={`Recolher item ${displayNumber}`}
      aria-expanded={true}
      title="Recolher item"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      <i className="bi bi-chevron-up text-[10px]" aria-hidden="true" />
    </button>
  ) : null;

  if (!isExpanded && !isCompositionComponent) {
    const quantity = Number(item.quantity) || 0;
    const unitDiscount = getFixedDiscount(item);
    const totalDiscount = unitDiscount * quantity;

    return (
      <tr
        className={`group border-b border-slate-100 font-sans transition-colors dark:border-slate-800 ${
          highlightAsTemporary
            ? 'bg-amber-50/50 ring-2 ring-inset ring-amber-400/50 dark:bg-amber-950/20'
            : itemHasError
              ? 'bg-red-50/30 dark:bg-red-950/10'
              : 'bg-white hover:bg-slate-50/50 dark:bg-slate-900 dark:hover:bg-slate-800/20'
        }`}
      >
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={false}
            aria-label={`Editar item ${displayNumber}: ${item.description || (isService ? 'serviço sem descrição' : 'produto sem descrição')}`}
            className="flex min-w-0 w-full items-center gap-2 text-left"
          >
            <i className="bi bi-chevron-right shrink-0 text-[10px] text-slate-400" aria-hidden="true" />
            <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${isService ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              #{displayNumber}
            </span>
            <i className={`bi ${isService ? 'bi-tools text-amber-500' : 'bi-box-seam text-blue-600 dark:text-blue-400'}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
              {item.description || (isService ? 'Serviço sem descrição' : 'Produto sem descrição')}
            </span>
            {isLinkedProduct && <i className="bi bi-check-circle-fill shrink-0 text-[10px] text-emerald-500" aria-label="Produto vinculado" />}
            {showTemporaryProductLabel && <i className="bi bi-clock-history shrink-0 text-[10px] text-amber-500" aria-label="Produto temporário" />}
            {itemHasError && <i className="bi bi-exclamation-circle-fill shrink-0 text-[10px] text-red-500" aria-label="Pendência no item" />}
            <i className="bi bi-pencil-square shrink-0 text-[10px] text-blue-500" aria-hidden="true" />
          </button>
        </td>
        {!hideHandling && !compactDesktop && (
          <td className="px-2 py-2 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {isService ? '—' : item.handlingType || '—'}
          </td>
        )}
        <td className="px-2 py-2 text-center text-xs text-slate-600 dark:text-slate-300">
          {quantity.toLocaleString('pt-BR')} un.
        </td>
        <td className="px-2 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
          {item.isComboItem ? '—' : <CurrencyDisplay value={item.unitPrice} />}
        </td>
        <td colSpan={2} className="w-[150px] px-2 py-2 text-center text-xs text-slate-600 dark:text-slate-300">
          {item.isComboItem || totalDiscount <= 0 ? '—' : <>−<CurrencyDisplay value={totalDiscount} /></>}
        </td>
        {!compactDesktop && (
          <td className="px-2 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
            {item.isComboItem ? '—' : <CurrencyDisplay value={Math.max(0, item.unitPrice - unitDiscount)} />}
          </td>
        )}
        <td className="px-2 py-2 text-right text-xs font-bold text-slate-700 dark:text-slate-200">
          <CurrencyDisplay value={calcItemTotalValue(item)} />
        </td>
        <td className="px-2 py-2 text-center">
          {!item.isComboItem && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Remover item ${displayNumber}`}
              className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-all hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <i className="bi bi-trash text-xs" aria-hidden="true" />
            </button>
          )}
        </td>
      </tr>
    );
  }

  if (isCompositionComponent && !isExpanded) {
    return (
      <tr className="border-b border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40">
        <td colSpan={compactDesktop ? 7 : hideHandling ? 8 : 9} className="px-3 py-1.5">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={false}
            className="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="flex min-w-0 items-center gap-2">
              <i className="bi bi-chevron-right text-[10px] text-slate-400" />
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                #{displayNumber}
              </span>
              <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                <i className="bi bi-box-seam mr-1 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                {item.description}
              </span>
              <span className="shrink-0 text-[10px] text-slate-400">{item.quantity} un.</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <CurrencyDisplay value={calcItemTotalValue(item)} />
              </span>
              {itemHasError && <i aria-label="Pendência no componente" className="bi bi-exclamation-circle-fill text-red-500" />}
              <i className="bi bi-pencil-square text-xs text-blue-500" />
            </span>
          </button>
        </td>
      </tr>
    );
  }

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
          <div className="flex min-w-0 items-start gap-2">
            {collapseButton}
            <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <i className="bi bi-tools" aria-hidden="true" />
              #{displayNumber}
            </span>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                aria-label="Descrição do serviço"
              autoFocus={autoFocusDescription}
                value={item.description}
                onChange={(event) => onChange(idx, 'description', event.target.value)}
              onBlur={onDescriptionBlur}
                placeholder="Descrição do serviço..."
                className={`w-full border-x-0 border-t-0 border-b-2 rounded-none bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-b-blue-500 dark:bg-slate-800 dark:text-slate-200 ${error ? 'border-b-red-500 dark:border-b-red-500 focus:border-b-red-500 dark:focus:border-b-red-500' : 'border-b-slate-200 dark:border-b-slate-700'}`}
              />
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={tempObservation}
                  onChange={(e) => setTempObservation(e.target.value)}
                  onBlur={commitObservation}
                  placeholder="Observação..."
                  className="w-full bg-slate-50/60 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 border-b-slate-200/80 dark:border-b-slate-700/80 focus:border-b-blue-500 px-2 py-0.5 rounded-none text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              {serviceProductLink}
            </div>
          </div>
        ) : isCompositionComponent ? (
          <div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <i className="bi bi-box-seam mr-1" aria-hidden="true" />
                #{displayNumber}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {item.description}
                </span>
                <span className="text-[9px] font-medium text-slate-400">Produto fixo na composição</span>
              </div>
              <button
                type="button"
                onClick={onToggleExpand}
                aria-expanded="true"
                aria-label={`Recolher componente ${displayNumber}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <i className="bi bi-chevron-up text-[10px]" />
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {shouldShowStockOrigin && (
                <>
                  <select
                    className={`w-[110px] shrink-0 bg-slate-50/60 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 px-2 py-0.5 rounded-none text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                      stockOriginError
                        ? 'border-b-red-500 focus:border-b-red-500'
                        : 'border-b-slate-200/80 dark:border-b-slate-700/80 focus:border-b-blue-500'
                    }`}
                    value={item.condition ?? ''}
                    onChange={(event) => handleStockOriginChange(event.target.value)}
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
                onChange={(event) => setTempObservation(event.target.value)}
                onBlur={commitObservation}
                placeholder="Observação..."
                aria-label={`Observação do componente ${displayNumber}`}
                className="w-full bg-slate-50/60 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 border-b-slate-200/80 dark:border-b-slate-700/80 focus:border-b-blue-500 px-2 py-0.5 rounded-none text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            {stockOriginError && (
              <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
                {stockOriginError}
              </span>
            )}
          </div>
        ) : !item.isComboItem ? (
          <>
            <div className="mb-0.5 flex items-center gap-1">
              {collapseButton}
              <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <i className="bi bi-box-seam mr-1" aria-hidden="true" />
                #{displayNumber}
              </span>
            </div>
            <ProductAutocomplete
              value={item.description}
              onChange={(val) => onChange(idx, 'description', val)}
              onSelect={(p, v) => onSelectProduct(idx, p, v)}
              autoFocus={autoFocusDescription}
              onBlur={onDescriptionBlur}
              maxSuggestions={5}
              productsOnly
              excludeCombos
              allowedProductKinds={STOCK_ORIGIN_PRODUCT_KINDS[item.condition ?? '']}
              includeDeactivated
              placeholder="Busque ou descreva o produto... (mínimo de 3 caracteres para buscar)"
              isTemporary={showTemporaryProductLabel}
              inputEndAdornment={showTemporaryProductLabel ? <TemporaryProductWarning /> : undefined}
              isSelected={isLinkedProduct}
              className={error ? 'border-red-500 focus:border-red-500 dark:border-red-500 dark:focus:border-red-500' : ''}
            />
            <div className="mt-1 flex items-center gap-2">
              {shouldShowStockOrigin && (
                <>
                  <select
                    className={`w-[110px] shrink-0 bg-slate-50/60 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 px-2 py-0.5 rounded-none text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
                      stockOriginError
                        ? 'border-b-red-500 focus:border-b-red-500'
                        : 'border-b-slate-200/80 dark:border-b-slate-700/80 focus:border-b-blue-500'
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
                className="w-full bg-slate-50/60 dark:bg-slate-800/40 border-x-0 border-t-0 border-b-2 border-b-slate-200/80 dark:border-b-slate-700/80 focus:border-b-blue-500 px-2 py-0.5 rounded-none text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
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
            {collapseButton}
            <i className="bi bi-arrow-return-right text-slate-300" />
            <span className="text-xs italic text-slate-500 dark:text-slate-400">
              {item.description}
            </span>
          </div>
        )}
        {compactDesktop && !shouldHideHandling && !item.isComboItem && (
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-slate-400">Manuseio</span>
            <div className="min-w-0 w-full max-w-[260px]">{handlingControl}</div>
          </div>
        )}
        {error && (
          <div className="absolute left-4 -top-8 hidden group-hover/desc:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap font-sans">
            {error}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
          </div>
        )}
      </td>
      {!compactDesktop && !shouldHideHandling && (
        <td className="px-2 py-1.5 w-[140px]">
          {handlingControl}
        </td>
      )}
      {!compactDesktop && isService && !hideHandling && !isBudget && !isReturn && (
        <td className="px-2 py-1.5 w-[140px] text-center text-xs text-slate-300 dark:text-slate-700">
          -
        </td>
      )}
      <td className="px-2 py-1.5 w-[105px]">
        <UnitInput
          value={item.quantity}
          onChange={(value: number) => onChange(idx, 'quantity', value)}
          disabled={item.isComboItem || isCompositionComponent}
        />
      </td>
      <td className="px-2 py-1.5 w-[110px]">
        {!item.isComboItem ? (
          <CurrencyInput
            value={tempUnitPrice}
            onChange={(val: number) => setTempUnitPrice(val)}
            onBlur={commitUnitPrice}
          />
        ) : (
          <div className="text-right text-xs font-bold text-slate-400">-</div>
        )}
      </td>
      <td colSpan={2} className="w-[150px] px-2 py-1.5">
        {!item.isComboItem ? (
          <>
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
            {compactDesktop && (
              <div className="mt-2">
                <label className="mb-1 ml-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Preço final unitário
                </label>
                <CurrencyInput
                  value={tempSubtotal}
                  max={item.unitPrice || undefined}
                  onChange={(value: number) => setTempSubtotal(value)}
                  onBlur={commitSubtotal}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-right text-xs font-bold text-slate-400">-</div>
        )}
      </td>
      {!compactDesktop && (
      <td className="px-2 py-1.5 w-[110px]">
        {!item.isComboItem ? (
          <CurrencyInput
            value={tempSubtotal}
            max={item.unitPrice || undefined}
            onChange={(val: number) => setTempSubtotal(val)}
            onBlur={commitSubtotal}
          />
        ) : (
          <div className="text-right text-xs font-bold text-slate-400">-</div>
        )}
      </td>
      )}
      <td className="px-2 py-1.5 w-[105px] text-right">
        <div className="font-bold text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
          <CurrencyDisplay value={calcItemTotalValue(item)} />
        </div>
      </td>
      <td className="px-2 py-1.5 w-[50px] text-center">
        {!item.isComboItem && !isCompositionComponent && (
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
