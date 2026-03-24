import Shipping from "../types/Shipping.type";
import { formatDate } from "../utils/formatters";
import { NumericFormat as NumericFormatBase } from "react-number-format";
const NumericFormat = NumericFormatBase as any;

interface Props {
    shipping: Shipping
}

const ShippingData = ({ shipping }: Props) => {
    const shippingDate = shipping.scheduling?.date;

    return (
        <section className='flex flex-col gap-2 w-full text-xs bg-slate-50/50 p-3 rounded-2xl border border-slate-50'>
            <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-600 mb-1 flex items-center gap-2">
                    <i className="bi bi-truck text-lg"></i> ENTREGA E FRETE
                </h3>
                
                <div className="grid grid-cols-2 gap-1 mb-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest mb-0.5">Distância</span>
                        <span className="font-black text-slate-900 text-base">
                            {shipping.distance ? `${shipping.distance} km` : '---'}
                        </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest mb-0.5">Tempo Est.</span>
                        <span className="font-black text-slate-900 text-base">
                            {shipping.durationMinutes ? `${shipping.durationMinutes} min` : '---'}
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Valor do Frete</span>
                    {shipping.value === 0 ? (
                        <span className="font-black text-emerald-600 text-xl">FRETE GRÁTIS</span>
                    ) : (
                        <span className="font-black text-slate-900 text-xl">
                            <NumericFormat
                                value={shipping.value}
                                allowNegative={false}
                                thousandSeparator="."
                                prefix={"R$ "}
                                decimalScale={2}
                                decimalSeparator=","
                                displayType="text"
                            />
                        </span>
                    )}
                </div>
            </div>

            <div>
                <div className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Previsão de Entrega</span>
                    <div className="flex items-center gap-3 text-slate-900 font-bold text-xl">
                        <i className="bi bi-calendar-event text-blue-500 text-base"></i>
                        <span>{formatDate(shippingDate)}</span>
                        <span className="text-slate-200 mx-2">|</span>
                        <i className="bi bi-clock text-blue-500 text-base"></i>
                        <span>{shipping.scheduling?.time || shipping.scheduling?.startTime}</span>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ShippingData;