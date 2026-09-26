import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export interface MeasurementInputProps extends Omit<MaskedNumericInputProps, 'fractionDigits' | 'prefix' | 'suffix' | 'typingMode'> {
    unit: 'cm' | 'm' | 'mm' | 'kg' | 'g' | 'mg' | string;
}

export function MeasurementInput({ unit, ...props }: MeasurementInputProps) {
    return (
        <MaskedNumericInput
            {...props}
            fractionDigits={1}
            suffix={` ${unit}`}
            typingMode="decimal" // Garante edição livre de medidas (12 -> 12,0)
        />
    );
}
