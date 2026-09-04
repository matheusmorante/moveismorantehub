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
        <div className={`flex w-full items-center border-b-2 border-slate-200 bg-transparent transition-colors focus-within:border-blue-600 dark:border-slate-700 dark:focus-within:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <NumericFormat
                className="w-full min-w-[30px] text-right bg-transparent px-2.5 py-2 outline-none border-none rounded-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-0"
                value={value}
                allowNegative={false}
                disabled={disabled}
                thousandSeparator="."
                suffix=""
                decimalScale={0}
                decimalSeparator=","
                fixedDecimalScale
                onBlur={() => {
                    if (!value || value < 1) {
                        onChange(1);
                    }
                }}
                onValueChange={
                    (values: NumberFormatValues) => {
                        const parsed = values.floatValue;
                        if (parsed === undefined || parsed < 1) {
                            onChange(1);
                        } else {
                            onChange(parsed);
                        }
                    }
                }
            />
            <div className="bg-transparent text-blue-700 dark:text-blue-300 font-black text-[10px] uppercase tracking-wider pl-1.5 pr-2 py-2 flex items-center justify-center shrink-0 self-stretch">
                UN
            </div>
        </div>
    );
};

export default UnitInput;
