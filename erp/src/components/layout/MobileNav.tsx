import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logoMorante from "../../assets/logo.jpeg";

import { MenuKey } from "../../AppLayout";

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
    activeMenu: MenuKey;
    setActiveMenu: (menu: MenuKey) => void;
}

const mobileLinkClass = "flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all font-bold";
const mobileSubLinkClass = "py-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold text-sm";

const menuBtnClass = (isActive: boolean, isBeta?: boolean) =>
    `flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold ${isActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : isBeta ? 'text-slate-300 dark:text-slate-600 grayscale hover:text-slate-400 opacity-60' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`;

const MobileNav = ({ isOpen, onClose, activeMenu, setActiveMenu }: MobileNavProps) => {
    const { isAdmin } = useAuth();
    if (!isOpen) return null;

    const toggle = (key: MenuKey) => setActiveMenu(activeMenu === key ? null : key);

    return (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm xl:hidden" onClick={onClose}>
            <div
                className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-white dark:bg-slate-900 shadow-2xl p-4 flex flex-col gap-4 z-50 overflow-y-auto animate-slide-right"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                    <Link to="/" onClick={onClose} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden border border-slate-100">
                            <img src={logoMorante} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap">ERP Móveis Morante</h3>
                    </Link>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    <Link to="/" onClick={onClose} className={mobileLinkClass}>
                        <i className="bi bi-grid-fill text-lg"></i>
                        Dashboard
                    </Link>

                    {/* Produtos e Serviços */}
                    <div className="flex flex-col">
                        <button onClick={() => toggle('products')} className={menuBtnClass(activeMenu === 'products', true)}>
                            <div className="flex items-center gap-3">
                                <i className="bi bi-box-seam text-lg"></i>
                                <span>Produtos e Serviços</span>
                                <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-tighter">BETA</span>
                            </div>
                            <i className={`bi bi-chevron-down transition-transform ${activeMenu === 'products' ? 'rotate-180' : ''}`}></i>
                        </button>
                        {activeMenu === 'products' && (
                            <div className="flex flex-col gap-1 pl-11 pr-4 py-2">
                                <Link to="/registrations/products" onClick={onClose} className={mobileSubLinkClass}>Todos os Produtos</Link>
                                <Link to="/registrations/product-categories" onClick={onClose} className={mobileSubLinkClass}>Categorias</Link>
                                <Link to="/registrations/variations" onClick={onClose} className={mobileSubLinkClass}>Atributos e Valores</Link>
                            </div>
                        )}
                    </div>

                    {/* Pessoas */}
                    <div className="flex flex-col">
                        <button onClick={() => toggle('registrations')} className={menuBtnClass(activeMenu === 'registrations')}>
                            <div className="flex items-center gap-3">
                                <i className="bi bi-people-fill text-lg"></i>
                                Pessoas
                            </div>
                            <i className={`bi bi-chevron-down transition-transform ${activeMenu === 'registrations' ? 'rotate-180' : ''}`}></i>
                        </button>
                        {activeMenu === 'registrations' && (
                            <div className="flex flex-col gap-1 pl-11 pr-4 py-2">
                                <Link to="/registrations/customers" onClick={onClose} className={mobileSubLinkClass}>Clientes e Fornecedores</Link>
                                <Link to="/registrations/employees" onClick={onClose} className={mobileSubLinkClass}>Funcionários</Link>
                            </div>
                        )}
                    </div>

                    {/* Pedidos */}
                    <div className="flex flex-col">
                        <button onClick={() => toggle('salesOrder')} className={menuBtnClass(activeMenu === 'salesOrder')}>
                            <div className="flex items-center gap-3">
                                <i className="bi bi-cart-fill text-lg"></i>
                                Pedidos
                            </div>
                            <i className={`bi bi-chevron-down transition-transform ${activeMenu === 'salesOrder' ? 'rotate-180' : ''}`}></i>
                        </button>
                        {activeMenu === 'salesOrder' && (
                            <div className="flex flex-col gap-1 pl-11 pr-4 py-2">
                                <Link to="/sales-order" onClick={onClose} className={mobileSubLinkClass}>Lista de Pedidos</Link>
                                <Link to="/attendance-dashboard" onClick={onClose} className={mobileSubLinkClass}>BI de Atendimento</Link>
                                <Link to="/budgets" onClick={onClose} className={mobileSubLinkClass}>Orçamentos</Link>
                                <Link to="/assistance-orders" onClick={onClose} className={mobileSubLinkClass}>Assistências</Link>
                                <Link to="/sales-order/reports" onClick={onClose} className={mobileSubLinkClass}>Relatórios de Vendas</Link>
                                <Link to="/sales-order/reports-bling" onClick={onClose} className={mobileSubLinkClass}>
                                    Relatórios do Bling <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-indigo-500 px-1 py-0.5 rounded ml-1 tracking-tighter uppercase">BETA</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Logística */}
                    <div className="flex flex-col">
                        <button onClick={() => toggle('logistics')} className={menuBtnClass(activeMenu === 'logistics')}>
                            <div className="flex items-center gap-3">
                                <i className="bi bi-truck text-lg"></i>
                                Logística
                            </div>
                            <i className={`bi bi-chevron-down transition-transform ${activeMenu === 'logistics' ? 'rotate-180' : ''}`}></i>
                        </button>
                        {activeMenu === 'logistics' && (
                            <div className="flex flex-col gap-1 pl-11 pr-4 py-2">
                                <Link to="/delivery-schedule" onClick={onClose} className={mobileSubLinkClass}>Cronograma Logístico</Link>
                                <Link to="/logistics/assembly-list" onClick={onClose} className={mobileSubLinkClass}>Lista de Montagem</Link>
                                <Link to="/sales-order/freight-calculation" onClick={onClose} className={mobileSubLinkClass}>Cálculo de Frete</Link>
                            </div>
                        )}
                    </div>

                    {/* Estoque */}
                    <div className="flex flex-col">
                        <button onClick={() => toggle('stock')} className={menuBtnClass(activeMenu === 'stock', true)}>
                            <div className="flex items-center gap-3">
                                <i className="bi bi-box-fill text-lg"></i>
                                <span>Estoque</span>
                                <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-tighter">BETA</span>
                            </div>
                            <i className={`bi bi-chevron-down transition-transform ${activeMenu === 'stock' ? 'rotate-180' : ''}`}></i>
                        </button>
                        {activeMenu === 'stock' && (
                            <div className="flex flex-col gap-1 pl-11 pr-4 py-2">
                                <Link to="/stock?tab=history" onClick={onClose} className={mobileSubLinkClass}>Movimentações</Link>
                                <Link to="/stock/purchases" onClick={onClose} className={mobileSubLinkClass}>Pedidos de Compras</Link>
                                <Link to="/stock/bling" onClick={onClose} className={mobileSubLinkClass}>
                                    <i className="bi bi-clouds-fill mr-2 text-blue-500"></i> Estoque do Bling
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Financeiro */}
                    <div className="flex flex-col">
                        <button onClick={() => toggle('finance')} className={menuBtnClass(activeMenu === 'finance', true)}>
                            <div className="flex items-center gap-3">
                                <i className="bi bi-wallet2 text-lg"></i>
                                <span>Financeiro</span>
                                <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-tighter">BETA</span>
                            </div>
                            <i className={`bi bi-chevron-down transition-transform ${activeMenu === 'finance' ? 'rotate-180' : ''}`}></i>
                        </button>
                        {activeMenu === 'finance' && (
                            <div className="flex flex-col gap-1 pl-11 pr-4 py-2">
                                <Link to="/finance/dashboard" onClick={onClose} className={mobileSubLinkClass}>Gestão de Caixa</Link>
                                <Link to="/finance/payables" onClick={onClose} className={mobileSubLinkClass}>Contas a Pagar</Link>
                                <Link to="/finance/receivables" onClick={onClose} className={mobileSubLinkClass}>Contas a Receber</Link>
                                <Link to="/finance/transactions" onClick={onClose} className={mobileSubLinkClass}>Movimentações (Extrato)</Link>
                            </div>
                        )}
                    </div>

                    {/* Comunicação Visual */}
                    <div className="flex flex-col">
                        <button onClick={() => toggle('marketing')} className={menuBtnClass(activeMenu === 'marketing', true)}>
                            <div className="flex items-center gap-3">
                                <i className="bi bi-brush text-lg"></i>
                                <span>Comunicação Visual</span>
                                <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-tighter">BETA</span>
                            </div>
                            <i className={`bi bi-chevron-down transition-transform ${activeMenu === 'marketing' ? 'rotate-180' : ''}`}></i>
                        </button>
                        {activeMenu === 'marketing' && (
                            <div className="flex flex-col gap-1 pl-11 pr-4 py-2">
                                <Link to="/stock/label-printing?cat=logos" onClick={onClose} className={mobileSubLinkClass}>
                                    <i className="bi bi-palette-fill mr-2 text-purple-500"></i> Etiqueta de Logotipo e Rótulo
                                </Link>
                                <Link to="/stock/label-printing?cat=precos" onClick={onClose} className={mobileSubLinkClass}>
                                    <i className="bi bi-tag-fill mr-2 text-amber-500"></i> Etiqueta de Preço
                                </Link>
                                <Link to="/stock/label-printing?cat=identificacao" onClick={onClose} className={mobileSubLinkClass}>
                                    <i className="bi bi-qr-code-scan mr-2 text-blue-500"></i> Etiqueta de Identificação do Produto
                                </Link>
                                <Link to="/stock/label-printing?cat=posts" onClick={onClose} className={mobileSubLinkClass}>
                                    <i className="bi bi-instagram mr-2 text-pink-500"></i> Posts para Redes Sociais
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Footer */}
                {isAdmin && (
                    <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-2 px-4 pb-4">
                        <Link to="/users" onClick={onClose} className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold text-sm">
                            <i className="bi bi-shield-lock-fill text-lg"></i> Gestão de Acessos
                        </Link>
                        <Link to="/settings" onClick={onClose} className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all font-bold text-sm">
                            <i className="bi bi-gear-fill text-lg"></i> Configurações
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileNav;
