import React from "react";

export interface Filters {
    dateRange: { start: string; end: string };
    dateType: "personalizado" | "hoje" | "esse_mes" | "mes_passado" | "ultimo_semestre" | "esse_ano";
    customerName: string;
    productName: string;
    status: string;
    orderType: string;
    seller: string;
    valueRange: { min: number; max: number };
    sortBy: string;
    sortOrder: "asc" | "desc";
    multiSort: { key: string; order: "asc" | "desc" }[];
    searchId?: string;
}

interface OrderFiltersProps {
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

const OrderFilters = ({ filters, setFilters }: OrderFiltersProps) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.includes(".")) {
            const [parent, child] = name.split(".");
            setFilters(prev => ({
                ...prev,
                [parent]: {
                    ...(prev[parent as keyof Filters] as any),
                    [child]: value
                }
            }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDateTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value as Filters['dateType'];
        const now = new Date();
        let start = "";
        let end = "";

        const formatDate = (date: Date) => {
            return date.toISOString().split('T')[0];
        };

        switch (type) {
            case "hoje":
                start = formatDate(now);
                end = formatDate(now);
                break;
            case "esse_mes":
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                start = formatDate(firstDayOfMonth);
                end = formatDate(lastDayOfMonth);
                break;
            case "mes_passado":
                start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
                end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
                break;
            case "ultimo_semestre":
                start = formatDate(new Date(now.getFullYear(), now.getMonth() - 6, 1));
                end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
                break;
            case "esse_ano":
                start = formatDate(new Date(now.getFullYear(), 0, 1));
                end = formatDate(new Date(now.getFullYear(), 11, 31));
                break;
            case "personalizado":
                start = filters.dateRange.start;
                end = filters.dateRange.end;
                break;
        }

        setFilters(prev => ({
            ...prev,
            dateType: type,
            dateRange: { start, end }
        }));
    };

    const resetFilters = () => {
        setFilters({
            dateRange: { start: "", end: "" },
            dateType: "personalizado",
            customerName: "",
            productName: "",
            status: "",
            orderType: "",
            seller: "",
            valueRange: { min: 0, max: 1000000 },
            sortBy: "date",
            sortOrder: "desc",
            multiSort: [{ key: 'date', order: 'desc' }],
            searchId: ""
        });
    };

    return (
        <aside className="w-full bg-white dark:bg-slate-900 flex flex-col h-full overflow-y-auto transition-colors">
            <div className="p-4 md:p-8 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <i className="bi bi-filter-left text-blue-600 dark:text-blue-500"></i>
                    Filtros
                </h3>
                <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">Refine sua busca de pedidos</p>
            </div>

            <div className="p-4 md:p-8 flex flex-col gap-6">
                {filters.searchId && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Filtrando por ID:</span>
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-400 font-mono">{filters.searchId.slice(-8)}</span>
                        </div>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, searchId: "" }))}
                            className="p-2 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors"
                        >
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>
                )}

                {/* Search Inputs */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Cliente</label>
                        <div className="relative">
                            <i className="bi bi-person absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"></i>
                            <input
                                type="text"
                                name="customerName"
                                value={filters.customerName}
                                onChange={handleChange}
                                placeholder="Nome do cliente..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700 min-w-[160px]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Produto</label>
                        <div className="relative">
                            <i className="bi bi-box absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"></i>
                            <input
                                type="text"
                                name="productName"
                                value={filters.productName}
                                onChange={handleChange}
                                placeholder="Título do produto..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700 min-w-[160px]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</label>
                        <select
                            name="status"
                            value={filters.status}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300 min-w-[140px]"
                        >
                            <option value="">Todos os Status</option>
                            <option value="draft">Rascunho</option>
                            <option value="waiting">Aguardando</option>
                            <option value="scheduled">Agendado</option>
                            <option value="in_transit">Em Trânsito</option>
                            <option value="delivered">Entregue</option>
                            <option value="fulfilled">Atendido</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tipo de Pedido</label>
                        <select
                            name="orderType"
                            value={filters.orderType}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300 min-w-[140px]"
                        >
                            <option value="">Todos os Tipos</option>
                            <option value="sale">Venda</option>
                            <option value="assistance">Assistência</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Vendedor</label>
                        <div className="relative">
                            <i className="bi bi-person-badge absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"></i>
                            <input
                                type="text"
                                name="seller"
                                value={filters.seller}
                                onChange={handleChange}
                                placeholder="Nome do vendedor..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700 min-w-[160px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Date Range Selection */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 pb-2">Período</h4>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tipo de Período</label>
                            <select
                                name="dateType"
                                value={filters.dateType}
                                onChange={handleDateTypeChange}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300 min-w-[140px]"
                            >
                                <option value="personalizado" className="dark:bg-slate-900">Personalizado</option>
                                <option value="hoje" className="dark:bg-slate-900">Hoje</option>
                                <option value="esse_mes" className="dark:bg-slate-900">Esse Mês</option>
                                <option value="mes_passado" className="dark:bg-slate-900">Mês Passado</option>
                                <option value="ultimo_semestre" className="dark:bg-slate-900">Último Semestre</option>
                                <option value="esse_ano" className="dark:bg-slate-900">Esse Ano</option>
                            </select>
                        </div>

                        {filters.dateType === "personalizado" && (
                            <div className="grid grid-cols-1 gap-4 animate-fade-in">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Início</label>
                                    <input
                                        type="date"
                                        name="dateRange.start"
                                        value={filters.dateRange.start}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-slate-300"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Fim</label>
                                    <input
                                        type="date"
                                        name="dateRange.end"
                                        value={filters.dateRange.end}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-slate-300"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Values Selection */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Valor Mínimo</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 text-xs font-bold">R$</span>
                            <input
                                type="number"
                                name="valueRange.min"
                                value={filters.valueRange.min}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-slate-300"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-slate-50 dark:border-slate-800">
                <button
                    onClick={resetFilters}
                    className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                >
                    <i className="bi bi-arrow-counterclockwise"></i>
                    Limpar Filtros
                </button>
            </div>
        </aside>
    );
};

export default OrderFilters;
