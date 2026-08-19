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
    autoFocus?: boolean;
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
    prefix = "R$ ",
    autoFocus = false
}: Props) => {
    return (
        <NumericFormat
            id={id}
            className={className || "w-full min-w-[110px] text-right bg-transparent border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-3 py-1.5 rounded-xl outline-none transition-all text-sm"}
            style={style}
            value={value === null || value === undefined || isNaN(Number(value)) ? "" : value}
            disabled={disabled}
            allowNegative={false}
            thousandSeparator="."
            prefix={prefix}
            decimalScale={2}
            decimalSeparator=","
            fixedDecimalScale
            placeholder={placeholder}
            autoFocus={autoFocus}
            onFocus={(e: any) => e.target.select()}
            onBlur={onBlur}
            onValueChange={(values: NumberFormatValues) => {
                onChange(values.floatValue ?? 0);
            }}
        />
    );
};

export default CurrencyInput;