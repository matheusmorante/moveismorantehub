import React, { useState, useEffect, useRef } from "react";
import Person from "../../../types/person.type";
import { savePerson, getPersonByIdentifiers } from '@/pages/utils/personService';
import { toast } from "react-toastify";
import { capitalizePerson, toTitleCase } from "../../../utils/formatters";
import SmartInput from "../../../../components/SmartInput";
import { getSettings } from "../../../utils/settingsService";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;
import { getAddressByCep, searchAddressSuggestions } from "../../../utils/maps";
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import AddressVerificationMap from "../../SalesOrder/AddressVerificationMap";

interface PersonFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (person: Person) => void;
    person?: Person | null;
    collectionName: string;
    title: string;
}

const PersonFormModal = ({ isOpen, onClose, onSuccess, person, collectionName, title }: PersonFormModalProps) => {
    const [formData, setFormData] = useState<Partial<Person>>({
        personType: "PF",
        fullName: "",
        socialName: "",
        cpfCnpj: "",
        email: "",
        phone: "",
        noPhone: false,
        active: true,
        fullAddress: {
            cep: "",
            street: "",
            number: "",
            neighborhood: "",
            city: "",
            housingType: "",
            complement: "",
            observation: ""
        },
        marketingOrigin: "",
        position: ""
    });

    const isEmployee = collectionName === 'employees';

    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [settings, setSettings] = useState(getSettings());
    const isInitialMount = useRef(true);

    const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
    const [isStreetSuggestionsOpen, setIsStreetSuggestionsOpen] = useState(false);
    const streetWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (streetWrapperRef.current && !streetWrapperRef.current.contains(e.target as Node)) {
                setIsStreetSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (person) {
            setFormData({
                ...person,
                personType: person.personType || "PF",
                fullAddress: {
                    cep: person.fullAddress?.cep || "",
                    street: person.fullAddress?.street || "",
                    number: person.fullAddress?.number || "",
                    neighborhood: person.fullAddress?.neighborhood || "",
                    city: person.fullAddress?.city || "",
                    housingType: (person.fullAddress as any)?.housingType || "",
                    complement: person.fullAddress?.complement || "",
                    observation: person.fullAddress?.observation || ""
                }
            });
        } else {
            setFormData({
                personType: "PF",
                fullName: "",
                socialName: "",
                cpfCnpj: "",
                email: "",
                phone: "",
                noPhone: false,
                active: true,
                fullAddress: {
                    cep: "",
                    street: "",
                    number: "",
                    neighborhood: "",
                    city: "",
                    housingType: "",
                    complement: "",
                    observation: ""
                },
                marketingOrigin: "",
                position: title === "Vendedor" ? "Vendedor" : ""
            });
        }
        isInitialMount.current = true;
    }, [person, isOpen]);

    const handleAddressChange = (field: string, value: string) => {
        setFormData((prev: Partial<Person>) => {
            const currentAddress = prev.fullAddress || {
                cep: "", street: "", number: "", neighborhood: "",
                city: "", housingType: "", complement: "", observation: ""
            };
            return {
                ...prev,
                fullAddress: { ...currentAddress, [field]: value }
            };
        });
    };

    const handleStreetChange = async (val: string) => {
        handleAddressChange('street', val);
        if (val.length >= 3) {
            setLoadingSuggestions(true);
            setIsStreetSuggestionsOpen(true);
            try {
                const suggestions = await searchAddressSuggestions(val, formData.fullAddress?.city);
                setStreetSuggestions(suggestions);
                // No need to set isOpen true here as we did it before
                if (suggestions.length === 0) setIsStreetSuggestionsOpen(false);
            } catch {
                setStreetSuggestions([]);
                setIsStreetSuggestionsOpen(false);
            } finally {
                setLoadingSuggestions(false);
            }
        } else {
            setStreetSuggestions([]);
            setIsStreetSuggestionsOpen(false);
            setLoadingSuggestions(false);
        }
    };

    const handleSelectAddressSuggestion = (suggestion: any) => {
        const addr = suggestion.address;
        setFormData((prev: Partial<Person>) => ({
            ...prev,
            fullAddress: {
                ...prev.fullAddress!,
                street: addr.road || addr.pedestrian || addr.suburb || suggestion.display_name.split(',')[0],
                neighborhood: addr.neighbourhood || addr.suburb || prev.fullAddress?.neighborhood || "",
                city: addr.city || addr.town || addr.village || prev.fullAddress?.city || "",
                cep: addr.postcode ? addr.postcode.replace(/\D/g, '') : prev.fullAddress?.cep || ""
            }
        }));
        setIsStreetSuggestionsOpen(false);
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cepValue = e.target.value.replace(/\D/g, "");
        if (cepValue.length === 8) {
            try {
                const data = await getAddressByCep(cepValue);
                if (data && !(data as any).error) {
                    setFormData((prev: Partial<Person>) => ({
                        ...prev,
                        fullAddress: {
                            ...prev.fullAddress!,
                            street: data.street || prev.fullAddress?.street || "",
                            neighborhood: data.neighborhood || prev.fullAddress?.neighborhood || "",
                            city: data.city || prev.fullAddress?.city || "",
                        }
                    }));
                }
            } catch (error) { /* ignore */ }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const { requiredFields } = settings;

        if (!formData.fullName) {
            toast.error(formData.personType === 'PJ' ? "A Razão Social é obrigatória." : "O nome é obrigatório.");
            return;
        }

        if (requiredFields.customer?.phone && !formData.noPhone && (!formData.phone || formData.phone.trim() === '')) {
            toast.error("O telefone é obrigatório.");
            return;
        }

        if (requiredFields.customer?.cpfCnpj && (!formData.cpfCnpj || formData.cpfCnpj.trim() === '')) {
            toast.error("O CPF/CNPJ é obrigatório.");
            return;
        }

        if (requiredFields.customer?.email && (!formData.email || formData.email.trim() === '')) {
            toast.error("O e-mail é obrigatório.");
            return;
        }

        if (requiredFields.customer?.rgIe && (!(formData as any).rgIe || (formData as any).rgIe.trim() === '')) {
            toast.error("O RG/IE é obrigatório.");
            return;
        }

        if (collectionName === 'employees' && requiredFields.customer?.position && (!formData.position || formData.position.trim() === '')) {
            toast.error("O Cargo Principal é obrigatório.");
            return;
        }

        if (requiredFields.customer?.address) {
            const addr = formData.fullAddress;
            if (!addr?.street || !addr?.number || !addr?.neighborhood || !addr?.city) {
                toast.error("O endereço completo (Rua, Número, Bairro, Cidade) é obrigatório.");
                return;
            }
        }

        if (collectionName === 'customers' && !formData.marketingOrigin) {
            toast.error("Por favor, informe se o cliente é de tráfego pago.");
            return;
        }

        // Check for duplicates and cross-registration rules according to:
        // "Clientes não podem ser fornecedores. Fornecedores podem ser clientes."
        if (!person) { 
            const existing = await getPersonByIdentifiers({
                cpfCnpj: formData.cpfCnpj || "",
                email: formData.email || "",
                phone: formData.phone || ""
            });

            if (existing) {
                if (collectionName === 'suppliers') {
                    if (existing.type === 'customers') {
                        toast.error("Este CPF/CNPJ já existe como CLIENTE. Clientes não podem ser cadastrados como fornecedores.");
                        return;
                    }
                    if (existing.type === 'suppliers') {
                        toast.error("Este fornecedor já está cadastrado.");
                        return;
                    }
                } else if (collectionName === 'customers') {
                    if (existing.type === 'suppliers') {
                        toast.info("Este registro já existe como FORNECEDOR e já está disponível na lista de clientes.");
                        onClose(); // Prevent creation but close modal as if successful since they are already available
                        return;
                    }
                    if (existing.type === 'customers') {
                        toast.error("Este cliente já está cadastrado.");
                        return;
                    }
                } else if (collectionName === 'employees') {
                    if (existing.type === 'customers') {
                        toast.error("Clientes registrados não podem ser cadastrados como funcionários.");
                        return;
                    }
                    if (existing.type === 'employees') {
                        toast.error("Este funcionário já está cadastrado.");
                        return;
                    }
                }
            }
        }

        setLoading(true);
        try {
            const dataToSave = capitalizePerson({ ...formData, isDraft: false } as Person);
            if (dataToSave.position?.trim() === "") {
                dataToSave.position = null as any;
            }
            const savedPerson = await savePerson(collectionName, dataToSave);
            toast.success(person ? "Atualizado com sucesso!" : "Criado com sucesso!");
            if (onSuccess) onSuccess(savedPerson);
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {person ? `Editar ${title}` : `Novo ${title}`}
                        </h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                            {person ? `Editando ID: ${person.id}` : `Preencha as informações do novo ${title.toLowerCase()}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-auto">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* PF/PJ Toggle */}
                        {!isEmployee && (
                            <div className="md:col-span-2 flex items-center gap-6 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tipo de Pessoa:</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, personType: 'PF' })}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.personType === 'PF' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                                    >
                                        Física (PF)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, personType: 'PJ' })}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.personType === 'PJ' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                                    >
                                        Jurídica (PJ)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Marketing Origin (Paid Traffic) */}
                        {collectionName === 'customers' && (
                            <div className="md:col-span-2 flex items-center gap-6 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Cliente por tráfego pago? <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, marketingOrigin: 'paid' })}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.marketingOrigin === 'paid' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                                    >
                                        Sim (Tráfego Pago)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, marketingOrigin: 'organic' })}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.marketingOrigin === 'organic' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                                    >
                                        Não (Loja Física)
                                    </button>
                                </div>
                            </div>
                        )}

                        {collectionName === 'employees' && (
                            <div className="md:col-span-2">
                                <SmartInput
                                    label={`Cargo Principal ${settings.requiredFields.customer?.position ? '*' : ''}`}
                                    value={formData.position || ""}
                                    onValueChange={(val) => setFormData({ ...formData, position: val })}
                                    patterns={['Vendedor', 'Gerente', 'Entregador', 'Montador', 'Auxiliar']}
                                    tableName="people"
                                    columnName="position"
                                    placeholder="Ex: Vendedor, Gerente..."
                                    icon="bi-person-badge"
                                />
                            </div>
                        )}

                        <div className={`${(formData.personType === 'PJ' && !isEmployee) ? 'md:col-span-1' : 'md:col-span-2'}`}>
                            <SmartInput
                                label={(isEmployee ? 'Nome' : (formData.personType === 'PJ' ? 'Razão Social' : 'Nome Completo')) + ' *'}
                                required
                                value={formData.fullName}
                                onValueChange={(val) => setFormData({ ...formData, fullName: val })}
                                tableName="people"
                                columnName="full_name"
                                placeholder={isEmployee ? 'Nome do Funcionário' : (formData.personType === 'PJ' ? 'Razão Social da Empresa' : 'Nome do Cliente')}
                                icon="bi-person"
                            />
                        </div>

                        {formData.personType === 'PJ' && (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nome Fantasia</label>
                                <input
                                    type="text"
                                    value={formData.tradeName || ""}
                                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                    placeholder="Nome Popular / Fantasia"
                                />
                            </div>
                        )}

                        {formData.personType === 'PF' && (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nome Social</label>
                                <input
                                    type="text"
                                    value={formData.socialName || ""}
                                    onChange={(e) => setFormData({ ...formData, socialName: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                    placeholder="Como a pessoa prefere ser chamada"
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                {isEmployee ? 'CPF' : (formData.personType === 'PJ' ? 'CNPJ' : 'CPF')} {settings.requiredFields.customer?.cpfCnpj ? <span className="text-red-500">*</span> : null}
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

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    Telefone {settings.requiredFields.customer?.phone && !formData.noPhone ? <span className="text-red-500">*</span> : null}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, noPhone: !formData.noPhone, phone: !formData.noPhone ? "" : formData.phone })}
                                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${formData.noPhone ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    {formData.noPhone ? <><i className="bi bi-phone-mute mr-1"></i> S/ Telefone</> : 'Não possui?'}
                                </button>
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
                                <button type="button"
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
                            </div>
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">E-mail {settings.requiredFields.customer?.email ? <span className="text-red-500">*</span> : null}</label>
                            <input
                                type="email"
                                value={formData.email || ""}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                placeholder="exemplo@email.com"
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
                    </div>

                    <div className="flex flex-col gap-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 pb-2 flex items-center gap-2">
                            <i className="bi bi-geo-alt-fill text-blue-600"></i>
                            Endereço {settings.requiredFields.customer?.address ? <span className="text-red-500">*</span> : null}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <div className="md:col-span-2 flex flex-col gap-2 relative group/field" ref={streetWrapperRef}>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Rua / Logradouro</label>
                                <input
                                    type="text"
                                    value={formData.fullAddress?.street || ""}
                                    onChange={(e) => handleStreetChange(e.target.value)}
                                    onFocus={() => { if (streetSuggestions.length > 0) setIsStreetSuggestionsOpen(true); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                />
                                <DropdownPortal anchorRef={streetWrapperRef} isOpen={isStreetSuggestionsOpen}>
                                    <div className="mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                                        {loadingSuggestions && (
                                            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                                <div className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                                                Buscando endereços...
                                            </div>
                                        )}
                                        {!loadingSuggestions && streetSuggestions.length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-400">
                                                Nenhum endereço encontrado.
                                            </div>
                                        )}
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
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Número</label>
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Cidade</label>
                                <input
                                    type="text"
                                    value={formData.fullAddress?.city || ""}
                                    onChange={(e) => handleAddressChange("city", e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tipo de Moradia {settings.requiredFields.customer?.address ? <span className="text-red-500">*</span> : null}</label>
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Observações sobre o Endereço</label>
                                <input
                                    type="text"
                                    value={formData.fullAddress?.observation || ""}
                                    onChange={(e) => handleAddressChange("observation", e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                    placeholder="Ponto de referência, etc."
                                />
                            </div>
                        </div>

                        {/* Map Verification */}
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
                    </div>
                </form>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    {collectionName === 'employees' && !person && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <i className="bi bi-check-all text-lg" />}
                            Salvar e Selecionar
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {person ? "Salvar Alterações" : `Criar ${title}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonFormModal;
