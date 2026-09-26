import React from 'react';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export type DistanceInputProps = Omit<MaskedNumericInputProps, 'fractionDigits' | 'prefix' | 'suffix' | 'typingMode' | 'showBadge' | 'badgeText'>;

/**
 * Componente DistanceInput (Ex: 12,3 km)
 * Possui exata 1 casa decimal. RTL TypingMode.
 */
export const DistanceInput = (props: DistanceInputProps) => {
    return (
        <MaskedNumericInput
            {...props}
            fractionDigits={1}
            suffix=" km"
            showBadge={true}
            typingMode="rtl"
        />
    );
};
