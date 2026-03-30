import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import { MenuKey } from "../../AppLayout";

interface DesktopNavProps {
    activeMenu: MenuKey;
    setActiveMenu: (menu: MenuKey) => void;
}

const dropdownClass = "absolute top-[calc(100%-8px)] left-0 w-60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-3xl shadow-premium-lg p-2 flex flex-col gap-1 animate-reveal z-[70]";
const dropdownItemClass = "p-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded-2xl transition-all duration-300 font-bold text-[10px] uppercase tracking-widest flex items-center gap-3";
const navLinkClass = "flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 hover:shadow-premium-sm rounded-2xl transition-all duration-300 font-bold text-[11px] whitespace-nowrap active:scale-95";

const menuBtnClass = (isActive: boolean, isBeta?: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 font-bold text-[11px] whitespace-nowrap active:scale-95 ${isActive ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-premium-sm' : isBeta ? 'text-slate-300 dark:text-slate-600 grayscale hover:text-slate-400 opacity-60' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 hover:shadow-premium-sm'}`;

const chevronClass = (isActive: boolean) =>
    `bi bi-chevron-down transition-transform text-[10px] ${isActive ? 'rotate-180' : ''}`;

const DesktopNav = ({ activeMenu, setActiveMenu }: DesktopNavProps) => {
    const { isAdmin } = useAuth();
    const toggle = (key: MenuKey) => setActiveMenu(activeMenu === key ? null : key);

    return (
        <nav className="hidden xl:flex items-center gap-2 h-full">
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
                <button onClick={() => toggle('products')} className={menuBtnClass(activeMenu === 'products', true)}>
                    <i className="bi bi-box-seam"></i>
                    <span>Produtos e Serviços</span>
                    <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-tighter">BETA</span>
                    <i className={chevronClass(activeMenu === 'products')}></i>
                </button>
                {activeMenu === 'products' && (
                    <div className={dropdownClass}>
                        <Link to="/registrations/products" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Todos os Produtos</Link>
                        <Link to="/registrations/product-categories" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Categorias</Link>
                        <Link to="/registrations/variations" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Atributos e Valores</Link>
                    </div>
                )}
            </div>

            {/* Estoque */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('stock')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('stock')} className={menuBtnClass(activeMenu === 'stock', false)}>
                    <i className="bi bi-box-fill"></i>
                    Estoque
                    <i className={chevronClass(activeMenu === 'stock')}></i>
                </button>
                {activeMenu === 'stock' && (
                    <div className={dropdownClass}>
                        <Link to="/stock?tab=history" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Movimentações</Link>
                        <Link to="/stock/purchases" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Pedidos de Compras</Link>
                    </div>
                )}
            </div>

            {/* Pessoas */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('registrations')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('registrations')} className={menuBtnClass(activeMenu === 'registrations', false)}>
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



            {/* Pedidos */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('salesOrder')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('salesOrder')} className={menuBtnClass(activeMenu === 'salesOrder', false)}>
                    <i className="bi bi-cart-fill"></i>
                    Pedidos
                    <i className={chevronClass(activeMenu === 'salesOrder')}></i>
                </button>
                {activeMenu === 'salesOrder' && (
                    <div className={dropdownClass}>
                        <Link to="/sales-order" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Lista de Pedidos</Link>
                        <Link to="/attendance-dashboard" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>BI de Atendimento</Link>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
                        <div className="px-3 py-1 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo de Orçamentos</div>
                        <Link to="/sales-order?type=budget&new=true" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Novo Orçamento</Link>
                        <Link to="/sales-order?type=budget" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Lista de Orçamentos</Link>
                    </div>
                )}
            </div>







            {/* Logística */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('logistics')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('logistics')} className={menuBtnClass(activeMenu === 'logistics', false)}>
                    <i className="bi bi-truck"></i>
                    Logística
                    <i className={chevronClass(activeMenu === 'logistics')}></i>
                </button>
                {activeMenu === 'logistics' && (
                    <div className={dropdownClass}>
                        <Link to="/delivery-schedule" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Cronograma Logístico</Link>
                        <Link to="/delivery-schedule" state={{ view: 'map' }} onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Mapa de Entregas</Link>
                        <Link to="/logistics/assembly-list" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Lista de Montagem</Link>
                        <Link to="/sales-order/freight-calculation" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Cálculo de Frete</Link>
                    </div>
                )}
            </div>

            {/* Marketing */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('marketing')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('marketing')} className={menuBtnClass(activeMenu === 'marketing', false)}>
                    <i className="bi bi- megaphone-fill"></i>
                    Marketing
                    <i className={chevronClass(activeMenu === 'marketing')}></i>
                </button>
                {activeMenu === 'marketing' && (
                    <div className={dropdownClass}>
                        <Link to="/registrations/whatsapp-marketplace" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>
                            <i className="bi bi-whatsapp mr-2 text-emerald-500"></i> WhatsApp Marketplace
                        </Link>
                        <Link to="/marketing/channel-catalog" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>
                            <i className="bi bi-eye mr-2 text-blue-500"></i> Catálogo de Canais
                        </Link>

                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
                        <div className="px-3 py-1 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Criação e Design</div>

                        <Link to="/design/labels" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>
                            <i className="bi bi-palette-fill mr-2 text-purple-500"></i> Etiquetas de Marca (MDF)
                        </Link>

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
