import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logoMorante from "../../assets/logo.jpeg";
import { MenuKey } from "../../AppLayout";

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
    activeMenu: MenuKey;
    setActiveMenu: (menu: MenuKey) => void;
}

const menuItems = [
    {
        key: 'products' as MenuKey,
        label: 'Produtos',
        icon: 'bi-box-seam',
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        links: [
            { to: '/registrations/products', icon: 'bi-list-ul', iconColor: 'text-indigo-500', label: 'Lista de Produtos' },
            { to: '/registrations/variations', icon: 'bi-ui-radios', iconColor: 'text-blue-500', label: 'Atributos e Variações' },
            { to: '/registrations/product-categories', icon: 'bi-tag-fill', iconColor: 'text-teal-500', label: 'Ambientes e Categorias' },
            { to: '/stock/label-printing?category=precos', icon: 'bi-tag-fill', iconColor: 'text-emerald-500', label: 'Etiqueta de Preço' },
        ]
    },
    {
        key: 'stock' as MenuKey,
        label: 'Estoque',
        icon: 'bi-box-seam-fill',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        links: [
            { to: '/stock?tab=history', icon: 'bi-arrow-left-right', iconColor: 'text-emerald-500', label: 'Movimentações' },
            { to: '/stock?tab=audit', icon: 'bi-journal-check', iconColor: 'text-emerald-600', label: 'Inventário' },
            { to: '/stock/purchases', icon: 'bi-cart-fill', iconColor: 'text-blue-500', label: 'Pedidos de Compra' },
            { to: '/stock/label-printing?category=identificacao', icon: 'bi-qr-code', iconColor: 'text-blue-500', label: 'Etiqueta de Identificação' },
        ]
    },
    {
        key: 'registrations' as MenuKey,
        label: 'Pessoas',
        icon: 'bi-people-fill',
        color: 'text-violet-500',
        bg: 'bg-violet-50 dark:bg-violet-900/20',
        links: [
            { to: '/registrations/customers', icon: 'bi-person-fill', iconColor: 'text-violet-500', label: 'Clientes e Fornecedores' },
            { to: '/registrations/employees', icon: 'bi-person-badge-fill', iconColor: 'text-violet-600', label: 'Funcionários' },
        ]
    },
    {
        key: 'salesOrder' as MenuKey,
        label: 'Pedidos',
        icon: 'bi-cart-fill',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        links: [
            { to: '/sales-order', icon: 'bi-receipt', iconColor: 'text-blue-500', label: 'Pedidos de Venda' },
            { to: '/budgets', icon: 'bi-file-earmark-text-fill', iconColor: 'text-sky-500', label: 'Orçamentos' },
            { to: '/assistance-orders', icon: 'bi-tools', iconColor: 'text-orange-500', label: 'Assistências' },
            { to: '/returns', icon: 'bi-arrow-return-left', iconColor: 'text-rose-500', label: 'Devoluções' },
            { to: '/sales-order/reports', icon: 'bi-file-earmark-spreadsheet-fill', iconColor: 'text-green-500', label: 'Relatório CSV' },
        ]
    },
    {
        key: 'logistics' as MenuKey,
        label: 'Logística',
        icon: 'bi-truck',
        color: 'text-cyan-500',
        bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        links: [
            { to: '/delivery-schedule', icon: 'bi-calendar-check-fill', iconColor: 'text-cyan-500', label: 'Cronograma Logístico' },
            { to: '/logistics/assembly-list', icon: 'bi-hammer', iconColor: 'text-amber-500', label: 'Lista de Montagem' },
            { to: '/sales-order/freight-calculation', icon: 'bi-calculator-fill', iconColor: 'text-teal-500', label: 'Cálculo de Frete' },
        ]
    },
    {
        key: 'finance' as MenuKey,
        label: 'Financeiro',
        icon: 'bi-wallet2',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        beta: true,
        links: [
            { to: '/finance/dashboard', icon: 'bi-cash-coin', iconColor: 'text-amber-500', label: 'Gestão de Caixa' },
            { to: '/finance/payables', icon: 'bi-arrow-up-circle-fill', iconColor: 'text-rose-500', label: 'Contas a Pagar' },
            { to: '/finance/receivables', icon: 'bi-arrow-down-circle-fill', iconColor: 'text-emerald-500', label: 'Contas a Receber' },
            { to: '/finance/transactions', icon: 'bi-bank2', iconColor: 'text-blue-500', label: 'Extrato' },
        ]
    },
    {
        key: 'marketing' as MenuKey,
        label: 'Marketing',
        icon: 'bi-megaphone',
        color: 'text-pink-500',
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        links: [
            { to: '/marketing/posts', icon: 'bi-instagram', iconColor: 'text-pink-500', label: 'Posts para Redes Sociais' },
            { to: '/registrations/meta-catalog', icon: 'bi-meta', iconColor: 'text-blue-600', label: 'Catálogo Meta' },
            { to: '/stock/label-printing?category=logos', icon: 'bi-printer-fill', iconColor: 'text-purple-500', label: 'Impressão de Logotipos e Artes' },
        ]
    },
];

const MobileNav = ({ isOpen, onClose, activeMenu, setActiveMenu }: MobileNavProps) => {
    const { isAdmin, profile, user, logout } = useAuth();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const toggle = (key: MenuKey) => setActiveMenu(activeMenu === key ? null : key);

    const handleLink = (to: string) => {
        navigate(to);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[99999] flex flex-col lg:hidden"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15,23,42,0.75)' }}
        >
            {/* Modal Fullscreen */}
            <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950 overflow-y-auto animate-slide-up">

                {/* Header do Modal */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-sm">
                    <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform duration-300">
                            <img src={logoMorante} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap uppercase italic leading-none">
                                ERP <span className="text-blue-600">Móveis Morante</span>
                            </h3>
                            <span className="text-[8px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                                Hub de Inteligência
                            </span>
                        </div>
                    </Link>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all active:scale-90"
                    >
                        <i className="bi bi-x-lg text-base"></i>
                    </button>
                </div>

                {/* Atalho: Dashboard */}
                <div className="px-4 pt-4">
                    <button
                        onClick={() => handleLink('/')}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-sm shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all active:scale-95"
                    >
                        <i className="bi bi-grid-fill text-lg"></i>
                        Dashboard Principal
                        <i className="bi bi-arrow-right ml-auto text-blue-200"></i>
                    </button>
                </div>

                {/* Seções de Menu */}
                <nav className="flex flex-col gap-1 px-4 pt-4 pb-4">
                    {menuItems.map((item) => {
                        const isActive = activeMenu === item.key;
                        return (
                            <div key={item.key} className="overflow-hidden">
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
                                    <div className="flex flex-col gap-0.5 pt-1 pb-2 px-2">
                                        {item.links.map((link) => (
                                            <button
                                                key={link.to}
                                                onClick={() => handleLink(link.to)}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-all text-sm font-semibold text-left"
                                            >
                                                <i className={`bi ${link.icon} text-base ${link.iconColor}`}></i>
                                                {link.label}
                                                <i className="bi bi-arrow-right-short ml-auto text-slate-300 dark:text-slate-600 text-lg"></i>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer: Perfil + Admin + Logout */}
                <div className="mt-auto border-t border-slate-100 dark:border-slate-800">
                    {/* Card do Usuário */}
                    <div className="flex items-center gap-3 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md flex items-center justify-center flex-shrink-0">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-white font-black text-sm uppercase">
                                    {((profile?.full_name || user?.email || 'U') as any)[0]}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                                {profile?.full_name || 'Usuário'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                                {user?.email}
                            </p>
                        </div>
                        <div className="flex-shrink-0 inline-flex items-center px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                            {isAdmin ? 'Admin' : 'Vendedor'}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 px-4 py-3">
                        <button
                            onClick={() => handleLink('/profile')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm text-left"
                        >
                            <i className="bi bi-person-circle text-lg"></i>
                            Meu Perfil
                        </button>

                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => handleLink('/settings')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm text-left"
                                >
                                    <i className="bi bi-gear-fill text-lg"></i>
                                    Configurações
                                </button>
                                <button
                                    onClick={() => handleLink('/users')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm text-left"
                                >
                                    <i className="bi bi-shield-lock-fill text-lg"></i>
                                    Controle de Acessos
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => { logout(); onClose(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all font-bold text-sm text-left mt-1"
                        >
                            <i className="bi bi-box-arrow-right text-lg"></i>
                            Encerrar Sessão
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileNav;
