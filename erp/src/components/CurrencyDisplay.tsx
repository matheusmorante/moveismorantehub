import { NumericFormat as NumericFormatBase } from "react-number-format"
const NumericFormat = NumericFormatBase as any;

interface Props {
    value: number
}

const CurrencyDisplay = ({ value }: Props) => {
    return (
        <NumericFormat
            displayType="text"
            className="w-full text-end"
            value={value || 0}
            thousandSeparator="."
            prefix={"R$ "}
            decimalScale={2}
            decimalSeparator=","
            fixedDecimalScale
        />
    )
}

export default CurrencyDisplay