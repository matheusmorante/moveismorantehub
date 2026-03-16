import { Payment, PaymentsSummary } from "../../../types/payments.type";
import { sanitizePayment } from "../../../utils/sanitization";
import BodyRow from "./BodyRow";

interface Props {
    payments: Payment[];
    setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
    summary: PaymentsSummary;
    isMobile?: boolean;
}

const Body = ({ payments, setPayments, summary, isMobile }: Props) => {
    const toggleFeeType = (idx: number) => {
        setPayments((prev: Payment[]) => {
            const newPayments = [...prev];
            const newPayment = { ...newPayments[idx] };

            if (newPayment.feeType === "fixed") {
                newPayment.fee = newPayment.fee / newPayment.amount * 100;
                newPayment.feeType = "percentage";
            } else {
                newPayment.fee = newPayment.fee * newPayment.amount / 100;
                newPayment.feeType = "fixed";
            }

            newPayments[idx] = newPayment
            return newPayments
        })
    }

    const changePayments = (
        idx: number,
        key: keyof Payment,
        value: string | number
    ): void => {
        setPayments((prev: Payment[]) => {
            const newPayments = [...prev];
            let newPayment = { ...newPayments[idx], [key]: value };
            newPayment = sanitizePayment(newPayment)

            newPayments[idx] = newPayment

            return newPayments
        })
    };

    const deletePayment = (
        targetIdx: number,
    ) => {
        setPayments((prev: Payment[]) => {
            return [...prev].filter((_, idx) => idx !== targetIdx);
        })
    };

    const content = payments.map((payment, idx) => (
        <BodyRow
            key={idx}
            onToggleFeeType={() => toggleFeeType(idx)}
            onChange={changePayments}
            onDelete={() => deletePayment(idx)}
            payment={payment}
            summary={summary}
            idx={idx}
            isMobile={isMobile}
        />
    ));

    if (isMobile) {
        return <div className="space-y-4">{content}</div>;
    }

    return (
        <tbody>
            {content}
        </tbody>
    )
}

export default Body;
