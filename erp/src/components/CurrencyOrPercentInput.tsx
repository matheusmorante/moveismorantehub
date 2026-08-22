import { NumberFormatValues, NumericFormat as NumericFormatBase } from "react-number-format"
const NumericFormat = NumericFormatBase as any;

interface Props {
    value: number | string | undefined | null;
    onChange: (value: number) => void;
    prefix: string;
    suffix: string;
    className?: string;
    style?: React.CSSProperties;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    max?: number;
}

const CurrencyOrPercentInput = ({ value, onChange, prefix, suffix, className, style, onBlur, placeholder, disabled, id, max = 100 }: Props) => {
    return (
        <NumericFormat
            id={id}
            className={className || "w-full min-w-[90px] text-right bg-transparent border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-3 py-1 rounded-xl outline-none transition-all text-sm"}
            style={style}
            value={value === null || value === undefined || isNaN(Number(value)) ? "" : value}
            disabled={disabled}
            allowNegative={false}
            thousandSeparator="."
            decimalScale={2}
            decimalSeparator=","
            fixedDecimalScale
            prefix={prefix}
            suffix={suffix}
            placeholder={placeholder}
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
    )
}

export default CurrencyOrPercentInput