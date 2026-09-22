import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import { MenuKey } from "../../AppLayout";

interface DesktopNavProps {
    activeMenu: MenuKey;
    setActiveMenu: (menu: MenuKey) => void;
}

const dropdownClass = "absolute top-[calc(100%-8px)] left-0 w-[280px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-premium-lg p-2 flex flex-col gap-0.5 animate-reveal z-[99999]";
const navLinkClass = "flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 hover:shadow-premium-sm rounded-2xl transition-all duration-300 font-bold text-[11px] whitespace-nowrap active:scale-95";

const menuBtnClass = (isActive: boolean, isBeta?: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 font-bold text-[11px] whitespace-nowrap active:scale-95 ${isActive ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-premium-sm' : isBeta ? 'text-slate-300 dark:text-slate-600 grayscale hover:text-slate-400 opacity-60' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 hover:shadow-premium-sm'}`;

const chevronClass = (isActive: boolean) =>
    `bi bi-chevron-down transition-transform text-[10px] ${isActive ? 'rotate-180' : ''}`;

const DropdownGroup = ({ title }: { title: string }) => (
    <div className="px-3 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 select-none">
        {title}
    </div>
);

const DropdownSeparator = () => (
    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
);

const DropdownItem = ({ to, href, icon, title, description, beta, onClick }: { to?: string; href?: string; icon: string; title: string; description?: string; beta?: boolean; onClick?: () => void }) => {
    const content = (
        <div className="flex items-center justify-between w-full group">
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <i className={`${icon} text-[15px] text-blue-500 dark:text-blue-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-300`}></i>
                </div>
                <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        {title}
                        {beta && <span className="text-[7px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded tracking-tighter uppercase">BETA</span>}
                    </span>
                    {description && (
                        <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">{description}</span>
                    )}
                </div>
            </div>
            <i className="bi bi-chevron-right text-[10px] text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0"></i>
        </div>
    );

    const className = "p-2 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded-2xl transition-all duration-300 min-h-[44px] cursor-pointer flex items-center select-none";

    if (href) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>{content}</a>;
    }

    return (
        <Link to={to!} onClick={onClick} className={className}>
            {content}
        </Link>
    );
};

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
                        <DropdownGroup title="Catálogo" />
                        <DropdownItem to="/products" icon="bi-list-ul" title="Lista de produtos" description="Gerenciar produtos" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/products/characteristics" icon="bi-sliders2" title="Características" description="Cores, medidas e características" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/products/categories" icon="bi-tag-fill" title="Ambientes e categorias" description="Agrupamentos de catálogo" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/products/compositions" icon="bi-diagram-3-fill" title="Composições" description="Kits e montagens" onClick={() => setActiveMenu(null)} />
                        
                        <DropdownSeparator />
                        <DropdownGroup title="Integração" />
                        <DropdownItem to="/products/reconciliation/suppliers" icon="bi-magic" title="Conciliação de fornecedores" description="Sincronizar base externa" onClick={() => setActiveMenu(null)} />
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
                    <i className="bi bi-box-seam-fill"></i>
                    <span>Estoque</span>
                    <i className={chevronClass(activeMenu === 'stock')}></i>
                </button>
                {activeMenu === 'stock' && (
                    <div className={dropdownClass}>
                        <DropdownGroup title="Operação" />
                        <DropdownItem to="/estoque/movimentacoes" icon="bi-arrow-left-right" title="Movimentações" description="Entradas e saídas manuais" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/estoque/inventarios" icon="bi-journal-check" title="Inventário" description="Contagem e ajustes" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/estoque/recebimentos" icon="bi-clipboard-check" title="Recebimentos" description="Conferência de mercadorias" onClick={() => setActiveMenu(null)} />

                        <DropdownSeparator />

                        <DropdownGroup title="Compras" />
                        <DropdownItem to="/estoque/pedidos-compra" icon="bi-cart-fill" title="Pedidos de compra" description="Gestão de pedidos" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/estoque/notas-fiscais-entrada" icon="bi-receipt-cutoff" title="Notas fiscais de entrada" description="Manifestação e importação XML" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/estoque/fornecedores" icon="bi-truck" title="Fornecedores" description="Cadastro e gestão" onClick={() => setActiveMenu(null)} />

                        <DropdownSeparator />

                        <DropdownGroup title="Etiquetas" />
                        <DropdownItem to="/estoque/etiquetas?category=identificacao" icon="bi-upc-scan" title="Identificação" description="Códigos de barras e caixas" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/estoque/etiquetas?category=precos" icon="bi-tag-fill" title="Preços" description="Gôndolas e mostruários" onClick={() => setActiveMenu(null)} />
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
                        <DropdownGroup title="Cadastros" />
                        <DropdownItem to="/registrations/customers" icon="bi-person-fill" title="Clientes" description="Gestão de carteira" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/registrations/employees" icon="bi-person-badge" title="Colaboradores" description="Equipe e vendedores" onClick={() => setActiveMenu(null)} />
                    </div>
                )}
            </div>

            {/* Vendas */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('salesOrder')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('salesOrder')} className={menuBtnClass(activeMenu === 'salesOrder', false)}>
                    <i className="bi bi-cart-fill"></i>
                    Vendas
                    <i className={chevronClass(activeMenu === 'salesOrder')}></i>
                </button>
                {activeMenu === 'salesOrder' && (
                    <div className={dropdownClass}>
                        <DropdownGroup title="Operação" />
                        <DropdownItem to="/sales-order" icon="bi-cart-fill" title="Pedidos de venda" description="Gerenciar pedidos" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/budgets" icon="bi-file-text" title="Orçamentos" description="Propostas e negociações" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/assistance-orders" icon="bi-tools" title="Assistências" description="Garantias e reparos" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/returns" icon="bi-arrow-return-left" title="Devoluções" description="Trocas e devoluções" onClick={() => setActiveMenu(null)} />

                        <DropdownSeparator />

                        <DropdownGroup title="Documentos Fiscais" />
                        <DropdownItem to="/fiscal-documents" icon="bi-receipt" title="Notas fiscais de venda" description="NF-e / NFC-e" onClick={() => setActiveMenu(null)} />

                        <DropdownSeparator />

                        <DropdownGroup title="Relatórios" />
                        <DropdownItem to="/sales-order/reports" icon="bi-bar-chart-fill" title="Relatório de vendas" description="Exportação CSV" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/sales-order/reports-bling" icon="bi-clouds-fill" title="Relatórios Bling" description="Integração externa" beta={true} onClick={() => setActiveMenu(null)} />
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
                        <DropdownGroup title="Operação" />
                        <DropdownItem to="/delivery-schedule" icon="bi-calendar-event" title="Agenda" description="Cronograma de entregas" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/logistics/assembly-list" icon="bi-list-check" title="Lista de montagem" description="Roteiro de montadores" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/sales-order/freight-calculation" icon="bi-calculator" title="Cálculo de frete" description="Simulação de custos" onClick={() => setActiveMenu(null)} />

                        <DropdownSeparator />

                        <DropdownGroup title="Mobile" />
                        <DropdownItem href="https://expo.dev/artifacts/eas/c6GuI7KSgOnw0kSY-zI9S_5dxaFMuc9lCT37XL-ynYE.apk" icon="bi-android2" title="Baixar App Android" description="Instalação via APK" />
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
                    <i className="bi bi-megaphone-fill"></i>
                    <span>Marketing</span>
                    <i className={chevronClass(activeMenu === 'marketing')}></i>
                </button>
                {activeMenu === 'marketing' && (
                    <div className={dropdownClass}>
                        <DropdownGroup title="Criação" />
                        <DropdownItem to="/marketing/posts" icon="bi-instagram" title="Gerador de prompt" description="Criar ideias de posts" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/products/meta-catalog" icon="bi-meta" title="Catálogo Meta" description="Integração de feed" onClick={() => setActiveMenu(null)} />
                        <DropdownItem to="/estoque/etiquetas?category=logos" icon="bi-printer-fill" title="Impressão de logotipos" description="Artes e promoções" onClick={() => setActiveMenu(null)} />
                    </div>
                )}
            </div>

            {/* Financeiro */}
            <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu('finance')}
                onMouseLeave={() => setActiveMenu(null)}
            >
                <button onClick={() => toggle('finance')} className={menuBtnClass(activeMenu === 'finance', false)}>
                    <i className="bi bi-wallet2"></i>
                    <span>Financeiro</span>
                    <i className={chevronClass(activeMenu === 'finance')}></i>
                </button>
                {activeMenu === 'finance' && (
                    <div className={dropdownClass}>
                        <DropdownGroup title="Operação" />
                        <DropdownItem to="/finance/transactions" icon="bi-arrow-left-right" title="Movimentações" description="Contas a pagar e receber" onClick={() => setActiveMenu(null)} />
                    </div>
                )}
            </div>
        </nav>
    );
};

export default DesktopNav;
