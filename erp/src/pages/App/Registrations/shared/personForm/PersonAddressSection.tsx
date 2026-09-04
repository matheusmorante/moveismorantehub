import React from "react";
import Person from "@/pages/types/person.type";
import { AddressAutocompleteInput } from "@/components/shared/AddressAutocompleteInput";
import AddressVerificationMap from "@/pages/App/SalesOrder/AddressVerificationMap";

interface PersonAddressSectionProps {
    formData: Partial<Person>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
    isEmployee: boolean;
    collectionName: string;
    isAddressOpen: boolean;
    setIsAddressOpen: React.Dispatch<React.SetStateAction<boolean>>;
    routeUrl: string;
    handleAddressChange: (field: string, value: string) => void;
    handleCepBlur: (e: React.FocusEvent<HTMLInputElement>) => Promise<void>;
}

export const PersonAddressSection: React.FC<PersonAddressSectionProps> = ({
    formData,
    setFormData,
    isEmployee,
    collectionName,
    isAddressOpen,
    setIsAddressOpen,
    routeUrl,
    handleAddressChange,
    handleCepBlur,
}) => {
    return (
        <div className="flex flex-col gap-4">
            <div 
                onClick={() => { if (isEmployee) setIsAddressOpen(prev => !prev); }}
                className={`flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 ${isEmployee ? 'cursor-pointer select-none group/addr py-1 hover:border-slate-300 dark:hover:border-slate-700 transition-colors' : ''}`}
            >
                <div className="flex items-center gap-2">
                    <i className="bi bi-geo-alt-fill text-blue-600"></i>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300">
                        Endereço {collectionName === 'customers' && !formData.noAddress && <span className="text-red-500">*</span>}
                    </h4>
                    {isEmployee && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                            (Opcional - clique para {isAddressOpen ? 'recolher' : 'expandir'})
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {collectionName !== 'suppliers' && collectionName !== 'employees' && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, noAddress: !formData.noAddress }); }}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${formData.noAddress ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-400 border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
                        >
                            {formData.noAddress ? <><i className="bi bi-geo-alt mr-1"></i> Informar Endereço</> : 'Não Informar'}
                        </button>
                    )}
                    {isEmployee && (
                        <i className={`bi ${isAddressOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-slate-400 group-hover/addr:text-blue-600 transition-colors text-xs font-bold`} />
                    )}
                </div>
            </div>

            {(!isEmployee || isAddressOpen) && (
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all ${formData.noAddress ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">CEP</label>
                        <input
                            type="text"
                            value={formData.fullAddress?.cep || ""}
                            onChange={(e) => handleAddressChange("cep", e.target.value)}
                            onBlur={handleCepBlur}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                        />
                    </div>
                    <AddressAutocompleteInput
                        value={formData.fullAddress?.street || ""}
                        onChange={(val) => handleAddressChange("street", val)}
                        onSelectAddress={(data) => {
                            setFormData((prev: Partial<Person>) => ({
                                ...prev,
                                fullAddress: {
                                    ...prev.fullAddress!,
                                    street: data.street,
                                    number: data.number || prev.fullAddress?.number || "",
                                    neighborhood: data.neighborhood || prev.fullAddress?.neighborhood || "",
                                    city: data.city || prev.fullAddress?.city || "",
                                    state: data.state || prev.fullAddress?.state || "PR",
                                    cep: data.cep || prev.fullAddress?.cep || "",
                                    mapsUrl: data.mapsUrl || prev.fullAddress?.mapsUrl,
                                }
                            }));
                        }}
                        cityHint={formData.fullAddress?.city}
                        stateHint={formData.fullAddress?.state || "PR"}
                        label="Logradouro"
                        required={collectionName === 'customers'}
                        routeUrl={routeUrl}
                        className="md:col-span-2 flex flex-col gap-2 relative group/field"
                    />
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Número {collectionName === 'customers' && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={formData.fullAddress?.number || ""}
                            onChange={(e) => handleAddressChange("number", e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Bairro</label>
                        <input
                            type="text"
                            value={formData.fullAddress?.neighborhood || ""}
                            onChange={(e) => handleAddressChange("neighborhood", e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Complemento</label>
                        <input
                            type="text"
                            value={formData.fullAddress?.complement || ""}
                            onChange={(e) => handleAddressChange("complement", e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                            placeholder="Opcional"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Cidade {collectionName === 'customers' && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={formData.fullAddress?.city || ""}
                            onChange={(e) => handleAddressChange("city", e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Estado (UF)</label>
                        <input
                            type="text"
                            maxLength={2}
                            value={formData.fullAddress?.state || "PR"}
                            onChange={(e) => handleAddressChange("state", e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                            placeholder="PR"
                        />
                    </div>
                    {collectionName === 'customers' && (
                        <>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tipo de Moradia</label>
                                <select
                                    value={(formData.fullAddress as any)?.housingType || ""}
                                    onChange={(e) => handleAddressChange("housingType", e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                >
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Casa">Casa</option>
                                    <option value="Apartamento">Apartamento</option>
                                    <option value="Condomínio Residencial">Condomínio Residencial</option>
                                    <option value="Kitnet">Kitnet</option>
                                    <option value="Estabelecimento Comercial">Estabelecimento Comercial</option>
                                    <option value="Chácara">Chácara</option>
                                </select>
                            </div>
                            <div className="md:col-span-3 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                        <i className="bi bi-geo-alt-fill text-red-500"></i>
                                        Link do Google Maps da Localização <span className="text-[9px] font-normal text-slate-400">(Opcional - caso não localize por rua/número)</span>
                                    </label>
                                    {formData.fullAddress?.mapsUrl && (
                                        <a
                                            href={formData.fullAddress.mapsUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        >
                                            <i className="bi bi-box-arrow-up-right"></i>
                                            Testar Link
                                        </a>
                                    )}
                                </div>
                                <input
                                    type="url"
                                    value={formData.fullAddress?.mapsUrl || ""}
                                    onChange={(e) => handleAddressChange("mapsUrl", e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 placeholder:font-normal"
                                    placeholder="https://maps.app.goo.gl/... ou link copiado do Google Maps"
                                />
                            </div>
                            <div className="md:col-span-3 flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Observações sobre o Endereço</label>
                                <input
                                    type="text"
                                    value={formData.fullAddress?.observation || ""}
                                    onChange={(e) => handleAddressChange("observation", e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                    placeholder="Ponto de referência, etc."
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            {collectionName === 'customers' && (
                <div className="md:col-span-3 mt-4">
                    <AddressVerificationMap 
                        address={{
                            street: formData.fullAddress?.street || "",
                            number: formData.fullAddress?.number || "",
                            neighborhood: formData.fullAddress?.neighborhood || "",
                            city: formData.fullAddress?.city || ""
                        }}
                    />
                </div>
            )}
        </div>
    );
};
