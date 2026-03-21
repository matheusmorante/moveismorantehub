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
        <section className='flex flex-col gap-4 w-full text-sm bg-slate-50/50 p-6 rounded-3xl border border-slate-100'>
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 flex items-center gap-2">
                    <i className="bi bi-truck"></i> ENTREGA E FRETE
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Distância</span>
                        <span className="font-black text-slate-900 text-xs">
                            {shipping.distance ? `${shipping.distance} km` : '---'}
                        </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Tempo Est.</span>
                        <span className="font-black text-slate-900 text-xs">
                            {shipping.durationMinutes ? `${shipping.durationMinutes} min` : '---'}
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor do Frete</span>
                    {shipping.value === 0 ? (
                        <span className="font-black text-emerald-600 text-sm">FRETE GRÁTIS</span>
                    ) : (
                        <span className="font-black text-slate-900 text-sm">
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
                <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Previsão de Entrega</span>
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <i className="bi bi-calendar-event text-blue-500"></i>
                        <span>{formatDate(shippingDate)}</span>
                        <span className="text-slate-300 mx-2">|</span>
                        <i className="bi bi-clock text-blue-500"></i>
                        <span>{shipping.scheduling?.time || shipping.scheduling?.startTime}</span>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ShippingData;