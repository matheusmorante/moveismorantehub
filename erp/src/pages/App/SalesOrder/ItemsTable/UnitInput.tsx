import { NumericFormat as NumericFormatBase, NumberFormatValues } from "react-number-format"
const NumericFormat = NumericFormatBase as any;

interface Props {
    value: number
    onChange: (value: number) => void
    disabled?: boolean
    className?: string
}

const UnitInput = ({ value, onChange, disabled, className }: Props) => {
    return (
        <NumericFormat
            className={className || `w-full text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-1 py-1.5 rounded-xl outline-none transition-all text-xs font-bold ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            value={value}
            allowNegative={false}
            disabled={disabled}
            thousandSeparator="."
            suffix={" UN"}
            decimalScale={0}
            decimalSeparator=","
            fixedDecimalScale
            onFocus={(e: any) => e.target.select()}
            onValueChange={
                (values: NumberFormatValues) => onChange(values.floatValue ?? 1)
            }
        />
    )
}

export default UnitInput