import React from 'react';

interface PriceLabelDigitSliderProps {
  label: string;
  value: number;
  ariaLabel: string;
  ariaInvalid: boolean;
  ariaDescribedBy?: string;
  accentColorClass?: string;
  labelSizeClass?: string;
  onChange: (digit: number) => void;
}

export const PriceLabelDigitSlider: React.FC<PriceLabelDigitSliderProps> = ({
  label,
  value,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  accentColorClass = 'accent-purple-600',
  labelSizeClass = 'text-[10px]',
  onChange,
}) => {
  return (
    <div>
      <span className={`${labelSizeClass} font-bold text-slate-400`}>
        {label}: {value}
      </span>
      <input
        type="range"
        min="0"
        max="9"
        value={value}
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
        step="1"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`w-full ${accentColorClass} cursor-pointer`}
      />
    </div>
  );
};
