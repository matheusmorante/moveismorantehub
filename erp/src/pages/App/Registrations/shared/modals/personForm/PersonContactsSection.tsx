import React from "react";
import Person from "@/pages/types/person.type";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;

interface PersonContactsSectionProps {
    formData: Partial<Person>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
    isEmployee: boolean;
    person?: Person | null;
    collectionName: string;
    settings: any;
    handleEmployeeEmailBlur: () => Promise<void>;
    addAdditionalContact: () => void;
    removeAdditionalContact: (index: number) => void;
    updateAdditionalContact: (index: number, field: 'name' | 'phone', value: string) => void;
}

export const PersonContactsSection: React.FC<PersonContactsSectionProps> = ({
    formData,
    setFormData,
    isEmployee,
    person,
    collectionName,
    settings,
    handleEmployeeEmailBlur,
    addAdditionalContact,
    removeAdditionalContact,
    updateAdditionalContact,
}) => {
    return (
        <>
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Telefone {collectionName === 'customers' && settings.requiredFields.customer?.phone && !formData.noPhone ? <span className="text-red-500">*</span> : null}
                    </label>
                    {collectionName !== 'suppliers' && collectionName !== 'employees' && (
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, noPhone: !formData.noPhone, phone: !formData.noPhone ? "" : formData.phone })}
                            className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${formData.noPhone ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            {formData.noPhone ? <><i className="bi bi-phone-mute mr-1"></i> S/ Telefone</> : 'Não possui?'}
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <PatternFormat
                        format="(##) #####-####"
                        type="text"
                        value={formData.phone || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={formData.noPhone}
                        className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 ${formData.noPhone ? 'opacity-50 grayscale' : ''}`}
                        placeholder={formData.noPhone ? "NÃO POSSUI TELEFONE" : "(00) 00000-0000"}
                    />
                    {collectionName !== 'employees' && (
                        <button
                            type="button"
                            onClick={() => {
                                if (!formData.phone || formData.noPhone) return;
                                const cleanPhone = formData.phone.replace(/\D/g, '');
                                const finalPhone = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                                window.open(`https://wa.me/${finalPhone}`, '_blank');
                            }}
                            disabled={formData.noPhone}
                            title="Verificar WhatsApp"
                            className={`shrink-0 w-12 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95 ${formData.noPhone ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                        >
                            <i className="bi bi-whatsapp text-lg"></i>
                        </button>
                    )}
                </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    E-mail {isEmployee || (collectionName !== 'suppliers' && settings.requiredFields.customer?.email) ? <span className="text-red-500">*</span> : null}
                </label>
                <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={() => void handleEmployeeEmailBlur()}
                    disabled={isEmployee && !!person}
                    readOnly={isEmployee && !!person}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 ${
                        isEmployee && person ? 'opacity-60 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : ''
                    }`}
                    placeholder="exemplo@email.com"
                />
                {isEmployee && person && (
                    <span className="text-[10px] text-slate-400 font-medium">
                        O e-mail do colaborador está vinculado à conta de acesso e não pode ser alterado.
                    </span>
                )}
            </div>

            {/* Additional Contacts Section */}
            {collectionName === 'customers' && (
                <div className="md:col-span-2 mt-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300 flex items-center gap-2">
                            <i className="bi bi-person-plus-fill text-blue-600"></i>
                            Contatos Adicionais (Referência / Fixos)
                        </h4>
                        <button
                            type="button"
                            onClick={addAdditionalContact}
                            className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                        >
                            + Adicionar Novo
                        </button>
                    </div>

                    {(formData.additionalContacts || []).length === 0 && (
                        <p className="text-[10px] text-slate-400 font-bold italic py-4 text-center">
                            Nenhum contato secundário cadastrado.
                        </p>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {(formData.additionalContacts || []).map((contact, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 animate-slide-up flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 flex flex-col gap-2 w-full">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nome do Contato</label>
                                    <input
                                        type="text"
                                        value={contact.name}
                                        onChange={(e) => updateAdditionalContact(idx, 'name', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 placeholder:font-normal"
                                        placeholder="Ex: Mãe, Sócio, Marido..."
                                    />
                                </div>
                                <div className="flex-1 flex flex-col gap-2 w-full">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Telefone / Celular</label>
                                    <PatternFormat
                                        format="(##) #####-####"
                                        type="text"
                                        value={contact.phone}
                                        onChange={(e: any) => updateAdditionalContact(idx, 'phone', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeAdditionalContact(idx)}
                                    className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                >
                                    <i className="bi bi-trash-fill"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};
