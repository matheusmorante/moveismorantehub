import React, { useState, useEffect, useRef } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';

export interface MaskedNumericInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'onChange'> {
    value: number | null | undefined;
    onChangeValue: (value: number | null) => void;
    fractionDigits: number;
    prefix?: string;
    suffix?: string;
    color?: string;
    disabled?: boolean;
}

export function MaskedNumericInput({
    value,
    onChangeValue,
    fractionDigits,
    prefix = '',
    suffix = '',
    color = '#1e293b',
    disabled = false,
    style,
    ...rest
}: MaskedNumericInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    const formatValue = (val: number) => {
        const formatted = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        }).format(val);
        return prefix + formatted + suffix;
    };

    useEffect(() => {
        if (value === null || value === undefined || isNaN(value)) {
            setDisplayValue('');
            return;
        }
        setDisplayValue(formatValue(value));
    }, [value, prefix, suffix, fractionDigits]);

    const parseSemanticText = (text: string) => {
        let cleaned = text.trim().replace(prefix, '').replace(suffix, '').trim();
        cleaned = cleaned.replace(/\s/g, '');
        
        const hasComma = cleaned.includes(',');
        const hasDot = cleaned.includes('.');
        
        if (hasComma && hasDot) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (hasComma) {
            cleaned = cleaned.replace(',', '.');
        } else if (hasDot) {
            const parts = cleaned.split('.');
            if (parts[parts.length - 1].length === 3 && fractionDigits !== 3) {
                cleaned = cleaned.replace(/\./g, '');
            }
        }
        const numeric = parseFloat(cleaned);
        return isNaN(numeric) ? 0 : numeric;
    };

    const handleChangeText = (text: string) => {
        if (disabled) return;

        const diffLength = Math.abs(text.length - displayValue.length);
        const hasNewFormatSymbols = (text.includes(',') || text.includes('.')) && !displayValue.includes(text) && diffLength > 1;

        if (diffLength > 2 || hasNewFormatSymbols) {
            // Colagem
            const cleanedText = text.replace(/[^0-9.,\-R$% kmcmmg]/gi, '');
            const semanticValue = parseSemanticText(cleanedText);
            onChangeValue(semanticValue);
            return;
        }
        
        const digitsOnly = text.replace(/\D/g, '');
        
        if (!digitsOnly) {
            onChangeValue(null);
            setDisplayValue('');
            return;
        }

        const divisor = Math.pow(10, fractionDigits);
        const numericValue = parseInt(digitsOnly, 10) / divisor;
        
        onChangeValue(numericValue);
        setDisplayValue(formatValue(numericValue));
    };

    return (
        <TextInput
            style={[
                styles.input,
                { color: disabled ? '#94a3b8' : color },
                disabled && styles.disabled,
                style
            ]}
            keyboardType="numeric"
            value={displayValue}
            onChangeText={handleChangeText}
            editable={!disabled}
            selectTextOnFocus={true}
            {...rest}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        fontSize: 14,
        fontWeight: 'bold',
        minHeight: 40,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0', // slate-200
        borderRadius: 8,
        backgroundColor: '#ffffff',
        textAlign: 'right',
    },
    disabled: {
        backgroundColor: '#f1f5f9', // slate-100
        borderColor: '#f1f5f9',
    }
});
