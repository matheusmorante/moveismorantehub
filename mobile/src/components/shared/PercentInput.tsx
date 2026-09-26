import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export type PercentInputProps = Omit<MaskedNumericInputProps, 'fractionDigits' | 'prefix' | 'suffix'>;

export function PercentInput(props: PercentInputProps) {
    return (
        <MaskedNumericInput
            {...props}
            fractionDigits={2}
            suffix="%"
        />
    );
}
