import { NumberFormatValues, NumericFormat as NumericFormatBase } from "react-number-format"
const NumericFormat = NumericFormatBase as any;

interface Props {
    value: number | string | undefined | null;
    onChange: (value: number) => void;
    prefix?: string;
    suffix?: string;
    className?: string;
    style?: React.CSSProperties;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    max?: number;
    showBadge?: boolean;
    badgeText?: string;
}

const CurrencyOrPercentInput = ({
    value,
    onChange,
    prefix = "",
    suffix = "%",
    className,
    style,
    onBlur,
    placeholder,
    disabled,
    id,
    max = 100,
    showBadge = true,
    badgeText
}: Props) => {
    const displayBadge = badgeText || (suffix.trim() || "%");

    if (showBadge) {
        const isLeftBadge = displayBadge.includes("R$") || displayBadge.includes("$");
        return (
            <div className="flex w-full items-center border-b-2 border-slate-200 bg-transparent transition-colors focus-within:border-blue-600 dark:border-slate-700 dark:focus-within:border-blue-500">
                {isLeftBadge && (
                    <div className="bg-transparent text-blue-700 dark:text-blue-300 font-black text-[10px] uppercase tracking-wider px-2 py-2 border-r border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 self-stretch">
                        {displayBadge}
                    </div>
                )}
                <NumericFormat
                    id={id}
                    className="w-full min-w-[50px] text-right bg-transparent px-2.5 py-2 outline-none border-none rounded-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-0"
                    style={style}
                    value={value === null || value === undefined || isNaN(Number(value)) ? "" : value}
                    disabled={disabled}
                    allowNegative={false}
                    thousandSeparator="."
                    decimalScale={2}
                    decimalSeparator=","
                    fixedDecimalScale
                    prefix={prefix}
                    suffix=""
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
                {!isLeftBadge && (
                    <div className="bg-transparent text-blue-700 dark:text-blue-300 font-black text-[10px] uppercase tracking-wider px-2 py-2 border-l border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 self-stretch">
                        {displayBadge}
                    </div>
                )}
            </div>
        );
    }

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
    );
};

export default CurrencyOrPercentInput;
