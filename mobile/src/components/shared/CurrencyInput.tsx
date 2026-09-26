import React, { useState, useEffect } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';

export interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'onChange'> {
    value: number | null | undefined;
    onChangeValue: (value: number | null) => void;
    /** Prefixo, padrǜo "R$ " */
    prefix?: string;
    /** Cor do texto */
    color?: string;
    /** Quando verdadeiro, nǜo permite ediǜo e tem estilo ofuscado */
    disabled?: boolean;
}

export function CurrencyInput({
    value,
    onChangeValue,
    prefix = 'R$ ',
    color = '#1e293b', // slate-800
    disabled = false,
    style,
    ...rest
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value === null || value === undefined || isNaN(value)) {
            setDisplayValue('');
            return;
        }

        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(value);
        
        const numberPart = formatted.replace(/^R\$\s?/, '');
        setDisplayValue(prefix + numberPart);
    }, [value, prefix]);

    const parseSemanticText = (text: string) => {
        let cleaned = text.trim().replace(/^R\$\s?/, '');
        const hasComma = cleaned.includes(',');
        const hasDot = cleaned.includes('.');
        
        if (hasComma && hasDot) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (hasComma) {
            cleaned = cleaned.replace(',', '.');
        } else if (hasDot) {
            const parts = cleaned.split('.');
            if (parts[parts.length - 1].length === 3) {
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
            const cleanedText = text.replace(/[^0-9.,R$ ]/g, '');
            const semanticValue = parseSemanticText(cleanedText);
            onChangeValue(semanticValue);
            return;
        }
        
        const digitsOnly = text.replace(/\\D/g, '');
        
        if (!digitsOnly) {
            onChangeValue(null);
            setDisplayValue('');
            return;
        }

        const numericValue = parseInt(digitsOnly, 10) / 100;
        
        onChangeValue(numericValue);
        
        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(numericValue);
        
        const numberPart = formatted.replace(/^R\$\s?/, '');
        setDisplayValue(prefix + numberPart);
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
    },
    disabled: {
        backgroundColor: '#f1f5f9', // slate-100
        borderColor: '#f1f5f9',
    }
});
