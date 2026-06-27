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

            {/* Produtos do Bling e Importação */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('products')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('products')} className={menuBtnClass(activeMenu === 'products', false)}>
                    <i className="bi bi-box-seam"></i>
                    <span>Produtos</span>
                    <i className={chevronClass(activeMenu === 'products')}></i>
                </button>
                {activeMenu === 'products' && (
                    <div className={dropdownClass}>
                        <Link to="/stock/bling" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>
                            <i className="bi bi-clouds-fill mr-1 text-blue-500"></i> Lista do Bling
                        </Link>
                        <Link to="/registrations/products" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>
                            <i className="bi bi-file-earmark-arrow-up-fill mr-1"></i> Gerenciar Importação
                        </Link>
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
                        <Link to="/registrations/customers" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Clientes e Fornecedores</Link>
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
                        <Link to="/budgets" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Orçamentos</Link>
                        <Link to="/assistance-orders" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Assistências</Link>
                        <Link to="/returns" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Devoluções</Link>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
                        <Link to="/sales-order/reports" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>
                            <i className="bi bi-bar-chart-fill mr-2"></i> Relatório de Vendas CSV
                        </Link>
                        <Link to="/sales-order/reports-bling" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>
                            <i className="bi bi-clouds-fill mr-2 text-indigo-500"></i> Relatórios de Vendas (Bling)
                            <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-indigo-500 px-1 py-0.5 rounded ml-1 tracking-tighter uppercase">BETA</span>
                        </Link>
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
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
                        <a href="/mobile-app" className={`${dropdownItemClass} text-blue-600 dark:text-blue-400`}>
                             <i className="bi bi-phone-vibrate"></i>
                             Baixar App Mobile
                        </a>
                    </div>
                )}
            </div>

            {/* Comunicação Visual */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('marketing')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('marketing')} className={menuBtnClass(activeMenu === 'marketing', true)}>
                    <i className="bi bi-brush-fill"></i>
                    <span>Comunicação Visual</span>
                    <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-tighter">BETA</span>
                    <i className={chevronClass(activeMenu === 'marketing')}></i>
                </button>
                {activeMenu === 'marketing' && (
                    <div className={dropdownClass}>
                        <Link to="/stock/label-printing?cat=logos" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Etiqueta de Logotipo e Rótulo</Link>
                        <Link to="/stock/label-printing?cat=precos" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Etiqueta de Preço</Link>
                        <Link to="/stock/label-printing?cat=identificacao" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Etiqueta de Identificação do Produto</Link>
                        <Link to="/stock/label-printing?cat=posts" onClick={() => setActiveMenu(null)} className={dropdownItemClass}>Posts para Redes Sociais</Link>
                    </div>
                )}
            </div>



        </nav>
    );
};

export default DesktopNav;
