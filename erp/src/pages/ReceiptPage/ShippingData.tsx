import Shipping from "../types/Shipping.type";
import { formatDate } from "../utils/formatters";
import { NumericFormat as NumericFormatBase } from "react-number-format";
const NumericFormat = NumericFormatBase as any;

interface Props {
    shipping: Shipping
}

const ShippingData = ({ shipping }: Props) => {
    const shippingDate = shipping.scheduling.date;

    return (
        <section className="flex flex-col gap-4">
             <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 flex items-center gap-3 after:h-[1px] after:bg-slate-100 after:flex-1 text-left">Logística e Entrega</h2>
             
             <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Valor do Frete</span>
                    <div className="text-sm font-black text-slate-800">
                        {shipping.value === 0 ? (
                            <span className="text-emerald-600 uppercase tracking-tighter">FRETE GRÁTIS</span>
                        ) : (
                            <NumericFormat
                                value={shipping.value}
                                allowNegative={false}
                                thousandSeparator="."
                                prefix={"R$ "}
                                decimalScale={2}
                                decimalSeparator=","
                            />
                        )}
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Agendamento</span>
                    <span className="text-sm font-bold text-slate-800 lowercase">
                        {shipping.scheduling?.dateType === 'range' && shipping.scheduling?.endDate
                            ? `de ${formatDate(shipping.scheduling.date)} até ${formatDate(shipping.scheduling.endDate)}`
                            : formatDate(shipping.scheduling?.date)}
                        <span className="text-slate-400 px-1">|</span>
                        {shipping.scheduling?.type === 'range' && shipping.scheduling?.startTime && shipping.scheduling?.endTime
                            ? `${shipping.scheduling.startTime} às ${shipping.scheduling.endTime}`
                            : (shipping.scheduling?.startTime || shipping.scheduling?.time || 'A combinar')}
                    </span>
                </div>
             </div>
        </section>
    )
}

export default ShippingData;