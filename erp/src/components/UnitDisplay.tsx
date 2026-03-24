import { NumericFormat as NumericFormatBase } from "react-number-format"
const NumericFormat = NumericFormatBase as any;

interface Props {
    value: number
}

const UnitDisplay = ({ value }: Props) => {


    return (
        <NumericFormat
            value={value}
            allowNegative={false}
            displayType="text"
            thousandSeparator="."
            suffix={" UN"}
            decimalScale={0}
            decimalSeparator=","
        />
    )
}

export default UnitDisplay