import React, { useEffect, useState, useRef } from "react";
import CustomerData from "../../types/customerData.type";
import Person from "../../types/person.type";
import { subscribeToPeople, updatePerson } from '@/pages/utils/personService';
import DropdownPortal from "@/components/shared/DropdownPortal";
import { ValidationErrors } from "../../utils/validations";
import CustomerSearchModal from "./CustomerSearchModal";
import PersonFormModal from "../Registrations/shared/PersonFormModal";
import { getAddressByCep, searchAddressSuggestions } from "../../utils/maps";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;
import { toast } from "react-toastify";
import AddressVerificationMap from "./AddressVerificationMap";

interface Props {
    customerData: CustomerData;
    setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
    errors: ValidationErrors;
    isPickup: boolean;
}

const EMPTY_ADDRESS = {
    cep: '', street: '', number: '',
    complement: '', neighborhood: '', city: '', observation: ''
};

const CustomerDataInputs = ({ customerData, setCustomerData, errors, isPickup }: Props) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [customers, setCustomers] = useState<Person[]>([]);
    const [searchTerm, setSearchTerm] = useState(customerData.fullName || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
    const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
    const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
    const [isStreetSuggestionsOpen, setIsStreetSuggestionsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const streetWrapperRef = useRef<HTMLDivElement>(null);
    const lastStreetSearchRef = useRef<string>("");
    const [isSearchingStreet, setIsSearchingStreet] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToPeople('customers', (data) => {
            setCustomers(data.filter(c => c.active && !c.deleted));
        });
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    useEffect(() => {
        if (!isDropdownOpen) setSearchTerm(customerData.fullName || '');
    }, [customerData.fullName, isDropdownOpen]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (streetWrapperRef.current && !streetWrapperRef.current.contains(e.target as Node)) {
                setIsStreetSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const clearCustomer = () => {
        setCustomerData({ id: undefined, fullName: '', phone: '', noPhone: false, fullAddress: EMPTY_ADDRESS });
        setSearchTerm('');
    };

    const handleSelectCustomer = (customer: Person) => {
        setCustomerData({
            id: customer.id,
            fullName: customer.fullName || customer.tradeName || '',
            phone: customer.phone || '',
            noPhone: customer.noPhone || false,
            fullAddress: customer.fullAddress || EMPTY_ADDRESS
        });
        setSearchTerm(customer.fullName || customer.tradeName || '');
        setIsDropdownOpen(false);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);
        if (e.target.value === '') clearCustomer();
    };

    const updateAddress = (field: keyof typeof EMPTY_ADDRESS, value: string) => {
        setCustomerData(prev => ({
            ...prev,
            fullAddress: { ...prev.fullAddress, [field]: value }
        }));
    };

    const handleStreetChange = async (val: string) => {
        updateAddress('street', val);
        lastStreetSearchRef.current = val;

        if (val.length >= 3) {
            setIsSearchingStreet(true);
            try {
                const suggestions = await searchAddressSuggestions(val, customerData.fullAddress?.city);
                if (lastStreetSearchRef.current === val) {
                    setStreetSuggestions(suggestions);
                    setIsStreetSuggestionsOpen(suggestions.length > 0);
                }
            } catch (e) {
                console.error("Erro nas sugestões:", e);
                if (lastStreetSearchRef.current === val) {
                    setStreetSuggestions([]);
                    setIsStreetSuggestionsOpen(false);
                }
            } finally {
                if (lastStreetSearchRef.current === val) {
                    setIsSearchingStreet(false);
                }
            }
        } else {
            setStreetSuggestions([]);
            setIsStreetSuggestionsOpen(false);
            setIsSearchingStreet(false);
        }
    };

    const handleSelectAddressSuggestion = (suggestion: any) => {
        const addr = suggestion.address;
        setCustomerData(prev => ({
            ...prev,
            fullAddress: {
                ...prev.fullAddress,
                street: addr.road || addr.pedestrian || addr.suburb || suggestion.display_name.split(',')[0],
                neighborhood: addr.neighbourhood || addr.suburb || "",
                city: addr.city || addr.town || addr.village || "",
                cep: addr.postcode ? addr.postcode.replace(/\D/g, '') : prev.fullAddress.cep
            }
        }));
        setIsStreetSuggestionsOpen(false);
    };

    // Real-time Database Sync Logic (Debounced)
    useEffect(() => {
        if (!customerData.id || customerData.fullName === 'Consumidor Final') return;

        setIsSyncing(true);
        const timer = setTimeout(async () => {
            try {
                await updatePerson('customers', customerData.id!, {
                    fullName: customerData.fullName,
                    phone: customerData.phone,
                    noPhone: customerData.noPhone,
                    fullAddress: customerData.fullAddress
                });
                toast.success("Cadastro do cliente atualizado automaticamente", { 
                    toastId: 'customer-sync-success',
                    autoClose: 2000,
                    position: "bottom-right"
                });
            } catch (e) {
                console.error("Erro ao sincronizar dados do cliente:", e);
                toast.error("Falha ao sincronizar dados com o servidor");
            } finally {
                setIsSyncing(false);
            }
        }, 2000); // 2s debounce to avoid too many writes

        return () => {
            clearTimeout(timer);
        };
    }, [customerData.fullName, customerData.phone, customerData.noPhone, customerData.fullAddress, customerData.id]);

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const data = await getAddressByCep(cep);
                if (data && !(data as any).error) {
                    setCustomerData(prev => ({
                        ...prev,
                        fullAddress: {
                            ...prev.fullAddress,
                            street: data.street || prev.fullAddress.street,
                            neighborhood: data.neighborhood || prev.fullAddress.neighborhood,
                            city: data.city || prev.fullAddress.city,
                        }
                    }));
                }
            } catch { /* ignore */ }
        }
    };

    const filteredCustomers = customers.filter(c => {
        const s = searchTerm.toLowerCase();
        return (c.fullName || '').toLowerCase().includes(s) ||
            (c.tradeName || '').toLowerCase().includes(s) ||
            (c.phone || '').includes(searchTerm);
    });

    const isNameError = !!errors['customer_fullName'];
    const isPhoneError = !!errors['customer_phone'];
    const isStreetError = !!errors['customer_street'];
    const isNumberError = !!errors['customer_number'];
    const isCityError = !!errors['customer_city'];

    const field = (hasError?: boolean) =>
        `w-full bg-white dark:bg-slate-900 border px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 transition-all ${hasError
            ? 'border-red-500 focus:ring-red-500/30 ring-4 ring-red-500/10'
            : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
        }`;

    return (
        <div className="space-y-6" ref={wrapperRef}>

            {/* ── Customer search ─────────────────────────────── */}
            <div className="flex flex-col relative w-full group">
                <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Selecionar Cliente
                    </label>
                    {isSyncing && (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 animate-pulse flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Sincronizando Cadastro Central...
                        </span>
                    )}
                </div>

                <div className="relative flex gap-2">
                    {/* Search input */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            className={`w-full bg-slate-50 dark:bg-slate-900 border px-4 py-3 rounded-2xl text-sm outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-slate-300 transition-all ${isNameError
                                ? 'border-red-500 focus:border-red-600 ring-4 ring-red-500/10'
                                : (customerData.fullName && searchTerm === customerData.fullName)
                                    ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/10'
                                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                                }`}
                            placeholder="Busque pelo Nome ou Telefone..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => setIsDropdownOpen(true)}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {searchTerm && (
                                <button type="button" onClick={clearCustomer}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <i className="bi bi-x-circle-fill" />
                                </button>
                            )}
                            <i className={`bi bi-chevron-down text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </div>

                    {/* Advanced search */}
                    <button type="button"
                        onClick={() => { setIsDropdownOpen(false); setIsSearchModalOpen(true); }}
                        title="Busca avançada"
                        className="shrink-0 flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 font-black text-xs uppercase tracking-widest">
                        <i className="bi bi-search" />
                        <span className="hidden sm:inline">Buscar</span>
                    </button>

                    {customerData.id && customerData.fullName !== 'Consumidor Final' && (
                        <button type="button"
                            onClick={() => setIsEditCustomerModalOpen(true)}
                            title="Editar cadastro completo do cliente"
                            className="shrink-0 flex items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all shadow-lg shadow-amber-200 dark:shadow-none active:scale-95 font-black text-xs uppercase tracking-widest">
                            <i className="bi bi-pencil-square" />
                            <span className="hidden sm:inline">Editar</span>
                        </button>
                    )}

                    {/* Consumidor Final - HIDE FOR DELIVERY */}
                    {isPickup && (
                        <button type="button"
                            onClick={() => {
                                setCustomerData({
                                    fullName: 'Consumidor Final',
                                    phone: '',
                                    noPhone: true,
                                    fullAddress: EMPTY_ADDRESS
                                });
                                setSearchTerm('Consumidor Final');
                                setIsDropdownOpen(false);
                            }}
                            title="Consumidor Final / Sem informações do cliente"
                            className="shrink-0 flex items-center gap-2 px-4 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest border border-slate-300 dark:border-slate-700">
                            <i className="bi bi-person-x-fill text-sm" />
                            <span className="hidden lg:inline">Consumidor Final</span>
                        </button>
                    )}

                    {/* New customer */}
                    <button type="button"
                        onClick={() => { setIsDropdownOpen(false); setIsNewCustomerModalOpen(true); }}
                        title="Cadastrar Novo Cliente"
                        className="shrink-0 flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95 font-black text-xs uppercase tracking-widest">
                        <i className="bi bi-person-plus-fill" />
                        <span className="hidden sm:inline">Novo</span>
                    </button>
                </div>

                {/* Error tooltip */}
                {isNameError && (
                    <div className="absolute left-0 -top-8 hidden group-hover:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap">
                        {errors['customer_fullName'] || errors['customer_phone']}
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                    </div>
                )}

                {/* Dropdown */}
                <DropdownPortal anchorRef={wrapperRef} isOpen={isDropdownOpen}>
                    <div className="mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-slide-up max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredCustomers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400">Nenhum cliente encontrado.</div>
                        ) : (
                            filteredCustomers.map(c => (
                                <button key={c.id} type="button"
                                    onClick={() => handleSelectCustomer(c)}
                                    className="w-full text-left p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between last:border-0">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.fullName || c.tradeName}</p>
                                        {c.phone && (
                                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <i className="bi bi-telephone" /> {c.phone}
                                            </span>
                                        )}
                                    </div>
                                    {customerData.fullName === (c.fullName || c.tradeName) && (
                                        <i className="bi bi-check-circle-fill text-blue-500 text-lg" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </DropdownPortal>
            </div>

            {/* ── Customer detail fields (shown when a name is present) ── */}
            {customerData.fullName && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 animate-fade-in space-y-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <i className="bi bi-person-lines-fill" /> Dados do Cliente
                    </p>

                    {/* Nome + Telefone */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative group/field">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">
                                Nome do Cliente <span className="text-red-500">*</span>
                            </label>
                            <input type="text" className={field(isNameError)}
                                placeholder="Nome Completo"
                                value={customerData.fullName}
                                onChange={e => setCustomerData(prev => ({ ...prev, fullName: e.target.value }))}
                            />
                            {isNameError && (
                                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                    {errors['customer_fullName']}
                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 relative group/field">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 flex items-center justify-between pr-2">
                                <span>
                                    Telefone / Celular {!customerData.noPhone && <span className="text-red-500">*</span>}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCustomerData(prev => ({ ...prev, noPhone: !prev.noPhone, phone: !prev.noPhone ? "" : prev.phone }))}
                                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${customerData.noPhone ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    {customerData.noPhone ? <><i className="bi bi-phone-mute mr-1"></i> S/ Telefone</> : 'Não possui?'}
                                </button>
                            </label>
                            <div className="flex gap-2">
                                <PatternFormat
                                    format="(##) #####-####"
                                    className={`${field(isPhoneError && !customerData.noPhone)} ${customerData.noPhone ? 'opacity-50 grayscale' : ''}`}
                                    placeholder={customerData.noPhone ? "NÃO POSSUI TELEFONE" : "(00) 00000-0000"}
                                    value={customerData.phone}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                                    disabled={customerData.noPhone}
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
                                    className={`shrink-0 w-12 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-md active:scale-95 ${customerData.noPhone ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                                >
                                    <i className="bi bi-whatsapp text-lg"></i>
                                </button>
                            </div>
                            {isPhoneError && (
                                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                    {errors['customer_phone']}
                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <i className="bi bi-geo-alt-fill text-blue-500" /> Endereço de Entrega
                        </p>

                        {/* CEP + Rua + Número */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="md:w-36">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">CEP</label>
                                <input type="text" className={field()} placeholder="00000-000" maxLength={9}
                                    value={customerData.fullAddress?.cep || ''}
                                    onChange={e => updateAddress('cep', e.target.value)}
                                    onBlur={handleCepBlur}
                                />
                            </div>
                            <div className="flex-1 relative group/field" ref={streetWrapperRef}>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Rua / Avenida</label>
                                <input type="text" className={field(isStreetError)} placeholder="Nome da rua"
                                    value={customerData.fullAddress?.street || ''}
                                    onChange={e => handleStreetChange(e.target.value)}
                                    onFocus={() => { if (streetSuggestions.length > 0) setIsStreetSuggestionsOpen(true); }}
                                />
                                {isSearchingStreet && (
                                    <div className="absolute right-3 top-[34px] -translate-y-1/2">
                                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                {isStreetError && (
                                    <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                        {errors['customer_street']}
                                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                    </div>
                                )}
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
                            <div className="md:w-28 relative group/field">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Número</label>
                                <input type="text" className={field(isNumberError)} placeholder="123"
                                    value={customerData.fullAddress?.number || ''}
                                    onChange={e => updateAddress('number', e.target.value)}
                                />
                                {isNumberError && (
                                    <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                        {errors['customer_number']}
                                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Complemento + Bairro + Cidade */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Complemento</label>
                                <input type="text" className={field()} placeholder="Apto, Bloco..."
                                    value={customerData.fullAddress?.complement || ''}
                                    onChange={e => updateAddress('complement', e.target.value)}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Bairro</label>
                                <input type="text" className={field()} placeholder="Seu bairro"
                                    value={customerData.fullAddress?.neighborhood || ''}
                                    onChange={e => updateAddress('neighborhood', e.target.value)}
                                />
                            </div>
                            <div className="flex-1 relative group/field">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Cidade</label>
                                <input type="text" className={field(isCityError)} placeholder="Nome da cidade"
                                    value={customerData.fullAddress?.city || ''}
                                    onChange={e => updateAddress('city', e.target.value)}
                                />
                                {isCityError && (
                                    <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                        {errors['customer_city']}
                                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Observação */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">
                                Ponto de Referência / Observação
                            </label>
                            <input type="text"
                                className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-amber-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-amber-300 dark:placeholder:text-amber-700/50"
                                placeholder="Ex: Casa verde em frente à padaria..."
                                value={customerData.fullAddress?.observation || ''}
                                onChange={e => updateAddress('observation', e.target.value)}
                            />
                        </div>

                        {/* Map Verification */}
                        <div className="pt-2 animate-fade-in">
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
                </div>
            )}

            {/* ── Modals ────────────────────────────────────────── */}
            {isSearchModalOpen && (
                <CustomerSearchModal
                    onSelect={(selected: any) => {
                        setCustomerData({
                            ...selected,
                            fullAddress: selected.fullAddress || selected.address || EMPTY_ADDRESS
                        });
                        setSearchTerm(selected.fullName || '');
                    }}
                    onClose={() => setIsSearchModalOpen(false)}
                    onAddNew={() => {
                        setIsSearchModalOpen(false);
                        setIsNewCustomerModalOpen(true);
                    }}
                />
            )}

            <PersonFormModal
                isOpen={isNewCustomerModalOpen}
                onClose={() => setIsNewCustomerModalOpen(false)}
                onSuccess={handleSelectCustomer}
                collectionName="customers"
                title="Cliente"
            />

            {isEditCustomerModalOpen && (
                <PersonFormModal
                    isOpen={isEditCustomerModalOpen}
                    onClose={() => setIsEditCustomerModalOpen(false)}
                    onSuccess={(updated) => {
                        handleSelectCustomer(updated);
                        setIsEditCustomerModalOpen(false);
                    }}
                    person={customers.find(c => c.id === customerData.id) || null}
                    collectionName="customers"
                    title="Cliente"
                />
            )}
        </div>
    );
};

export default CustomerDataInputs;
