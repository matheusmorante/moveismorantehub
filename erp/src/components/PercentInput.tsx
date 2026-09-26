import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export type PercentInputProps = Omit<MaskedNumericInputProps, 'fractionDigits' | 'prefix' | 'suffix' | 'showBadge' | 'badgeText'>;

/**
 * Componente PercentInput (Ex: 12,34%)
 * Possui exatas 2 casas decimais.
 */
export const PercentInput = (props: PercentInputProps) => {
    return (
        <MaskedNumericInput
            {...props}
            fractionDigits={2}
            suffix="%"
            showBadge={true}
        />
    );
};
