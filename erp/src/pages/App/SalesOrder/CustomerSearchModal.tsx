import React, { useState, useEffect, useMemo } from "react";
import CustomerData from "../../types/customerData.type";
import Person from "../../types/person.type";
import Order from "../../types/order.type";
import { subscribeToPeople } from '@/pages/utils/personService';
import { subscribeToOrders } from "../../utils/orderHistoryService";

interface CustomerSearchEntry {
    id: string;
    fullName: string;
    phone: string;
    source: 'cadastro' | 'pedido';
    totalOrders: number;
    lastOrder?: string;
    customerData: CustomerData;
}

interface Props {
    onSelect: (customer: CustomerData) => void;
    onClose: () => void;
    onAddNew?: () => void;
}

const CustomerSearchModal = ({ onSelect, onClose, onAddNew }: Props) => {
    const [search, setSearch] = useState("");
    const [people, setPeople] = useState<Person[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingPeople, setLoadingPeople] = useState(true);
    const [loadingOrders, setLoadingOrders] = useState(true);

    useEffect(() => {
        // Fetch everyone to allow filtering matching the user's request
        const unsubCustomers = subscribeToPeople('customers', (data) => {
            setPeople(prev => {
                const combined = [...prev, ...data];
                // Unique by ID
                const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
                return unique.filter(p => p.active && !p.deleted);
            });
            setLoadingPeople(false);
        });

        const unsubEmployees = subscribeToPeople('employees', (data) => {
            setPeople(prev => {
                const combined = [...prev, ...data];
                // Unique by ID
                const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
                return unique.filter(p => p.active && !p.deleted);
            });
        });

        return () => { 
            if (unsubCustomers) unsubCustomers(); 
            if (unsubEmployees) unsubEmployees();
        };
    }, []);

    useEffect(() => {
        const unsub = subscribeToOrders((data) => {
            setOrders(data.filter(o => !o.deleted && o.customerData?.fullName));
            setLoadingOrders(false);
        });
        return unsub;
    }, []);

    // Build unified customer list: merge cadastro + order history
    const customerList = useMemo<CustomerSearchEntry[]>(() => {
        const map = new Map<string, CustomerSearchEntry>();

        // Add from People registry
        people.forEach(p => {
            const name = (p.fullName || p.tradeName || '').trim();
            if (!name) return;
            const key = name.toLowerCase();

            map.set(key, {
                id: p.id || key,
                fullName: name,
                phone: p.phone || '',
                source: 'cadastro',
                totalOrders: 0,
                customerData: {
                    fullName: name,
                    phone: p.phone || '',
                    noPhone: p.noPhone || false,
                    fullAddress: p.fullAddress || {
                        cep: '', street: '', number: '', complement: '',
                        neighborhood: '', city: '', observation: ''
                    }
                }
            });
        });

        // Enrich from order history
        orders.forEach(o => {
            const name = (o.customerData?.fullName || '').trim();
            if (!name) return;
            const key = name.toLowerCase();

            const existing = map.get(key);
            if (existing) {
                existing.totalOrders += 1;
                if (!existing.lastOrder || o.date > (existing.lastOrder || '')) {
                    existing.lastOrder = o.date;
                }
                // Update address if order has more complete data
                if (o.customerData?.fullAddress?.street && !existing.customerData.fullAddress.street) {
                    existing.customerData = {
                        ...existing.customerData,
                        ...o.customerData
                    };
                }
            } else {
                map.set(key, {
                    id: key,
                    fullName: name,
                    phone: o.customerData?.phone || '',
                    source: 'pedido',
                    totalOrders: 1,
                    lastOrder: o.date,
                    customerData: {
                        fullName: name,
                        phone: o.customerData?.phone || '',
                        noPhone: o.customerData?.noPhone || false,
                        fullAddress: o.customerData?.fullAddress || {
                            cep: '', street: '', number: '', complement: '',
                            neighborhood: '', city: '', observation: ''
                        }
                    }
                });
            }
        });

        // Sort: registered first, then by total orders desc, then alphabetically
        return Array.from(map.values()).sort((a, b) => {
            if (a.source === 'cadastro' && b.source !== 'cadastro') return -1;
            if (b.source === 'cadastro' && a.source !== 'cadastro') return 1;
            if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
            return a.fullName.localeCompare(b.fullName);
        });
    }, [people, orders]);

    const [selectedType, setSelectedType] = useState<'all' | 'customer' | 'employee' | 'supplier'>('all');

    const filtered = useMemo(() => {
        let list = customerList;
        
        // Apply type filter
        if (selectedType !== 'all') {
            list = list.filter(c => {
                const p = people.find(p => p.id === c.id);
                if (!p) return selectedType === 'customer'; // Default guest to customer
                if (selectedType === 'customer') return p.type === 'customers';
                if (selectedType === 'employee') return p.type === 'employees';
                if (selectedType === 'supplier') return p.type === 'suppliers';
                return true;
            });
        }

        if (!search.trim()) return list;
        const s = search.toLowerCase();
        return list.filter(c =>
            c.fullName.toLowerCase().includes(s) ||
            c.phone.includes(s) ||
            (c.customerData.fullAddress.city || '').toLowerCase().includes(s) ||
            (c.customerData.fullAddress.neighborhood || '').toLowerCase().includes(s)
        );
    }, [customerList, search, selectedType, people]);

    const isLoading = loadingPeople || loadingOrders;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[3px] animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800"
                style={{ height: '90vh', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                            <i className="bi bi-people-fill text-white text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Busca Avançada de Clientes
                            </h2>
                            <p className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-widest mt-0.5">
                                Cadastro + Histórico de Pedidos
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {onAddNew && (
                            <button
                                onClick={onAddNew}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95 font-black text-[10px] uppercase tracking-widest"
                            >
                                <i className="bi bi-person-plus-fill" />
                                <span className="hidden sm:inline">Novo Cliente</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <i className="bi bi-x-lg text-xl" />
                        </button>
                    </div>
                </div>

                {/* Search Bar & Filters */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Busque por nome, telefone, cidade ou bairro..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <i className="bi bi-x-circle-fill" />
                                </button>
                            )}
                        </div>

                        {/* Type Tabs */}
                        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl w-fit">
                            {[
                                { id: 'all', label: 'Todos', icon: 'bi-grid' },
                                { id: 'customer', label: 'Clientes', icon: 'bi-person' },
                                { id: 'employee', label: 'Funcionários', icon: 'bi-person-badge' },
                                { id: 'supplier', label: 'Fornecedores', icon: 'bi-truck' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedType(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedType === tab.id ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <i className={`bi ${tab.icon}`} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Cadastrado
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Histórico de Pedidos
                        </span>
                        <span className="ml-auto">
                            {isLoading ? 'Carregando...' : `${filtered.length} registro(s)`}
                        </span>
                    </div>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                            <i className="bi bi-hourglass-split animate-spin text-2xl" />
                            <span className="text-sm font-bold">Carregando clientes...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
                            <i className="bi bi-person-x text-4xl opacity-30" />
                            <div className="text-center">
                                <p className="text-sm font-bold">Nenhum cliente encontrado</p>
                                <p className="text-xs text-slate-400">Tente outro nome, telefone ou cidade</p>
                            </div>
                            {onAddNew && (
                                <button
                                    onClick={onAddNew}
                                    className="mt-2 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-xl shadow-blue-200 dark:shadow-none active:scale-95 font-black text-xs uppercase tracking-widest"
                                >
                                    <i className="bi bi-person-plus-fill" />
                                    Cadastrar Novo Cliente
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm z-10">
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Telefone</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Endereço</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Pedidos</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Origem</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filtered.map((c) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => { onSelect(c.customerData); onClose(); }}
                                        className="hover:bg-blue-50/60 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 ${c.source === 'cadastro' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                                    {c.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    {c.fullName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {c.phone || <span className="italic text-slate-300">—</span>}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 hidden sm:table-cell">
                                            <span className="text-xs text-slate-400 font-medium">
                                                {c.customerData.fullAddress.city
                                                    ? `${c.customerData.fullAddress.neighborhood ? c.customerData.fullAddress.neighborhood + ', ' : ''}${c.customerData.fullAddress.city}`
                                                    : <span className="italic text-slate-300">Sem endereço</span>
                                                }
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {c.totalOrders > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">
                                                    <i className="bi bi-cart-check" />
                                                    {c.totalOrders}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                c.source === 'cadastro'
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                <i className={`bi ${c.source === 'cadastro' ? 'bi-person-check' : 'bi-receipt'}`} />
                                                {c.source === 'cadastro' ? 'Cadastro' : 'Pedido'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => { onSelect(c.customerData); onClose(); }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none"
                                            >
                                                Selecionar
                                                <i className="bi bi-arrow-right" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-[10px] text-slate-400 font-bold">
                        Clique em qualquer linha para selecionar o cliente
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerSearchModal;
