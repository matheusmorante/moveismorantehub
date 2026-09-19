import React from "react";
import Person from "@/pages/types/person.type";
import SmartInput from "@/components/SmartInput";
import { PatternFormat as PatternFormatBase } from "react-number-format";
import { toTitleCase } from "@/pages/utils/formatters";
const PatternFormat = PatternFormatBase as any;

interface PersonIdentificationSectionProps {
    formData: Partial<Person>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
    isEmployee: boolean;
    collectionName: string;
    settings: any;
}

export const PersonIdentificationSection: React.FC<PersonIdentificationSectionProps> = ({
    formData,
    setFormData,
    isEmployee,
    collectionName,
    settings,
}) => {
    return (
        <>
            {!isEmployee && (
                <div className="md:col-span-2 flex items-center gap-6 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Tipo de Pessoa:
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, personType: 'PF' })}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.personType === 'PF'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            Pessoa Física (PF)
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, personType: 'PJ' })}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.personType === 'PJ'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            Pessoa Jurídica (PJ)
                        </button>
                    </div>
                </div>
            )}

            {collectionName === 'customers' && (
                <div className="md:col-span-2 flex items-center gap-6 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Cliente por tráfego pago? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, marketingOrigin: 'paid' })}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.marketingOrigin === 'paid'
                                    ? 'bg-orange-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            Sim (Tráfego Pago)
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, marketingOrigin: 'organic' })}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.marketingOrigin === 'organic'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            Não (Loja Física)
                        </button>
                    </div>
                </div>
            )}

            <div className={`${(formData.personType === 'PJ' && !isEmployee) ? 'md:col-span-1' : 'md:col-span-2'}`}>
                <SmartInput
                    label={(isEmployee ? 'Nome' : (formData.personType === 'PJ' ? 'Razão Social' : 'Nome Completo')) + ' *'}
                    required
                    value={formData.fullName}
                    onValueChange={(val) => setFormData({ ...formData, fullName: val })}
                    onBlur={() => {
                        if (collectionName === 'customers' && formData.fullName) {
                            setFormData((current) => ({ ...current, fullName: toTitleCase(current.fullName!) }));
                        }
                    }}
                    disableSuggestions={true}
                    placeholder={isEmployee ? 'Nome do Funcionário' : (formData.personType === 'PJ' ? 'Razão Social da Empresa' : 'Nome do Cliente')}
                    icon="bi-person"
                />
            </div>

            {formData.personType === 'PJ' && (
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Nome Fantasia
                    </label>
                    <input
                        type="text"
                        value={formData.tradeName || ""}
                        onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                        placeholder="Nome Popular / Fantasia"
                    />
                </div>
            )}

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {isEmployee ? 'CPF' : (formData.personType === 'PJ' ? 'CNPJ' : 'CPF')} {collectionName !== 'suppliers' && settings.requiredFields.customer?.cpfCnpj ? <span className="text-red-500">*</span> : null}
                </label>
                <PatternFormat
                    format={(isEmployee || formData.personType === 'PF') ? "###.###.###-##" : "##.###.###/####-##"}
                    type="text"
                    value={formData.cpfCnpj || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                    placeholder={(isEmployee || formData.personType === 'PF') ? '000.000.000-00' : '00.000.000/0000-00'}
                />
            </div>

            {collectionName === 'suppliers' && (
                <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Lead Time (Dias)</label>
                    <input
                        type="number"
                        value={formData.leadTime || ""}
                        onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                        placeholder="Tempo de entrega estimado"
                    />
                </div>
            )}
        </>
    );
};
