import React, { useState, useEffect, useRef } from 'react';

export interface CurrencyInputProps {
    value: number | string | undefined | null;
    onChangeValue?: (val: number) => void;
    onChange?: (val: number) => void;
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
    prefix?: string;
    suffix?: string;
    autoFocus?: boolean;
    min?: number;
    max?: number;
    showBadge?: boolean;
    badgeText?: string;
    label?: string;
    error?: string | boolean;
    helperText?: string;
    testID?: string;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

const CurrencyInput = ({
    value,
    onChangeValue,
    onChange,
    className,
    style,
    onBlur,
    onFocus,
    placeholder = "0,00",
    disabled = false,
    readOnly = false,
    required = false,
    id,
    name,
    prefix = "",
    suffix = "",
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
}: CurrencyInputProps) => {
    const handleChange = onChangeValue || onChange;
    const displayBadge = badgeText || (suffix.trim() || "R$");
    const hasError = typeof error === 'string' ? !!error : error;
    const errorMessage = typeof error === 'string' ? error : undefined;

    const [displayValue, setDisplayValue] = useState("");
    const isPasting = useRef(false);
    
    const formatBRL = (numValue: number) => {
        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(numValue);
        const numberPart = formatted.replace(/^R\$\s?/, '');
        return prefix + numberPart + suffix;
    };

    useEffect(() => {
        if (value === null || value === undefined || isNaN(Number(value))) {
            setDisplayValue("");
            return;
        }
        setDisplayValue(formatBRL(Number(value)));
    }, [value, prefix, suffix]);

    const triggerChange = (numericValue: number) => {
        if (max !== undefined && max > 0 && numericValue > max) numericValue = max;
        handleChange?.(numericValue);
        setDisplayValue(formatBRL(numericValue));
    };

    const parseSemanticPaste = (pastedText: string) => {
        let cleaned = pastedText.trim().replace(/^R\$\s?/, '');
        
        // Verifica se é padrao americano 1234.56 ou BR 1234,56
        const hasComma = cleaned.includes(',');
        const hasDot = cleaned.includes('.');
        
        if (hasComma && hasDot) {
            // R$ 1.234,56 -> 1234.56
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (hasComma) {
            // 1234,56 -> 1234.56
            cleaned = cleaned.replace(',', '.');
        } else if (hasDot) {
            // 1234.56 -> 1234.56 ou 1.234 -> 1234
            // Verifica quantas casas tem apos o ponto. 
            // Se for exatamente 2, assumimos decimal (americano). 
            // Se for 3, assumimos separador de milhar.
            const parts = cleaned.split('.');
            if (parts[parts.length - 1].length === 3) {
                cleaned = cleaned.replace(/\./g, ''); // Era milhar
            }
        }
        
        // Se após tudo isso for um número inteiro "1234", parseFloat('1234') -> 1234.00
        const numeric = parseFloat(cleaned);
        return isNaN(numeric) ? 0 : numeric;
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        if (!handleChange || readOnly || disabled) return;
        isPasting.current = true;
        const pastedText = e.clipboardData.getData('Text');
        e.preventDefault();
        
        const numericValue = parseSemanticPaste(pastedText);
        triggerChange(numericValue);
        
        setTimeout(() => { isPasting.current = false; }, 50);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!handleChange || readOnly || disabled || isPasting.current) return;
        
        const text = e.target.value;
        const digitsOnly = text.replace(/\D/g, '');
        
        if (!digitsOnly) {
            handleChange(0);
            setDisplayValue("");
            return;
        }

        const numericValue = parseInt(digitsOnly, 10) / 100;
        triggerChange(numericValue);
    };

    const handleFocusInternal = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
        onFocus?.();
    };

    const handleBlurInternal = () => {
        if (min !== undefined && value !== undefined && value !== null) {
            const numVal = Number(value);
            if (!isNaN(numVal) && numVal < min && handleChange && !readOnly && !disabled) {
                handleChange(min);
                setDisplayValue(formatBRL(min));
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
            inputMode: "numeric" as const,
        };

        if (showBadge) {
            return (
                <div className={`flex w-full items-center border-b-2 bg-transparent transition-colors ${borderClass} ${focusBorderClass}`}>
                    <div className="bg-transparent text-blue-700 dark:text-blue-300 font-black text-[10px] uppercase tracking-wider pl-1 pr-1.5 py-2 flex items-center justify-center shrink-0 self-stretch">
                        {displayBadge}
                    </div>
                    <input
                        {...commonProps}
                        className="w-full min-w-[50px] text-right bg-transparent px-2.5 py-2 outline-none border-none rounded-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-0"
                    />
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

export default CurrencyInput;
