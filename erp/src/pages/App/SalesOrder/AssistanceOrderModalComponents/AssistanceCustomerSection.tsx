import React from "react";
import SmartInput from "../../../../components/SmartInput";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;

import CustomerData from "../../../types/customerData.type";
import AddressVerificationMap from "../AddressVerificationMap";

interface AssistanceCustomerSectionProps {
    customerData: CustomerData;
    setCustomerData: (val: CustomerData) => void;
    onOpenSearch: () => void;
    errors: Record<string, string>;
    isLinked?: boolean;
}

import { searchAddressSuggestions } from "../../../utils/maps";
import DropdownPortal from "../../../../components/shared/DropdownPortal";

const AssistanceCustomerSection = ({
    customerData,
    setCustomerData,
    onOpenSearch,
    errors,
    isLinked
}: AssistanceCustomerSectionProps) => {
    const [streetSuggestions, setStreetSuggestions] = React.useState<any[]>([]);
    const [isStreetSuggestionsOpen, setIsStreetSuggestionsOpen] = React.useState(false);
    const streetWrapperRef = React.useRef<HTMLDivElement>(null);

    const updateCustomer = (field: string, value: any) => {
        setCustomerData({ ...customerData, [field]: value });
    };

    const updateAddress = (field: string, value: any) => {
        setCustomerData({
            ...customerData,
            fullAddress: { ...customerData.fullAddress, [field]: value }
        });
    };

    const handleStreetChange = async (val: string) => {
        updateAddress('street', val);
        if (val.length >= 3) {
            const suggestions = await searchAddressSuggestions(val);
            setStreetSuggestions(suggestions);
            setIsStreetSuggestionsOpen(true);
        } else {
            setStreetSuggestions([]);
            setIsStreetSuggestionsOpen(false);
        }
    };

    const handleSelectAddressSuggestion = (suggestion: any) => {
        const addr = suggestion.address;
        setCustomerData({
            ...customerData,
            fullAddress: {
                ...customerData.fullAddress,
                street: addr.road || addr.pedestrian || addr.suburb || suggestion.display_name.split(',')[0],
                neighborhood: addr.neighbourhood || addr.suburb || customerData.fullAddress.neighborhood,
                city: addr.city || addr.town || addr.village || customerData.fullAddress.city,
                cep: addr.postcode ? addr.postcode.replace(/\D/g, '') : customerData.fullAddress.cep
            }
        });
        setIsStreetSuggestionsOpen(false);
    };

    return (
    <div className="flex flex-col gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <i className="bi bi-person-fill text-amber-500" />
            Dados do Cliente
        </h3>

        <div className="flex flex-col gap-2 relative group/field">
            <SmartInput
                 label="Nome do Cliente *"
                 required
                 value={customerData.fullName}
                 onValueChange={(val: string) => updateCustomer('fullName', val)}
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
                    Telefone / WhatsApp {!customerData.noPhone && <span className="text-red-500">*</span>}
                </label>
                <button
                    type="button"
                    onClick={() => {
                        const newVal = !customerData.noPhone;
                        setCustomerData({
                            ...customerData,
                            noPhone: newVal,
                            phone: newVal ? "" : customerData.phone
                        });
                    }}
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${customerData.noPhone ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    {customerData.noPhone ? <><i className="bi bi-phone-mute mr-1"></i> S/ Telefone</> : 'Não possui?'}
                </button>
            </div>
            <div className="flex gap-2">
                <PatternFormat
                    format="(##) #####-####"
                    type="tel"
                    value={customerData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCustomer('phone', e.target.value)}
                    placeholder={customerData.noPhone ? "NÃO POSSUI TELEFONE" : "(00) 00000-0000"}
                    disabled={customerData.noPhone}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none transition-all ${errors.customer_phone && !customerData.noPhone ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-amber-400'} ${customerData.noPhone ? 'opacity-50 grayscale' : ''}`}
                />
                <button type="button"
                    onClick={() => {
                        if (!customerData.phone || customerData.noPhone) return;
                        const cleanPhone = customerData.phone.replace(/\D/g, '');
                        const finalPhone = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                        window.open(`https://wa.me/${finalPhone}`, '_blank');
                    }}
                    disabled={customerData.noPhone}
                    title="Verificar WhatsApp"
                    className={`shrink-0 w-12 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95 ${customerData.noPhone ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                >
                    <i className="bi bi-whatsapp text-lg"></i>
                </button>
            </div>
            {errors.customer_phone && !customerData.noPhone && (
                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                    {errors.customer_phone}
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                </div>
            )}
        </div>

        {/* Address Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 relative group/field sm:col-span-2">
                <SmartInput
                     label="Bairro"
                     value={customerData.fullAddress.neighborhood}
                     onValueChange={(val: string) => updateAddress('neighborhood', val)}
                     tableName="people"
                     columnName="neighborhood"
                     placeholder="Ex: Centro"
                     icon="bi-geo"
                />
            </div>
            <div className="flex flex-col gap-2 relative group/field" ref={streetWrapperRef}>
                <SmartInput
                     label="Rua"
                     value={customerData.fullAddress.street}
                     onValueChange={handleStreetChange}
                     tableName="people"
                     columnName="street"
                     placeholder="Ex: Rua das Flores"
                     onFocus={() => { if (streetSuggestions.length > 0) setIsStreetSuggestionsOpen(true); }}
                />
                <DropdownPortal anchorRef={streetWrapperRef} isOpen={isStreetSuggestionsOpen && streetSuggestions.length > 0}>
                    <div className="mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                        {streetSuggestions.map((s, i) => (
                            <button key={i} type="button"
                                onClick={() => handleSelectAddressSuggestion(s)}
                                className="w-full text-left p-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors last:border-0"
                            >
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {[
                                        s.address.road || s.address.pedestrian || s.address.suburb || s.display_name.split(',')[0],
                                        s.address.neighbourhood || s.address.suburb,
                                        s.address.city || s.address.town || s.address.village
                                    ].filter(Boolean).join(', ')}
                                </p>
                            </button>
                        ))}
                    </div>
                </DropdownPortal>
            </div>
            <div className="flex flex-col gap-2 relative group/field">
                <SmartInput
                     label="Número"
                     value={customerData.fullAddress.number}
                     onValueChange={(val: string) => updateAddress('number', val)}
                     tableName="people"
                     columnName="number"
                     placeholder="Ex: 123"
                />
            </div>
            <div className="flex flex-col gap-2 relative group/field">
                <SmartInput
                     label="Cidade"
                     value={customerData.fullAddress.city}
                     onValueChange={(val: string) => updateAddress('city', val)}
                     tableName="people"
                     columnName="city"
                     placeholder="Ex: Colombo"
                     icon="bi-building"
                />
            </div>
            <div className="flex flex-col gap-2 relative group/field">
                <SmartInput
                     label="CEP"
                     value={customerData.fullAddress.cep}
                     onValueChange={(val: string) => updateAddress('cep', val)}
                     tableName="people"
                     columnName="cep"
                     placeholder="00000-000"
                />
            </div>
        </div>

        {/* Address Verification Map */}
        <div className="mt-2 animate-fade-in border-t border-slate-50 dark:border-slate-800/50 pt-4">
            <AddressVerificationMap 
                address={{
                    street: customerData.fullAddress.street,
                    number: customerData.fullAddress.number,
                    neighborhood: customerData.fullAddress.neighborhood,
                    city: customerData.fullAddress.city
                }}
            />
        </div>
    </div>
);
};

export default AssistanceCustomerSection;
