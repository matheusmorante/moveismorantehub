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
            <div className="flex w-full items-center border-b-2 border-slate-200 bg-transparent transition-colors focus-within:border-blue-600 dark:border-slate-700 dark:focus-within:border-blue-500">
                <div className="bg-transparent text-blue-700 dark:text-blue-300 font-black text-[10px] uppercase tracking-wider pl-1 pr-1.5 py-2 flex items-center justify-center shrink-0 self-stretch">
                    {displayBadge}
                </div>
                <NumericFormat
                    id={id}
                    className="w-full min-w-[50px] text-right bg-transparent px-2.5 py-2 outline-none border-none rounded-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-0"
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
