import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Person from "../../../types/person.type";
import { savePerson, getPersonByIdentifiers, isEmployeeEmailTaken } from '@/pages/utils/personService';
import { getUserProfileByEmail, getUserProfileByIdOrEmail, saveEmployeeInProfile } from '@/pages/utils/employeeProfileService';
import { toast } from "react-toastify";
import { capitalizePerson, toTitleCase } from "../../../utils/formatters";
import SmartInput from "../../../../components/SmartInput";
import { getSettings } from "../../../utils/settingsService";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;
import { getAddressByCep, searchAddressSuggestions } from "../../../utils/maps";
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import AddressVerificationMap from "../../SalesOrder/AddressVerificationMap";
import { UserRole } from "@/context/AuthContext";
import { getPrimaryRole } from "@/pages/utils/accessRoles";

const EMPLOYEE_ROLES: { value: UserRole; label: string; description: string; icon: string }[] = [
    { value: 'administrator', label: 'Administrador', description: 'Acesso total a todas as áreas do sistema', icon: 'bi-shield-shaded' },
    { value: 'manager', label: 'Gestor', description: 'Gestão operacional, estoque e relatórios', icon: 'bi-briefcase-fill' },
    { value: 'seller', label: 'Vendedor', description: 'Vendas, pedidos e clientes', icon: 'bi-tag-fill' },
    { value: 'deliverer', label: 'Entregador / Montador', description: 'Rotas de entrega e montagens', icon: 'bi-truck' },
    { value: 'pending', label: 'Sem Acesso', description: 'Acesso bloqueado temporariamente', icon: 'bi-slash-circle' },
];

interface PersonFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (person: Person) => void;
    person?: Person | null;
    collectionName: string;
    title: string;
}

const PersonFormModal = ({ isOpen, onClose, onSuccess, person, collectionName, title }: PersonFormModalProps) => {
    const isEmployee = collectionName === 'employees';

    const [formData, setFormData] = useState<Partial<Person>>({
        personType: "PF",
        fullName: "",
        socialName: "",
        cpfCnpj: "",
        email: "",
        phone: "",
        noPhone: false,
        active: true,
        type: collectionName as any,
        fullAddress: {
            cep: "",
            street: "",
            number: "",
            neighborhood: "",
            city: "",
            state: "",
            housingType: "",
            complement: "",
            mapsUrl: "",
            observation: ""
        },
        noAddress: false,
        marketingOrigin: "",
        position: "",
        role: "seller",
        roles: ["seller"],
        additionalContacts: [],
        observations: ""
    });

    const [loading, setLoading] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [settings] = useState(getSettings());
    const isInitialMount = useRef(true);
    const [isAddressOpen, setIsAddressOpen] = useState(!isEmployee);

    const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
    const [isStreetSuggestionsOpen, setIsStreetSuggestionsOpen] = useState(false);
    const streetWrapperRef = useRef<HTMLDivElement>(null);

    const toggleEmployeeRole = (roleValue: UserRole) => {
        const currentRoles = (formData.roles && formData.roles.length > 0)
            ? [...formData.roles]
            : (formData.role ? [formData.role] : ['seller']);

        let nextRoles: UserRole[];

        if (roleValue === 'pending') {
            nextRoles = ['pending'];
        } else {
            const withoutPending = currentRoles.filter(r => r !== 'pending');
            if (withoutPending.includes(roleValue)) {
                nextRoles = withoutPending.filter(r => r !== roleValue);
                if (nextRoles.length === 0) {
                    nextRoles = ['pending'];
                }
            } else {
                nextRoles = [...withoutPending, roleValue];
            }
        }

        const defaultRoleNames: Record<UserRole, string> = {
            administrator: 'Administrador',
            manager: 'Gestor',
            seller: 'Vendedor',
            deliverer: 'Entregador / Montador',
            accountant: 'Contador',
            pending: 'Sem Acesso'
        };

        const primaryRole = getPrimaryRole(nextRoles);

        setFormData(prev => ({
            ...prev,
            roles: nextRoles,
            role: primaryRole,
            position: (!prev.position || prev.position.trim() === '' || EMPLOYEE_ROLES.some(er => er.label === prev.position) || prev.position.includes('/'))
                ? (nextRoles.filter(r => r !== 'pending').map(r => defaultRoleNames[r]).join(' / ') || defaultRoleNames[primaryRole])
                : prev.position
        }));
    };

    const handleEmployeeEmailBlur = async () => {
        if (!isEmployee || !formData.email?.trim()) return;

        try {
            const isTaken = await isEmployeeEmailTaken(formData.email, person?.id);
            if (isTaken) {
                toast.error("Este e-mail já está sendo utilizado por outro colaborador.");
                return;
            }

            const profile = await getUserProfileByEmail(formData.email);
            if (!profile) return;

            const profileRoles = profile.roles && profile.roles.length > 0
                ? profile.roles
                : (profile.role ? [profile.role] : ['seller']);

            setFormData((current) => ({
                ...current,
                fullName: current.fullName || profile.full_name || profile.email,
                position: current.position || profile.position || "",
                role: current.role || profile.role || getPrimaryRole(profileRoles),
                roles: current.roles && current.roles.length > 0 ? current.roles : profileRoles,
            }));
            toast.info("Dados e cargos da conta vinculados ao funcionário.");
        } catch (error) {
            console.error("Erro ao localizar conta pelo e-mail:", error);
        }
    };

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
            const initialRoles = (person.roles && person.roles.length > 0)
                ? person.roles
                : (person.role ? [person.role] : ['seller']);

            setFormData({
                ...person,
                role: person.role || getPrimaryRole(initialRoles),
                roles: initialRoles,
                personType: person.personType || "PF",
                fullAddress: {
                    cep: person.fullAddress?.cep || "",
                    street: person.fullAddress?.street || "",
                    number: person.fullAddress?.number || "",
                    neighborhood: person.fullAddress?.neighborhood || "",
                    city: person.fullAddress?.city || "",
                    state: person.fullAddress?.state || "",
                    housingType: (person.fullAddress as any)?.housingType || "",
                    complement: person.fullAddress?.complement || "",
                    mapsUrl: person.fullAddress?.mapsUrl || (person.fullAddress as any)?.googleMapsUrl || (person.fullAddress as any)?.mapsLink || "",
                    observation: person.fullAddress?.observation || ""
                },
                additionalContacts: person.additionalContacts || [],
                observations: person.observations || ""
            });
            if (isEmployee && person.email) {
                getUserProfileByEmail(person.email).then((prof) => {
                    if (prof?.roles && prof.roles.length > 0) {
                        setFormData((prev) => ({
                            ...prev,
                            roles: prof.roles || prev.roles,
                            role: prof.role || getPrimaryRole(prof.roles || []) || prev.role
                        }));
                    } else if (prof?.role) {
                        setFormData((prev) => ({
                            ...prev,
                            role: prof.role || prev.role,
                            roles: [prof.role]
                        }));
                    }
                }).catch(() => {});
            }
            if (isEmployee) {
                const hasAddressData = !!(person.fullAddress?.street || person.fullAddress?.cep || person.fullAddress?.city);
                setIsAddressOpen(hasAddressData);
            } else {
                setIsAddressOpen(true);
            }
        } else {
            setIsAddressOpen(!isEmployee);
            setFormData({
                personType: "PF",
                fullName: "",
                socialName: "",
                cpfCnpj: "",
                email: "",
                phone: "",
                noPhone: false,
                active: true,
                type: collectionName as any,
                role: "seller",
                roles: ["seller"],
                fullAddress: {
                    cep: "",
                    street: "",
                    number: "",
                    neighborhood: "",
                    city: "",
                    state: "",
                    housingType: "",
                    complement: "",
                    mapsUrl: "",
                    observation: ""
                },
                noAddress: false,
                marketingOrigin: "",
                position: title === "Vendedor" ? "Vendedor" : "",
                additionalContacts: [],
                observations: ""
            });
        }
        isInitialMount.current = true;
    }, [person, isOpen]);

    const handleAddressChange = (field: string, value: string) => {
        setFormData((prev: Partial<Person>) => {
            const currentAddress = prev.fullAddress || {
                cep: "", street: "", number: "", neighborhood: "",
                city: "", housingType: "", complement: "", mapsUrl: "", observation: ""
            };
            return {
                ...prev,
                fullAddress: { ...currentAddress, [field]: value }
            };
        });
    };

    // Auto-enable noAddress for "Consumidor Final" in registration
    useEffect(() => {
        if (!formData.fullName) return;
        const isFinalConsumer = formData.fullName.toLowerCase().trim() === 'consumidor final';
        if (isFinalConsumer && !formData.noAddress) {
            setFormData(prev => ({ ...prev, noAddress: true }));
        }
    }, [formData.fullName]);

    const handleStreetChange = async (val: string) => {
        handleAddressChange('street', val);
        if (val.length >= 2) {
            setLoadingSuggestions(true);
            setIsStreetSuggestionsOpen(true);
            try {
                const suggestions = await searchAddressSuggestions(val, formData.fullAddress?.city);
                setStreetSuggestions(suggestions);
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
        const streetName = addr.road || addr.pedestrian || addr.suburb || suggestion.display_name.split(',')[0];
        const neighborhood = addr.neighbourhood || addr.suburb || formData.fullAddress?.neighborhood || "";
        const city = addr.city || addr.town || addr.village || formData.fullAddress?.city || "";
        const state = addr.state || formData.fullAddress?.state || "PR";
        const cep = addr.postcode ? addr.postcode.replace(/\D/g, '') : formData.fullAddress?.cep || "";

        const mapsQuery = encodeURIComponent(`${streetName}, ${neighborhood}, ${city} - ${state}`);
        const generatedMapsUrl = formData.fullAddress?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

        setFormData((prev: Partial<Person>) => ({
            ...prev,
            fullAddress: {
                ...prev.fullAddress!,
                street: streetName,
                neighborhood: neighborhood,
                city: city,
                state: state,
                cep: cep,
                mapsUrl: generatedMapsUrl
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
                            state: data.state || prev.fullAddress?.state || "",
                        }
                    }));
                }
            } catch (error) { /* ignore */ }
        }
    };

    const addAdditionalContact = () => {
        const current = formData.additionalContacts || [];
        setFormData({ ...formData, additionalContacts: [...current, { name: "", phone: "" }] });
    };

    const removeAdditionalContact = (index: number) => {
        const current = formData.additionalContacts || [];
        setFormData({ ...formData, additionalContacts: current.filter((_, i) => i !== index) });
    };

    const updateAdditionalContact = (index: number, field: 'name' | 'phone', value: string) => {
        const current = formData.additionalContacts || [];
        const updated = current.map((c, i) => i === index ? { ...c, [field]: value } : c);
        setFormData({ ...formData, additionalContacts: updated });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const { requiredFields } = settings;

        if (!formData.fullName) {
            toast.error(formData.personType === 'PJ' ? "A Razão Social é obrigatória." : "O nome é obrigatório.");
            return;
        }

        if (collectionName === 'customers' && requiredFields.customer?.phone && !formData.noPhone && (!formData.phone || formData.phone.trim() === '')) {
            toast.error("O telefone é obrigatório.");
            return;
        }

        if (collectionName !== 'suppliers' && requiredFields.customer?.cpfCnpj && (!formData.cpfCnpj || formData.cpfCnpj.trim() === '')) {
            toast.error("O CPF/CNPJ é obrigatório.");
            return;
        }

        if ((isEmployee || (collectionName !== 'suppliers' && requiredFields.customer?.email)) && (!formData.email || formData.email.trim() === '')) {
            toast.error("O e-mail é obrigatório.");
            return;
        }

        if (collectionName !== 'suppliers' && requiredFields.customer?.rgIe && (!(formData as any).rgIe || (formData as any).rgIe.trim() === '')) {
            toast.error("O RG/IE é obrigatório.");
            return;
        }

        if (collectionName === 'employees' && requiredFields.customer?.position && (!formData.position || formData.position.trim() === '')) {
            toast.error("O Cargo Principal é obrigatório.");
            return;
        }

        if (collectionName === 'customers' && !formData.noAddress) {
            const addr = formData.fullAddress;
            if (!addr?.street || !addr?.number || !addr?.city) {
                toast.error("Rua, Número e Cidade são obrigatórios no endereço.");
                return;
            }
        }

        if (collectionName === 'customers' && !formData.marketingOrigin) {
            toast.error("Por favor, informe se o cliente é de tráfego pago.");
            return;
        }

        if (isEmployee && formData.email && formData.email.trim() !== '') {
            const isEmailTaken = await isEmployeeEmailTaken(formData.email, person?.id);
            if (isEmailTaken) {
                toast.error("Já existe outro colaborador cadastrado com este e-mail.");
                return;
            }
        }

        if (!person) { 
            const existing = await getPersonByIdentifiers({
                cpfCnpj: formData.cpfCnpj || "",
                email: formData.email || "",
                phone: formData.phone || ""
            }, collectionName);

            if (existing) {
                if (collectionName === 'suppliers') {
                    toast.error("Este fornecedor já está cadastrado.");
                    return;
                } else if (collectionName === 'customers') {
                    toast.warn("Aviso: Já existe um cliente cadastrado com este CPF/CNPJ, e-mail ou celular.");
                } else if (collectionName === 'employees') {
                    toast.error("Este funcionário já está cadastrado.");
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const dataToSave = capitalizePerson({ ...formData, isDraft: false } as Person);
            if (dataToSave.position?.trim() === "") {
                dataToSave.position = null as any;
            }
            if (isEmployee) {
                if (!dataToSave.roles || dataToSave.roles.length === 0) {
                    dataToSave.roles = dataToSave.role ? [dataToSave.role] : ['seller'];
                }
                dataToSave.role = dataToSave.role || getPrimaryRole(dataToSave.roles);
            }

            const savedPerson = await savePerson(formData.type || collectionName, dataToSave);

            if (isEmployee) {
                try {
                    const userProfile = await getUserProfileByIdOrEmail(person?.id, dataToSave.email);
                    if (userProfile) {
                        await saveEmployeeInProfile(userProfile, dataToSave);
                    }
                } catch (profErr) {
                    console.warn("Aviso ao sincronizar profile do colaborador:", profErr);
                }
            }

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

    const modalContent = (
        <div className="fixed inset-0 z-[9900] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {person 
                                ? (title.startsWith("Editar") ? title : `Editar ${title}`) 
                                : (title.startsWith("Novo") ? title : `Novo ${title}`)}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-auto">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {!isEmployee && (
                            <div className="md:col-span-2 flex items-center gap-6 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tipo de Pessoa:</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, personType: 'PF' })}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.personType === 'PF' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                                    >
                                        Pessoa Física (PF)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, personType: 'PJ' })}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.personType === 'PJ' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                                    >
                                        Pessoa Jurídica (PJ)
                                    </button>
                                </div>
                            </div>
                        )}

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
                            <div className="md:col-span-2 flex flex-col gap-4 bg-slate-50/80 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                            <i className="bi bi-shield-lock-fill text-blue-600" />
                                            Cargos e Níveis de Acesso (Selecione um ou mais) <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                            {(formData.roles || []).length} cargo(s) selecionado(s)
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {EMPLOYEE_ROLES.map((r) => {
                                            const isSelected = (formData.roles || [formData.role || 'seller']).includes(r.value);
                                            return (
                                                <button
                                                    key={r.value}
                                                    type="button"
                                                    onClick={() => toggleEmployeeRole(r.value)}
                                                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer relative group ${
                                                        isSelected
                                                            ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-900/40 ring-2 ring-blue-500/20 shadow-sm'
                                                            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                        <i className={`bi ${isSelected ? 'bi-check-lg text-sm font-black' : r.icon + ' text-xs'}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                                            {r.label}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                                                            {r.description}
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-3 right-3">
                                                        <i className={`bi ${isSelected ? 'bi-check-circle-fill text-blue-600 dark:text-blue-400' : 'bi-circle text-slate-300 dark:text-slate-700'} text-xs`} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <SmartInput
                                        label={`Função / Cargo Personalizado ${settings.requiredFields.customer?.position ? '*' : ''}`}
                                        value={formData.position || ""}
                                        onValueChange={(val) => setFormData({ ...formData, position: val })}
                                        patterns={['Vendedor', 'Gerente', 'Entregador', 'Montador', 'Auxiliar', 'Administrador']}
                                        tableName="people"
                                        columnName="position"
                                        placeholder="Ex: Vendedor Interno, Gerente de Vendas..."
                                        icon="bi-person-badge"
                                    />
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
                                    if (collectionName === 'customers') {
                                        setFormData((current) => ({ ...current, fullName: toTitleCase(current.fullName) }));
                                    }
                                }}
                                disableSuggestions={true}
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

                        {formData.personType === 'PF' && collectionName === 'customers' && (
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
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">E-mail {isEmployee || (collectionName !== 'suppliers' && settings.requiredFields.customer?.email) ? <span className="text-red-500">*</span> : null}</label>
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
                    </div>

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
                                <div className="md:col-span-2 flex flex-col gap-2 relative group/field" ref={streetWrapperRef}>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Rua / Logradouro {collectionName === 'customers' && <span className="text-red-500">*</span>}</label>
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
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Estado</label>
                                    <input
                                        type="text"
                                        value={formData.fullAddress?.state || ""}
                                        onChange={(e) => handleAddressChange("state", e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                        placeholder="Opcional"
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
                        {collectionName !== 'employees' && (
                            <div className="md:col-span-3 mt-4 flex flex-col gap-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 pb-2 flex items-center gap-2">
                                    <i className="bi bi-journal-text text-blue-600"></i>
                                    Observações Importantes
                                </h4>
                                <textarea
                                    value={formData.observations || ""}
                                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 placeholder:font-normal"
                                    placeholder="Descreva aqui informações extras sobre este cliente, detalhes sobre os contatos de referência ou outras especificações relevantes..."
                                />
                            </div>
                        )}
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

    return createPortal(modalContent, document.body);
};

export default PersonFormModal;
