import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export interface MeasurementInputProps extends Omit<MaskedNumericInputProps, 'fractionDigits' | 'prefix' | 'suffix' | 'typingMode' | 'showBadge' | 'badgeText'> {
    unit: 'cm' | 'm' | 'mm' | 'kg' | 'g' | 'mg' | string;
    showBadge?: boolean; // LabelGrid precisa desligar isso
}

/**
 * Componente MeasurementInput (Ex: 80,5 cm | 25,4 kg)
 * Possui exata 1 casa decimal e modo de digitação Livre (Decimal).
 */
export const MeasurementInput = ({ unit, showBadge = true, ...props }: MeasurementInputProps) => {
    return (
        <MaskedNumericInput
            {...props}
            fractionDigits={1}
            suffix={` ${unit}`}
            showBadge={showBadge}
            typingMode="decimal"
        />
    );
};
