import React from "react";
import SmartInput from "../../../../components/SmartInput";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;

interface AssistanceCustomerSectionProps {
    customerName: string;
    setCustomerName: (val: string) => void;
    customerPhone: string;
    setCustomerPhone: (val: string) => void;
    customerNoPhone: boolean;
    setCustomerNoPhone: (val: boolean) => void;
    onOpenSearch: () => void;
    errors: Record<string, string>;
}

const AssistanceCustomerSection = ({
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerNoPhone,
    setCustomerNoPhone,
    onOpenSearch,
    errors
}: AssistanceCustomerSectionProps) => (
    <div className="flex flex-col gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <i className="bi bi-person-fill text-amber-500" />
            Dados do Cliente
        </h3>

        <div className="flex flex-col gap-2 relative group/field">
            <SmartInput
                 label="Nome do Cliente *"
                 required
                 value={customerName}
                 onValueChange={(val: string) => setCustomerName(val)}
                 tableName="people"
                 columnName="fullName"
                 placeholder="Ex: João da Silva"
                 icon="bi-person"
                 error={!!errors.customer_fullName}
            />
            {errors.customer_fullName && (
                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                    {errors.customer_fullName}
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                </div>
            )}
            <button
                type="button"
                onClick={onOpenSearch}
                className="absolute right-3 top-[34px] p-2 text-slate-400 hover:text-blue-600 transition-colors"
                title="Busca Avançada"
            >
                <i className="bi bi-search text-xs"></i>
            </button>
        </div>

        <div className="flex flex-col gap-2 relative group/field">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Telefone / WhatsApp {!customerNoPhone && <span className="text-red-500">*</span>}
                </label>
                <button
                    type="button"
                    onClick={() => {
                        setCustomerNoPhone(!customerNoPhone);
                        if (!customerNoPhone) setCustomerPhone("");
                    }}
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${customerNoPhone ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    {customerNoPhone ? <><i className="bi bi-phone-mute mr-1"></i> S/ Telefone</> : 'Não possui?'}
                </button>
            </div>
            <div className="flex gap-2">
                <PatternFormat
                    format="(##) #####-####"
                    type="tel"
                    value={customerPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                    placeholder={customerNoPhone ? "NÃO POSSUI TELEFONE" : "(00) 00000-0000"}
                    disabled={customerNoPhone}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none transition-all ${errors.customer_phone && !customerNoPhone ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-amber-400'} ${customerNoPhone ? 'opacity-50 grayscale' : ''}`}
                />
                <button type="button"
                    onClick={() => {
                        if (!customerPhone || customerNoPhone) return;
                        const cleanPhone = customerPhone.replace(/\D/g, '');
                        const finalPhone = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                        window.open(`https://wa.me/${finalPhone}`, '_blank');
                    }}
                    disabled={customerNoPhone}
                    title="Verificar WhatsApp"
                    className={`shrink-0 w-12 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95 ${customerNoPhone ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                >
                    <i className="bi bi-whatsapp text-lg"></i>
                </button>
            </div>
            {errors.customer_phone && !customerNoPhone && (
                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                    {errors.customer_phone}
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                </div>
            )}
        </div>
    </div>
);

export default AssistanceCustomerSection;
