import React from 'react';
import { NumericFormat as NumericFormatBase, NumberFormatValues } from "react-number-format";
const NumericFormat = NumericFormatBase as any;

interface Props {
    value: number | string | undefined | null;
    onChange: (val: number) => void;
    className?: string;
    style?: React.CSSProperties;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    prefix?: string;
    suffix?: string;
    autoFocus?: boolean;
    max?: number;
    showBadge?: boolean;
    badgeText?: string;
}

const CurrencyInput = ({
    value,
    onChange,
    className,
    style,
    onBlur,
    placeholder = "0,00",
    disabled = false,
    id,
    prefix = "",
    suffix = "",
    autoFocus = false,
    max,
    showBadge = true,
    badgeText
}: Props) => {
    const displayBadge = badgeText || (suffix.trim() || "R$");

    if (showBadge) {
        return (
            <div className="flex items-center overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-all shadow-sm">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-black text-[10px] uppercase tracking-wider px-2 py-1.5 border-r border-blue-100 dark:border-blue-800/50 flex items-center justify-center shrink-0 self-stretch">
                    {displayBadge}
                </div>
                <NumericFormat
                    id={id}
                    className={className || "w-full min-w-[70px] text-right bg-transparent px-2.5 py-1.5 outline-none transition-all text-xs font-bold text-slate-800 dark:text-slate-100"}
                    style={style}
                    value={value === null || value === undefined || isNaN(Number(value)) ? "" : value}
                    disabled={disabled}
                    allowNegative={false}
                    thousandSeparator="."
                    prefix={prefix}
                    suffix=""
                    decimalScale={2}
                    decimalSeparator=","
                    fixedDecimalScale
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    isAllowed={(values: NumberFormatValues) => {
                        const { floatValue } = values;
                        if (floatValue === undefined) return true;
                        if (max !== undefined && max > 0 && floatValue > max) return false;
                        return true;
                    }}
                    onFocus={(e: any) => e.target.select()}
                    onBlur={onBlur}
                    onValueChange={(values: NumberFormatValues) => {
                        let val = values.floatValue ?? 0;
                        if (max !== undefined && max > 0 && val > max) val = max;
                        onChange(val);
                    }}
                />
            </div>
        );
    }

    return (
        <NumericFormat
            id={id}
            className={className || "w-full min-w-[95px] text-right bg-transparent border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl outline-none transition-all text-xs font-bold"}
            style={style}
            value={value === null || value === undefined || isNaN(Number(value)) ? "" : value}
            disabled={disabled}
            allowNegative={false}
            thousandSeparator="."
            prefix={prefix}
            suffix={suffix}
            decimalScale={2}
            decimalSeparator=","
            fixedDecimalScale
            placeholder={placeholder}
            autoFocus={autoFocus}
            isAllowed={(values: NumberFormatValues) => {
                const { floatValue } = values;
                if (floatValue === undefined) return true;
                if (max !== undefined && max > 0 && floatValue > max) return false;
                return true;
            }}
            onFocus={(e: any) => e.target.select()}
            onBlur={onBlur}
            onValueChange={(values: NumberFormatValues) => {
                let val = values.floatValue ?? 0;
                if (max !== undefined && max > 0 && val > max) val = max;
                onChange(val);
            }}
        />
    );
};

export default CurrencyInput;