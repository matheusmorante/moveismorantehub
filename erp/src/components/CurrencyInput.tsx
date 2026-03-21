import { NumericFormat as NumericFormatBase, NumberFormatValues } from "react-number-format"
const NumericFormat = NumericFormatBase as any;

interface Props {
    value: number
    onChange: (val: number) => void
    className?: string
}

const CurrencyInput = ({ value, onChange, className }: Props) => {
    return (
        <NumericFormat
            className={className || "w-full min-w-[110px] text-right bg-transparent border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-3 py-1.5 rounded-xl outline-none transition-all text-sm"}
            value={value}
            disabled={false}
            allowNegative={false}
            thousandSeparator="."
            prefix={"R$ "}
            decimalScale={2}
            decimalSeparator=","
            fixedDecimalScale
            onFocus={(e: any) => e.target.select()}
            onValueChange={(values: NumberFormatValues) => {
                onChange(values.floatValue ?? 0)
            }}
        />
    )
}

export default CurrencyInput