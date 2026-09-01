import { useEffect, useMemo, useRef, useState } from "react";
import DropdownPortal from "@/components/shared/DropdownPortal";
import { subscribeToPeople } from "@/pages/utils/personService";
import CustomerData from "../../types/customerData.type";
import Person from "../../types/person.type";
import { ValidationErrors } from "../../utils/validations";
import { toTitleCase } from "../../utils/formatters";
import PersonFormModal from "../Registrations/shared/PersonFormModal";

interface Props {
    customerData: CustomerData;
    setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
    errors: ValidationErrors;
    isPickup: boolean;
    marketingOrigin?: string;
    setMarketingOrigin?: (origin: string) => void;
    isBudget?: boolean;
}

const EMPTY_ADDRESS = {
    cep: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", observation: "",
};

const CustomerDataInputs = ({ customerData, setCustomerData, errors, setMarketingOrigin }: Props) => {
    const [customers, setCustomers] = useState<Person[]>([]);
    const [searchTerm, setSearchTerm] = useState(customerData.fullName || "");
    const [isOpen, setIsOpen] = useState(false);
    const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const hasError = Boolean(errors.customer_fullName || errors.customer_phone);

    useEffect(() => subscribeToPeople("customers", (items) => {
        setCustomers(items.filter((customer) => customer.active && !customer.deleted));
    }), []);

    useEffect(() => {
        if (!isOpen) setSearchTerm(customerData.fullName || "");
    }, [customerData.fullName, isOpen]);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, []);

    const filteredCustomers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return customers;
        return customers.filter((customer) =>
            (customer.fullName || customer.tradeName || "").toLowerCase().includes(term)
            || (customer.phone || "").includes(term)
        );
    }, [customers, searchTerm]);

    const clearCustomer = () => {
        setCustomerData({
            id: undefined, fullName: "", phone: "", noPhone: false,
            noAddress: false, fullAddress: EMPTY_ADDRESS, additionalContacts: [],
        });
        setSearchTerm("");
        setIsOpen(false);
    };

    const selectCustomer = (customer: Person) => {
        const formattedName = toTitleCase(customer.fullName || customer.tradeName || "");
        setCustomerData({
            id: customer.id,
            fullName: formattedName,
            phone: customer.phone || "",
            noPhone: customer.noPhone || false,
            noAddress: customer.noAddress || Boolean(customer.fullAddress?.noAddress),
            fullAddress: customer.fullAddress || EMPTY_ADDRESS,
            additionalContacts: customer.additionalContacts || [],
        });
        setSearchTerm(formattedName);
        if (customer.marketingOrigin) setMarketingOrigin?.(customer.marketingOrigin);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="mb-2 ml-1 flex items-center justify-between gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Selecionar cliente
                </label>
                <button
                    type="button"
                    onClick={() => { setIsOpen(false); setIsNewCustomerOpen(true); }}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    <i className="bi bi-plus-lg" />
                    Novo cliente
                </button>
            </div>
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => {
                        const value = event.target.value;
                        setSearchTerm(value);
                        setIsOpen(value.trim().length >= 2);
                        if (!value) clearCustomer();
                    }}
                    onFocus={() => setIsOpen(searchTerm.trim().length >= 2)}
                    placeholder="Busque pelo nome ou telefone..."
                    className={`w-full border-b-2 bg-transparent px-3 py-3 pr-16 text-sm outline-none transition-colors placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 ${hasError ? "border-red-500 focus:border-red-600" : "border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500"}`}
                />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3">
                    {searchTerm && (
                        <button type="button" onClick={clearCustomer} className="text-slate-400 transition-colors hover:text-slate-700" title="Limpar cliente">
                            <i className="bi bi-x-circle-fill" />
                        </button>
                    )}
                    <i className={`bi bi-chevron-down text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
            </div>

            {hasError && <p className="mt-2 text-xs font-bold text-red-500">{errors.customer_fullName || errors.customer_phone}</p>}

            <DropdownPortal anchorRef={wrapperRef} isOpen={isOpen}>
                <div className="mt-1 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    {filteredCustomers.length === 0 ? (
                        <p className="p-4 text-center text-sm text-slate-400">Nenhum cliente encontrado.</p>
                    ) : filteredCustomers.map((customer) => (
                        <button key={customer.id} type="button" onClick={() => selectCustomer(customer)} className="flex w-full items-center gap-4 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                            <strong className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">{toTitleCase(customer.fullName || customer.tradeName)}</strong>
                            {customer.phone && <small className="shrink-0 text-xs text-slate-400">{customer.phone}</small>}
                            {customer.fullAddress?.street && (
                                <small className="min-w-0 max-w-[40%] truncate text-xs text-slate-400">
                                    {toTitleCase(customer.fullAddress.street)}{customer.fullAddress.number ? `, ${customer.fullAddress.number}` : ""}
                                </small>
                            )}
                            {customerData.id === customer.id && <i className="bi bi-check-lg shrink-0 text-blue-600" />}
                        </button>
                    ))}
                </div>
            </DropdownPortal>

            <PersonFormModal
                isOpen={isNewCustomerOpen}
                onClose={() => setIsNewCustomerOpen(false)}
                onSuccess={(customer) => {
                    setCustomers((current) => [...current.filter((item) => item.id !== customer.id), customer]);
                    selectCustomer(customer);
                    setIsNewCustomerOpen(false);
                }}
                collectionName="customers"
                title="Cliente"
            />
        </div>
    );
};

export default CustomerDataInputs;
