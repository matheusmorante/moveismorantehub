import React from 'react';
import CurrencyOrPercentInput from '../../../../components/inputs/CurrencyOrPercentInput';
import type Item from '../../../types/items.type';

interface DiscountInputProps {
  discountType: Item['discountType'];
  fixedValue: number;
  percentageValue: number;
  unitPrice: number;
  onFixedValueChange: (value: number) => void;
  onPercentageValueChange: (value: number) => void;
  onFixedBlur: () => void;
  onPercentageBlur: () => void;
  onToggleType: () => void;
  compactOnNarrow?: boolean;
}

const DiscountInput: React.FC<DiscountInputProps> = ({
  discountType,
  fixedValue,
  percentageValue,
  unitPrice,
  onFixedValueChange,
  onPercentageValueChange,
  onFixedBlur,
  onPercentageBlur,
  onToggleType,
  compactOnNarrow = false,
}) => (
  <div className="flex min-w-0 items-center border-b-2 border-slate-200 bg-transparent transition-colors focus-within:border-blue-600 dark:border-slate-700 dark:focus-within:border-blue-500">
    <div className="min-w-0 flex-1">
      <CurrencyOrPercentInput
        value={discountType === 'fixed' ? fixedValue : percentageValue}
        onChange={discountType === 'fixed' ? onFixedValueChange : onPercentageValueChange}
        prefix=""
        suffix=""
        max={discountType === 'fixed' ? unitPrice : 100}
        onBlur={discountType === 'fixed' ? onFixedBlur : onPercentageBlur}
        showBadge={false}
        className={`w-full min-w-[50px] border-0 bg-transparent px-2.5 py-2 text-right text-xs font-bold text-slate-800 outline-none focus:ring-0 dark:text-slate-100 ${compactOnNarrow ? 'max-[520px]:!min-w-0 max-[520px]:!px-1 max-[520px]:text-[10px]' : ''}`}
      />
    </div>
    <div role="group" aria-label="Unidade do desconto unitário" className="flex shrink-0 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
      <button
        type="button"
        aria-label="Desconto unitário em reais"
        aria-pressed={discountType === 'fixed'}
        onClick={() => discountType !== 'fixed' && onToggleType()}
        className={`rounded px-1.5 py-1 text-[10px] font-bold transition-colors ${compactOnNarrow ? 'max-[520px]:!px-0.5 max-[520px]:text-[9px]' : ''} ${discountType === 'fixed' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
      >
        R$
      </button>
      <button
        type="button"
        aria-label="Desconto unitário em porcentagem"
        aria-pressed={discountType === 'percentage'}
        onClick={() => discountType !== 'percentage' && onToggleType()}
        className={`rounded px-1.5 py-1 text-[10px] font-bold transition-colors ${compactOnNarrow ? 'max-[520px]:!px-0.5 max-[520px]:text-[9px]' : ''} ${discountType === 'percentage' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
      >
        %
      </button>
    </div>
  </div>
);

export default DiscountInput;
