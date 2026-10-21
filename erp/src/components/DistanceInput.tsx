import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export type DistanceInputProps = Omit<
  MaskedNumericInputProps,
  'fractionDigits' | 'prefix' | 'suffix' | 'typingMode' | 'badgeText'
> & {
  suffix?: string;
  showBadge?: boolean;
};

/**
 * Componente DistanceInput (Ex: 12,3 km)
 * Possui exata 1 casa decimal. RTL TypingMode (empurrando para a esquerda).
 */
export const DistanceInput = ({
  suffix = ' km',
  showBadge = true,
  ...props
}: DistanceInputProps) => {
  return (
    <MaskedNumericInput
      {...props}
      fractionDigits={1}
      suffix={suffix}
      badgeText={suffix.trim()}
      showBadge={showBadge}
      typingMode="rtl"
    />
  );
};
