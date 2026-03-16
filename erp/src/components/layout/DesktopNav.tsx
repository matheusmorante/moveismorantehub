import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import { MenuKey } from "../../AppLayout";

interface DesktopNavProps {
    activeMenu: MenuKey;
    setActiveMenu: (menu: MenuKey) => void;
}

const dropdownClass = "absolute top-[calc(100%-8px)] left-0 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl p-2 flex flex-col gap-1 animate-slide-up";
const dropdownItemClass = "p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest";
const navLinkClass = "flex items-center gap-1.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all font-bold text-[11px] whitespace-nowrap";

const menuBtnClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-bold text-[11px] whitespace-nowrap ${isActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`;

const chevronClass = (isActive: boolean) =>
    `bi bi-chevron-down transition-transform text-[10px] ${isActive ? 'rotate-180' : ''}`;

const DesktopNav = ({ activeMenu, setActiveMenu }: DesktopNavProps) => {
    const { isAdmin } = useAuth();
    const toggle = (key: MenuKey) => setActiveMenu(activeMenu === key ? null : key);

    return (
        <nav className="hidden lg:flex items-center gap-2 h-full">
            <Link to="/" className={navLinkClass}>
                <i className="bi bi-grid-fill"></i>
                Dashboard
            </Link>

            {/* Produtos e Serviços */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('products')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('products')} className={menuBtnClass(activeMenu === 'products')}>
                    <i className="bi bi-box-seam"></i>
                    Produtos e Serviços
                    <i className={chevronClass(activeMenu === 'products')}></i>
                </button>
                {activeMenu === 'products' && (
                    <div className={dropdownClass}>
                        <Link to="/registrations/products" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Lista de Produtos e Serviços</Link>
                        <Link to="/registrations/whatsapp-marketplace" onClick={() => setActiveMenu(null)} className={dropdownItemClass}><i className="bi bi-whatsapp mr-1 text-green-500"></i> Marketplace WhatsApp</Link>
                        <Link to="/registrations/product-categories" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Categorias e Ambientes</Link>
                        <Link to="/registrations/variations" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Atributos e Valores</Link>
                    </div>
                )}
            </div>

            {/* Pessoas */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('registrations')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('registrations')} className={menuBtnClass(activeMenu === 'registrations')}>
                    <i className="bi bi-people-fill"></i>
                    Pessoas
                    <i className={chevronClass(activeMenu === 'registrations')}></i>
                </button>
                {activeMenu === 'registrations' && (
                    <div className={dropdownClass}>
                        <Link to="/registrations/customers" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Clientes</Link>
                        <Link to="/registrations/suppliers" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Fornecedores</Link>
                        <Link to="/registrations/employees" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Funcionários</Link>
                    </div>
                )}
            </div>

            {/* Estoque */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('stock')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('stock')} className={menuBtnClass(activeMenu === 'stock')}>
                    <i className="bi bi-box-seam-fill"></i>
                    Estoque
                    <i className={chevronClass(activeMenu === 'stock')}></i>
                </button>
                {activeMenu === 'stock' && (
                    <div className={dropdownClass}>
                        <Link to="/stock" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Controle de Saldo</Link>
                        <Link to="/stock/purchases" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Pedidos de Compra</Link>
                    </div>
                )}
            </div>

            {/* Pedidos */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('salesOrder')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('salesOrder')} className={menuBtnClass(activeMenu === 'salesOrder')}>
                    <i className="bi bi-cart-fill"></i>
                    Pedidos
                    <i className={chevronClass(activeMenu === 'salesOrder')}></i>
                </button>
                {activeMenu === 'salesOrder' && (
                    <div className={dropdownClass}>
                        <Link to="/sales-order" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Lista de Pedidos</Link>
                        <Link to="/delivery-schedule" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Cronograma Logístico</Link>
                        <Link to="/delivery-schedule" state={{ view: 'map' }} onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Mapa de Entregas</Link>
                        <Link to="/sales-order/freight-calculation" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Cálculo de Frete</Link>
                        <Link to="/attendance-dashboard" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>BI de Atendimento</Link>
                    </div>
                )}
            </div>


            {/* Financeiro */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('finance')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('finance')} className={menuBtnClass(activeMenu === 'finance')}>
                    <i className="bi bi-wallet2"></i>
                    Financeiro
                    <i className={chevronClass(activeMenu === 'finance')}></i>
                </button>
                {activeMenu === 'finance' && (
                    <div className={dropdownClass}>
                        <Link to="/finance/dashboard" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Gestão de Caixa</Link>
                        <Link to="/finance/payables" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Contas a Pagar</Link>
                        <Link to="/finance/receivables" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Contas a Receber</Link>
                        <Link to="/finance/transactions" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Movimentações (Extrato)</Link>
                    </div>
                )}
            </div>

            {/* Design */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('design')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('design')} className={menuBtnClass(activeMenu === 'design')}>
                    <i className="bi bi-palette-fill"></i>
                    Design
                    <i className={chevronClass(activeMenu === 'design')}></i>
                </button>
                {activeMenu === 'design' && (
                    <div className={dropdownClass}>
                        <Link to="/design/labels" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Etiquetas de Identidade (MDF/Logo)</Link>
                        <Link to="/stock/label-printing" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Rótulos de Produtos</Link>
                    </div>
                )}
            </div>

            <Link to="/reports" className={navLinkClass}>
                <i className="bi bi-bar-chart-fill"></i>
                Relatórios
            </Link>

            {isAdmin && (
                <Link to="/users" className={navLinkClass}>
                    <i className="bi bi-shield-lock-fill"></i>
                    Acessos
                </Link>
            )}
        </nav>
    );
};

export default DesktopNav;
