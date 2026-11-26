import React from 'react';
import Item from '../../../types/items.type';
import { calcItemTotalValue } from '../../../utils/sales/calculations';
import CurrencyInput from '../../../../components/inputs/CurrencyInput';
import CurrencyDisplay from '../../../../components/display/CurrencyDisplay';
import DiscountInput from './DiscountInput';
import { BodyRowPricing } from './useBodyRowPricing';

interface BodyRowMobilePricingSectionProps {
  item: Item;
  inItemDialog: boolean;
  isNarrowMobile: boolean;
  showQuantityBesideProduct: boolean;
  priceGridClassName: string;
  totalClassName: string;
  quantityField: React.ReactNode;
  pricing: BodyRowPricing;
  onToggleDiscountType: () => void;
}

export const BodyRowMobilePricingSection: React.FC<BodyRowMobilePricingSectionProps> = ({
  item,
  inItemDialog,
  isNarrowMobile,
  showQuantityBesideProduct,
  priceGridClassName,
  totalClassName,
  quantityField,
  pricing,
  onToggleDiscountType,
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

  return (
    <div className={inItemDialog ? 'space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800' : 'space-y-2 pt-1'}>
      <div className={`grid items-end ${priceGridClassName}`}>
        {showQuantityBesideProduct ? (
          <div className="budget-item-editor-quantity-prices">{quantityField}</div>
        ) : (
          quantityField
        )}

        <div className="w-full">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
            Preço un <span className="text-red-500">*</span>
          </label>
          <CurrencyInput
            value={tempUnitPrice}
            onChange={(val: number) => setTempUnitPrice(val)}
            onBlur={commitUnitPrice}
            className="max-[520px]:!min-w-0 max-[520px]:!px-1 max-[520px]:text-[10px]"
          />
        </div>

        <div className="w-full min-w-0">
          <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Desconto UN
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
            compactOnNarrow
          />
        </div>

        <div className={`w-full min-w-0 ${!inItemDialog && !isNarrowMobile ? 'min-[460px]:col-start-2 min-[600px]:col-start-auto' : ''}`}>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
            Preço final un
          </label>
          <CurrencyInput
            value={tempSubtotal}
            max={item.unitPrice || undefined}
            onChange={(val: number) => setTempSubtotal(val)}
            onBlur={commitSubtotal}
            className="max-[520px]:!min-w-0 max-[520px]:!px-1 max-[520px]:text-[10px]"
          />
        </div>

        {/* Total do Item */}
        <div className={`min-w-0 flex flex-col items-end justify-center px-1 min-[700px]:px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100/80 dark:border-blue-900/40 rounded-xl min-h-[44px] ${totalClassName}`}>
          <span className="text-[8px] font-black uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest">
            Total
          </span>
          <div className="whitespace-nowrap text-[10px] min-[700px]:text-xs font-black text-blue-600 dark:text-blue-400">
            <CurrencyDisplay value={calcItemTotalValue(item)} />
          </div>
        </div>
      </div>

      <div className="w-full min-w-0">
        <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Observação
        </label>
        <textarea
          rows={inItemDialog ? 2 : 1}
          value={tempObservation}
          onChange={(event) => setTempObservation(event.target.value)}
          onBlur={commitObservation}
          placeholder="Adicionar observação sobre o item..."
          className="min-h-8 w-full resize-y border-x-0 border-t-0 border-b-2 border-b-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-b-blue-500 dark:border-b-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
        />
      </div>
    </div>
  );
};
