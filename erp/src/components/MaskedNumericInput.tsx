import React, { useState, useEffect, useRef } from 'react';

export interface MaskedNumericInputProps {
    value: number | string | undefined | null;
    onChangeValue?: (val: number | null) => void;
    onChange?: (val: number | null) => void;
    
    // Configurações da Máscara
    fractionDigits: number; // Ex: 2 para percentual, 1 para dimensão
    prefix?: string;
    suffix?: string;
    
    // Define se o modo de entrada de digitação é incremental (RTL/dinheiro) ou livre (Decimal)
    typingMode?: 'rtl' | 'decimal';

    // HTML e Form state
    className?: string;
    style?: React.CSSProperties;
    onBlur?: () => void;
    onFocus?: () => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    autoFocus?: boolean;
    min?: number;
    max?: number;
    
    // Design
    showBadge?: boolean;
    badgeText?: string;
    label?: string;
    error?: string | boolean;
    helperText?: string;
    testID?: string;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export const MaskedNumericInput = ({
    value,
    onChangeValue,
    onChange,
    fractionDigits,
    prefix = "",
    suffix = "",
    typingMode = 'rtl',
    className,
    style,
    onBlur,
    onFocus,
    placeholder = "0",
    disabled = false,
    readOnly = false,
    required = false,
    id,
    name,
    autoFocus = false,
    min,
    max,
    showBadge = true,
    badgeText,
    label,
    error,
    helperText,
    testID,
    onKeyDown,
}: MaskedNumericInputProps) => {
    const handleChange = onChangeValue || onChange;
    const displayBadge = badgeText || suffix.trim();
    const hasError = typeof error === 'string' ? !!error : error;
    const errorMessage = typeof error === 'string' ? error : undefined;

    const [displayValue, setDisplayValue] = useState("");
    const isPasting = useRef(false);
    
    // Função universal de formatação (pt-BR) controlando as casas decimais
    const formatValue = (numValue: number) => {
        const formatted = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        }).format(numValue);
        
        return prefix + formatted + suffix;
    };

    // Atualiza a tela a partir de props de valor (state externo)
    useEffect(() => {
        if (value === null || value === undefined || value === '') {
            setDisplayValue("");
            return;
        }
        const numeric = Number(value);
        if (isNaN(numeric)) {
            setDisplayValue("");
            return;
        }
        setDisplayValue(formatValue(numeric));
    }, [value, prefix, suffix, fractionDigits]);

    const triggerChange = (numericValue: number | null) => {
        if (numericValue !== null && max !== undefined && numericValue > max) {
            numericValue = max;
        }
        handleChange?.(numericValue);
        if (numericValue !== null) {
            setDisplayValue(formatValue(numericValue));
        } else {
            setDisplayValue("");
        }
    };

    // Semântica de colagem e digitação livre decimal
    const parseSemanticString = (pastedText: string) => {
        let cleaned = pastedText.trim().replace(prefix, '').replace(suffix, '').trim();
        // Remove espaços vazios dentro
        cleaned = cleaned.replace(/\s/g, '');
        
        const hasComma = cleaned.includes(',');
        const hasDot = cleaned.includes('.');
        
        if (hasComma && hasDot) {
            // Se tiver ambos, o ponto americano prevalece e vira 1234.56
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (hasComma) {
            // Vírgula simples (BR) -> Decimal point
            cleaned = cleaned.replace(',', '.');
        } else if (hasDot) {
            // Ponto simples (pode ser milhar BR ou decimal US)
            // Se tiver exatamente 3 chars no último bloco e não for fractionDigits = 3, assumimos milhar BR.
            const parts = cleaned.split('.');
            if (parts[parts.length - 1].length === 3 && fractionDigits !== 3) {
                cleaned = cleaned.replace(/\./g, ''); // Milhar BR
            }
        }
        
        const numeric = parseFloat(cleaned);
        return isNaN(numeric) ? null : numeric;
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        if (!handleChange || readOnly || disabled) return;
        isPasting.current = true;
        const pastedText = e.clipboardData.getData('Text');
        e.preventDefault();
        
        const numericValue = parseSemanticString(pastedText);
        triggerChange(numericValue);
        
        setTimeout(() => { isPasting.current = false; }, 50);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!handleChange || readOnly || disabled || isPasting.current) return;
        
        const text = e.target.value;

        // Controle explícito para quando o usuário selecionou tudo e apertou uma tecla nova, 
        // ou está operando no modo de medidas.
        // No modo "decimal", evitamos dividir por 100 se ele apertar Backspace ou apagar o valor inteiro
        // e inserir um número puro.
        if (typingMode === 'decimal') {
             // O modo decimal lida de forma branda, aceitando vírgulas durante a digitação
             // e mantendo um Number estrito.
             const isProbablyReplacement = Math.abs(text.length - displayValue.length) > 1 || (!text.includes(',') && !text.includes('.'));
             
             if (isProbablyReplacement && text.replace(/\D/g, '').length > 0) {
                 const semValue = parseSemanticString(text);
                 if (semValue !== null) {
                     triggerChange(semValue);
                     return;
                 }
             }
        }

        // Fluxo padrão RTL (divisão iterativa por potências de 10)
        const digitsOnly = text.replace(/\D/g, '');
        if (!digitsOnly) {
            triggerChange(null);
            return;
        }

        const divisor = Math.pow(10, fractionDigits);
        const numericValue = parseInt(digitsOnly, 10) / divisor;
        triggerChange(numericValue);
    };

    const handleFocusInternal = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
        onFocus?.();
    };

    const handleBlurInternal = () => {
        if (min !== undefined && value !== undefined && value !== null && value !== '') {
            const numVal = Number(value);
            if (!isNaN(numVal) && numVal < min && handleChange && !readOnly && !disabled) {
                triggerChange(min);
            }
        }
        onBlur?.();
    };

    const borderClass = hasError
        ? "border-red-500 dark:border-red-400"
        : "border-slate-200 dark:border-slate-700";

    const focusBorderClass = hasError
        ? "focus-within:border-red-500"
        : "focus-within:border-blue-600 dark:focus-within:border-blue-500";

    const renderInput = () => {
        const commonProps = {
            id,
            name,
            style,
            value: displayValue,
            onChange: handleInputChange,
            onFocus: handleFocusInternal,
            onBlur: handleBlurInternal,
            onPaste: handlePaste,
            onKeyDown,
            disabled: disabled || readOnly,
            placeholder,
            autoFocus,
            "data-testid": testID,
            // Decimal permite teclado pontuado
            inputMode: typingMode === 'decimal' ? 'decimal' : 'numeric' as const,
        };

        if (showBadge && displayBadge) {
            return (
                <div className={`flex w-full items-center border-b-2 bg-transparent transition-colors ${borderClass} ${focusBorderClass}`}>
                    <input
                        {...commonProps}
                        className="w-full min-w-[50px] text-right bg-transparent px-2.5 py-2 outline-none border-none rounded-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-0"
                    />
                    <div className="bg-transparent text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-wider pl-1.5 pr-2 py-2 flex items-center justify-center shrink-0 self-stretch">
                        {displayBadge}
                    </div>
                </div>
            );
        }

        return (
            <input
                {...commonProps}
                className={className || "w-full min-w-[95px] text-right bg-transparent border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl outline-none transition-all text-xs font-bold"}
            />
        );
    };

    if (label || errorMessage || helperText) {
        return (
            <div className="flex flex-col gap-1 w-full">
                {label && (
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider" htmlFor={id}>
                        {label}
                        {required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                )}
                {renderInput()}
                {errorMessage && <span className="text-[10px] text-red-500 font-medium">{errorMessage}</span>}
                {helperText && !errorMessage && (
                    <span className="text-[10px] text-slate-400">{helperText}</span>
                )}
            </div>
        );
    }

    return renderInput();
};
