import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export interface MeasurementInputProps
  extends Omit<
    MaskedNumericInputProps,
    'fractionDigits' | 'prefix' | 'suffix' | 'typingMode' | 'badgeText'
  > {
  unit?: 'cm' | 'm' | 'mm' | 'kg' | 'g' | 'mg' | string;
  showBadge?: boolean;
  fractionDigits?: number;
  typingMode?: 'rtl' | 'decimal';
}

/**
 * Componente MeasurementInput (Ex: 80,50 cm | 25,4 kg)
 * Dimensões (cm, m, mm) possuem 2 casas decimais e modo RTL por padrão.
 * Peso (kg, g, mg) possui 1 casa decimal e modo RTL por padrão.
 */
export const MeasurementInput = ({
  unit = 'cm',
  showBadge = true,
  fractionDigits,
  typingMode = 'rtl',
  ...props
}: MeasurementInputProps) => {
  const isWeightUnit = ['kg', 'g', 'mg'].includes(unit.toLowerCase().trim());
  const effectiveFractionDigits = fractionDigits ?? (isWeightUnit ? 1 : 2);

  return (
    <MaskedNumericInput
      {...props}
      fractionDigits={effectiveFractionDigits}
      suffix={unit ? ` ${unit}` : ''}
      badgeText={unit ? unit.trim() : undefined}
      showBadge={showBadge}
      typingMode={typingMode}
    />
  );
};
