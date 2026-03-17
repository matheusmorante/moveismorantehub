import { PaymentsSummary } from "../../types/payments.type";
import CurrencyDisplay from "../../../components/CurrencyDisplay";

interface Props {
    summary: PaymentsSummary,
}

const TFoot = ({ summary }: Props) => {
    return (
         <tfoot>
            <tr>
                <th>Valor Total de Juros</th>
                <th>Total do Pedido</th>
            </tr>
            <tr>
                <td>
                    <CurrencyDisplay value={summary.totalPaymentsFee} />
                </td>
                <td>
                    <CurrencyDisplay value={summary.totalOrderValue} />
                </td>
            </tr>
            <tr>
                <th>Total Pago</th>
                <th>Saldo Restante</th>
            </tr>
            <tr>
                <td>
                    <CurrencyDisplay value={summary.totalAmountPaid} />
                </td>
                <td>
                    <CurrencyDisplay value={summary.amountRemaining} />
                </td>
            </tr>
        </tfoot>
    )
}
export default TFoot;