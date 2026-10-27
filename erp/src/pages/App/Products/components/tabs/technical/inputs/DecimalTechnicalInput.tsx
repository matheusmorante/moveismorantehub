import React from 'react';
import { MaskedNumericInput } from '@/components/MaskedNumericInput';

export function formatDecimal(value: any, decimalPlaces: 1 | 2 | 3): string {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(decimalPlaces).replace('.', ',') : '';
}

export interface DecimalTechnicalInputProps {
  value: any;
  decimalPlaces: 1 | 2 | 3;
  disabled?: boolean;
  preventClearing?: boolean;
  onChange: (value: any) => void;
  className?: string;
  placeholder?: string;
  testID?: string;
}

export const DecimalTechnicalInput: React.FC<DecimalTechnicalInputProps> = ({
  value,
  decimalPlaces,
  disabled,
  preventClearing = false,
  onChange,
  className,
  placeholder,
  testID,
}) => {
  return (
    <MaskedNumericInput
      value={value}
      fractionDigits={decimalPlaces}
      typingMode="rtl"
      disabled={disabled}
      preventClearing={preventClearing}
      showBadge={false}
      placeholder={placeholder ?? formatDecimal(0, decimalPlaces)}
      testID={testID}
      className={
        className ||
        'w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal'
      }
      onChangeValue={(val) => {
        onChange(val !== null && val !== undefined ? val : '');
      }}
    />
  );
};
