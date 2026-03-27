import React from "react";
import { stringifyFullAddressWithObservation, formatToBRDate } from "../../../utils/formatters";
import { getSettings } from '@/pages/utils/settingsService';
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";

export const CustomerSection = ({ fullName, phone, noPhone }: { fullName?: string, phone?: string, noPhone?: boolean }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
            <i className="bi bi-person-badge-fill" /> Cliente
        </h3>
        <div className="bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors duration-300 flex items-center justify-between">
            <div>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 lowercase first-letter:uppercase mb-1">
                    {fullName || "Consumidor Não Identificado"}
                </p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <i className="bi bi-telephone-fill text-blue-400" />
                    {noPhone ? "Sem Telefone" : (phone || "Telefone não informado")}
                </p>
            </div>
            {phone && !noPhone && (
                <button type="button"
                    onClick={() => {
                        const cleanPhone = phone.replace(/\D/g, '');
                        const finalPhone = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                        window.open(`https://wa.me/${finalPhone}`, '_blank');
                    }}
                    title="Chamar no WhatsApp"
                    className="shrink-0 w-12 h-12 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95"
                >
                    <i className="bi bi-whatsapp text-xl"></i>
                </button>
            )}
        </div>
    </section>
);

export const OrderTypeLabelsSection = ({ deliveryMethod, orderType, handlingModality }: { deliveryMethod?: string, orderType?: string, handlingModality?: string }) => {
    const settings = getSettings();
    const isAssistance = orderType === 'assistance';
    const isPickup = deliveryMethod === 'pickup';
    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = resolveOrderColor(orderType, deliveryMethod, colors);
    const cls = getOrderTypeClasses(colorKey);

    let label = isPickup ? settings.orderTypeLabels.pickup : settings.orderTypeLabels.delivery;
    if (isAssistance) label = settings.orderTypeLabels.assistance;

    return (
        <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
                <i className="bi bi-tag-fill" /> Tipo de Pedido e Manuseio
            </h3>
            <div className="flex flex-wrap gap-4">
                <div className={`flex-1 p-6 rounded-3xl border transition-colors duration-300 flex items-center gap-3 ${cls.badge}`}>
                    <i className={`bi ${isAssistance ? 'bi-tools' : (isPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck')} text-xl`} />
                    <span className="text-sm font-black uppercase tracking-widest">{label}</span>
                </div>
                {handlingModality && (
                   <div className="flex-1 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300 flex items-center gap-3">
                        <i className="bi bi-box-fill text-blue-500 text-xl" />
                        <span className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{handlingModality}</span>
                   </div>
                )}
            </div>
        </section>
    );
};



import MapRoute from "../../SalesOrder/ShippingComponents/MapRoute";

export const ShippingSection = ({ fullAddress, destinationCoords, distance, durationMinutes, isReadOnly }: { fullAddress: any, destinationCoords?: [number, number], distance?: number, durationMinutes?: number, isReadOnly?: boolean }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
            <i className="bi bi-geo-alt-fill" /> Endereço de Entrega
        </h3>
            <div className="bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors duration-300 flex flex-col gap-4">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                    {stringifyFullAddressWithObservation(fullAddress)}
                </p>
                
                {(distance !== undefined || durationMinutes !== undefined) && (
                    <div className="flex items-center gap-6 mt-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        {distance !== undefined && (
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5 tracking-widest">Distância</p>
                                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{distance.toFixed(1)} km</p>
                            </div>
                        )}
                        {durationMinutes !== undefined && (
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5 tracking-widest">Tempo Est.</p>
                                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{durationMinutes} min</p>
                            </div>
                        )}
                    </div>
                )}

                {destinationCoords && (
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${destinationCoords[1]},${destinationCoords[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors mt-auto w-fit"
                    >
                        <i className="bi bi-geo-fill" />
                        Ver no Google Maps
                    </a>
                )}
            </div>
    </section>
);

export const SchedulingSection = ({ scheduling, isPickup }: { scheduling: any, isPickup?: boolean }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
            <i className="bi bi-clock-fill" /> {isPickup ? 'Agendamento da Retirada' : 'Agendamento da Entrega'}
        </h3>
        <div className="bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-col gap-3 transition-colors duration-300">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Data</span>
                <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                    {formatToBRDate(scheduling?.date)}
                </span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Horário</span>
                <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                    {scheduling?.startTime || scheduling?.time}
                    {scheduling?.type === 'range' && ` → ${scheduling.endTime}`}
                </span>
            </div>
        </div>
    </section>
);
