import React from "react";
import { stringifyFullAddressWithObservation, formatToBRDate, toTitleCase } from "../../../utils/formatters";
import { getSettings } from '@/pages/utils/settingsService';
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";

type AdditionalContact = { name?: string; phone?: string };

export const CustomerSection = ({ fullName, phone, noPhone, email, cpfCnpj, observations, additionalContacts = [] }: { fullName?: string, phone?: string, noPhone?: boolean, email?: string, cpfCnpj?: string, observations?: string, additionalContacts?: AdditionalContact[] }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
            <i className="bi bi-person-badge-fill" /> Cliente
        </h3>

        <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
                <p className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
                    {toTitleCase(fullName || "Consumidor Não Identificado")}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <i className="bi bi-telephone-fill text-blue-400 text-[10px]" />
                    {noPhone ? "Sem Telefone" : (phone || "Telefone não informado")}
                </p>
                {(email || cpfCnpj) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {email && <span className="flex items-center gap-1.5"><i className="bi bi-envelope-fill text-blue-400 text-[10px]" /><span className="truncate">{email}</span></span>}
                        {cpfCnpj && <span className="flex items-center gap-1.5"><i className="bi bi-person-vcard-fill text-blue-400 text-[10px]" />{cpfCnpj}</span>}
                    </div>
                )}
                {additionalContacts.filter(c => c.name || c.phone).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {additionalContacts.filter(c => c.name || c.phone).map((contact, index) => (
                            <div key={index} className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">{contact.name || 'Contato adicional'}</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{contact.phone || 'Telefone não informado'}</span>
                            </div>
                        ))}
                    </div>
                )}
                {observations && (
                    <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium italic leading-relaxed text-slate-400 dark:text-slate-500">
                        {observations}
                    </p>
                )}
            </div>
            {phone && !noPhone && (
                <button
                    type="button"
                    onClick={() => {
                        const cleanPhone = phone.replace(/\D/g, '');
                        const finalPhone = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                        window.open(`https://wa.me/${finalPhone}`, '_blank');
                    }}
                    title="Chamar no WhatsApp"
                    className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95"
                >
                    <i className="bi bi-whatsapp text-lg" />
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                <i className="bi bi-tag-fill" /> Tipo de Pedido e Manuseio
            </h3>
            <div className="flex flex-wrap gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${cls.badge}`}>
                    <i className={`bi ${isAssistance ? 'bi-tools' : (isPickup ? 'bi-shop' : 'bi-truck')}`} />
                    {label}
                </div>
                {handlingModality && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <i className="bi bi-box-fill text-blue-500" />
                        {handlingModality}
                    </div>
                )}
            </div>
        </section>
    );
};

import MapRoute from "../../SalesOrder/ShippingComponents/MapRoute";

export const ShippingSection = ({ fullAddress, destinationCoords, distance, durationMinutes, isReadOnly }: { fullAddress: any, destinationCoords?: [number, number], distance?: number, durationMinutes?: number, isReadOnly?: boolean }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
            <i className="bi bi-geo-alt-fill" /> Endereço de Entrega
        </h3>

        <p className={`text-sm leading-relaxed ${stringifyFullAddressWithObservation(fullAddress) ? 'font-semibold text-slate-700 dark:text-slate-300' : 'font-medium italic text-slate-400 dark:text-slate-500'}`}>
            {stringifyFullAddressWithObservation(fullAddress) || "Endereço não informado"}
        </p>

        {(distance !== undefined || durationMinutes !== undefined) && (
            <div className="flex items-center gap-5 mt-3">
                {distance !== undefined && (
                    <div>
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Distância</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{distance.toFixed(1)} km</p>
                    </div>
                )}
                {durationMinutes !== undefined && (
                    <div>
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Tempo Est.</p>
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
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors mt-3"
            >
                <i className="bi bi-geo-fill" />
                Ver no Google Maps
            </a>
        )}
    </section>
);

export const SchedulingSection = ({ scheduling, isPickup }: { scheduling: any, isPickup?: boolean }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
            <i className="bi bi-clock-fill" /> {isPickup ? 'Agendamento da Retirada' : 'Agendamento da Entrega'}
        </h3>

        {scheduling?.pendingScheduling ? (
            <div className="flex items-center gap-3 animate-pulse">
                <i className="bi bi-clock-history text-xl text-orange-500 dark:text-orange-400" />
                <div>
                    <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest leading-none mb-0.5">Aguardando Agendamento</p>
                    <p className="text-[10px] font-semibold text-orange-500/80 dark:text-orange-500/70 uppercase">Data e hora serão definidos em breve</p>
                </div>
            </div>
        ) : (
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Data</span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                        {scheduling?.date ? `${formatToBRDate(scheduling.date)}${scheduling.dateType === 'range' && scheduling.endDate ? ` até ${formatToBRDate(scheduling.endDate)}` : ''}` : 'Não informado'}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Horário</span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                        {scheduling?.startTime || scheduling?.time || "Não informado"}
                        {scheduling?.type === 'range' && scheduling.endTime && ` → ${scheduling.endTime}`}
                    </span>
                </div>
            </div>
        )}
    </section>
);
