import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export type DistanceInputProps = Omit<MaskedNumericInputProps, 'fractionDigits' | 'prefix' | 'suffix' | 'typingMode'>;

export function DistanceInput(props: DistanceInputProps) {
    return (
        <MaskedNumericInput
            {...props}
            fractionDigits={1}
            suffix=" km"
            typingMode="rtl" // Restaurado ao requisito original de quilometragem RTL
        />
    );
}
