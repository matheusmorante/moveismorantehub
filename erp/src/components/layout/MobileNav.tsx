import { Link, useNavigate } from "react-router-dom";
import logoMorante from "../../assets/brand-mark.svg";
import { MenuKey } from "../../AppLayout";
import { useAuth } from "../../context/AuthContext";

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
    activeMenu: MenuKey;
    setActiveMenu: (menu: MenuKey) => void;
}

const menuItems: any[] = [
    {
        key: 'products' as MenuKey,
        label: 'Produtos',
        icon: 'bi-box-seam',
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        links: [
            { to: '/products', icon: 'bi-list-ul', iconColor: 'text-indigo-500', label: 'Lista de Produtos' },
            { to: '/products/characteristics', icon: 'bi-sliders2', iconColor: 'text-blue-500', label: 'Características' },
            { to: '/products/categories', icon: 'bi-tag-fill', iconColor: 'text-teal-500', label: 'Ambientes e Categorias' },
            { to: '/products/compositions', icon: 'bi-diagram-3-fill', iconColor: 'text-amber-500', label: 'Composições' },
            { to: '/products/reconciliation/suppliers', icon: 'bi-magic', iconColor: 'text-purple-500', label: 'Conciliação' },
        ]
    },
    {
        key: 'stock' as MenuKey,
        label: 'Estoque',
        icon: 'bi-box-seam-fill',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        links: [
            { type: 'header', label: 'OPERAÇÃO' },
            { type: 'link', to: '/estoque/movimentacoes', icon: 'bi-arrow-left-right', iconColor: 'text-emerald-500', label: 'Movimentações' },
            { type: 'link', to: '/estoque/inventarios', icon: 'bi-journal-check', iconColor: 'text-emerald-600', label: 'Inventário' },
            { type: 'link', to: '/estoque/recebimentos', icon: 'bi-clipboard-check', iconColor: 'text-emerald-500', label: 'Recebimentos de Mercadorias', shortLabel: 'Recebimentos' },
            { type: 'link', to: '/settings/stock', icon: 'bi-gear-fill', iconColor: 'text-slate-500', label: 'Configurações de Estoque' },
            { type: 'header', label: 'COMPRAS' },
            { type: 'link', to: '/estoque/pedidos-compra', icon: 'bi-cart-fill', iconColor: 'text-blue-500', label: 'Pedidos de Compra' },
            { type: 'link', to: '/estoque/fornecedores', icon: 'bi-truck', iconColor: 'text-amber-500', label: 'Fornecedores' },
            { type: 'header', label: 'IMPRESSÃO DE ETIQUETAS' },
            { type: 'link', to: '/estoque/etiquetas?category=identificacao', icon: 'bi-upc-scan', iconColor: 'text-purple-500', label: 'Etiquetas de Identificação', shortLabel: 'Identificação' },
            { type: 'link', to: '/estoque/etiquetas?category=precos', icon: 'bi-tag-fill', iconColor: 'text-emerald-500', label: 'Etiquetas de Preço', shortLabel: 'Preço' },
        ]
    },
    {
        key: 'registrations' as MenuKey,
        label: 'Pessoas',
        icon: 'bi-people-fill',
        color: 'text-violet-500',
        bg: 'bg-violet-50 dark:bg-violet-900/20',
        links: [
            { to: '/registrations/customers', icon: 'bi-person-fill', iconColor: 'text-violet-500', label: 'Clientes' },
            { to: '/registrations/employees', icon: 'bi-person-badge-fill', iconColor: 'text-violet-600', label: 'Colaboradores' },
        ]
    },
    {
        key: 'salesOrder' as MenuKey,
        label: 'Vendas',
        icon: 'bi-cart-fill',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        links: [
            { to: '/sales-order', icon: 'bi-receipt', iconColor: 'text-blue-500', label: 'Pedidos de Venda' },
            { to: '/settings/sales', icon: 'bi-gear-fill', iconColor: 'text-slate-500', label: 'Configurações de Vendas' },
            { to: '/budgets', icon: 'bi-file-earmark-text-fill', iconColor: 'text-sky-500', label: 'Orçamentos' },
            { to: '/assistance-orders', icon: 'bi-tools', iconColor: 'text-orange-500', label: 'Assistências' },
            { to: '/returns', icon: 'bi-arrow-return-left', iconColor: 'text-rose-500', label: 'Devoluções' },
            { to: '/sales-order/reports', icon: 'bi-file-earmark-spreadsheet-fill', iconColor: 'text-green-500', label: 'Relatório CSV' },
        ]
    },
    {
        key: 'fiscal' as MenuKey,
        label: 'Fiscal',
        icon: 'bi-receipt-cutoff',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        links: [
            { to: '/fiscal-documents', icon: 'bi-receipt', iconColor: 'text-emerald-500', label: 'Notas fiscais de saída (NF-e/NFC-e)' },
            { to: '/estoque/notas-fiscais-entrada', icon: 'bi-receipt-cutoff', iconColor: 'text-indigo-500', label: 'Notas de entrada' },
            { to: '/estoque/ncm', icon: 'bi-journal-text', iconColor: 'text-teal-600', label: 'NCM' },
            { to: '/settings/fiscal', icon: 'bi-gear-fill', iconColor: 'text-slate-500', label: 'Configurações fiscais' },
        ]
    },
    {
        key: 'logistics' as MenuKey,
        label: 'Logística',
        icon: 'bi-truck',
        color: 'text-cyan-500',
        bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        links: [
            { to: '/delivery-schedule', icon: 'bi-calendar-check-fill', iconColor: 'text-cyan-500', label: 'Agenda' },
            { to: '/logistics/assembly-list', icon: 'bi-hammer', iconColor: 'text-amber-500', label: 'Lista de Montagem' },
            { to: '/sales-order/freight-calculation', icon: 'bi-calculator-fill', iconColor: 'text-teal-500', label: 'Cálculo de Frete' },
            { to: '/settings/logistics', icon: 'bi-gear-fill', iconColor: 'text-slate-500', label: 'Configurações de Logística' },
        ]
    },
    {
        key: 'finance' as MenuKey,
        label: 'Financeiro',
        icon: 'bi-wallet2',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        links: [
            { to: '/finance/transactions', icon: 'bi-arrow-left-right', iconColor: 'text-amber-500', label: 'Movimentações' },
        ]
    },
    {
        key: 'marketing' as MenuKey,
        label: 'Marketing',
        icon: 'bi-megaphone',
        color: 'text-pink-500',
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        links: [
            { to: '/marketing/posts', icon: 'bi-instagram', iconColor: 'text-pink-500', label: 'Gerador de Prompt para Posts' },
            { to: '/products/meta-catalog', icon: 'bi-meta', iconColor: 'text-blue-600', label: 'Catálogo Meta' },
            { to: '/estoque/etiquetas?category=logos', icon: 'bi-printer-fill', iconColor: 'text-purple-500', label: 'Impressão de Logotipos e Artes' },
        ]
    },
];

const MobileNav = ({ isOpen, onClose, activeMenu, setActiveMenu }: MobileNavProps) => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    if (!isOpen) return null;

    const toggle = (key: MenuKey) => setActiveMenu(activeMenu === key ? null : key);

    const handleLink = (to: string) => {
        navigate(to);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[99999] flex flex-col xl:hidden"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15,23,42,0.75)' }}
        >
            {/* Modal Fullscreen */}
            <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950 overflow-y-auto animate-slide-up">

                {/* Header do Modal */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-sm">
                    <Link to="/" onClick={onClose} className="flex items-center gap-2.5 group">
                        <img src={logoMorante} alt="ERP Móveis Morante" className="h-10 lg:h-12 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase leading-none">
                            ERP
                        </h3>
                    </Link>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all active:scale-90"
                    >
                        <i className="bi bi-x-lg text-base"></i>
                    </button>
                </div>

                {/* Atalho: Dashboard & Documentação */}
                <div className="grid grid-cols-2 gap-2 px-4 pt-4">
                    <button
                        onClick={() => handleLink('/')}
                        className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-xs shadow-md hover:from-blue-700 hover:to-blue-600 transition-all active:scale-95"
                    >
                        <i className="bi bi-grid-fill text-base"></i>
                        Dashboard
                    </button>
                    <button
                        onClick={() => handleLink('/system-docs')}
                        className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
                    >
                        <i className="bi bi-book-half text-base text-indigo-500"></i>
                        Documentação
                    </button>
                </div>

                {/* Seções de Menu */}
                <nav className="flex flex-col gap-1 px-4 pt-4 pb-6">
                    {menuItems.map((item) => {
                        const isActive = activeMenu === item.key;
                        return (
                            <div key={item.key} className="overflow-hidden border-b border-slate-100 dark:border-slate-800/50 last:border-b-0">
                                {/* Cabeçalho da Seção */}
                                <button
                                    onClick={() => toggle(item.key)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                                        isActive
                                            ? `${item.bg} ${item.color}`
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? item.bg : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            <i className={`bi ${item.icon} text-lg ${isActive ? item.color : 'text-slate-400 dark:text-slate-500'}`}></i>
                                        </div>
                                        <span>{item.label}</span>
                                        {item.beta && (
                                            <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full tracking-tighter uppercase">
                                                BETA
                                            </span>
                                        )}
                                    </div>
                                    <i className={`bi bi-chevron-down transition-transform duration-300 ${isActive ? 'rotate-180 ' + item.color : 'text-slate-400'}`}></i>
                                </button>

                                {/* Sub-links expandíveis */}
                                {isActive && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 pt-2 pb-4 px-2">
                                        {item.links.map((link: any, idx: number) => (
                                            link.type === 'header' ? (
                                                <div key={`header-${idx}`} className="md:col-span-2 px-4 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    {link.label}
                                                </div>
                                            ) : (
                                                <button
                                                    key={link.to}
                                                    onClick={() => handleLink(link.to as string)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 max-[480px]:px-3 max-[480px]:py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-all text-sm font-semibold text-left"
                                                >
                                                    <i className={`bi ${link.icon} text-base ${link.iconColor}`}></i>
                                                    <span className={link.shortLabel ? 'max-[480px]:hidden' : ''}>{link.label}</span>
                                                    {link.shortLabel && <span className="hidden max-[480px]:inline">{link.shortLabel}</span>}
                                                    <i className="bi bi-chevron-right ml-auto text-slate-300 dark:text-slate-600 text-[10px] opacity-50"></i>
                                                </button>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default MobileNav;
