import React from 'react';
import OrderCustomerSearchBar from '../OrderHistoryList/OrderCustomerSearchBar';
import ShowTestDataToggle from '@/components/shared/ShowTestDataToggle';
import { VisibilitySettings } from '../../../types/order.type';
import ReturnIcon from '@/components/shared/ReturnIcon';

const TABLE_VISIBILITY_COLUMNS: ReadonlyArray<{
  key: keyof VisibilitySettings;
  label: string;
}> = [
  { key: 'id', label: 'ID do Pedido' },
  { key: 'orderDate', label: 'Data do Pedido' },
  { key: 'deliveryDate', label: 'Data de Entrega' },
  { key: 'customer', label: 'Cliente' },
  { key: 'totalValue', label: 'Valor Total' },
  { key: 'labels', label: 'Rótulos' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações' },
];

interface SalesOrderTopToolbarProps {
  readonly isSalesOrderRoute: boolean;
  readonly isBudgetRoute: boolean;
  readonly isAssistanceRoute: boolean;
  readonly isReturnRoute: boolean;
  readonly isAdministrator: boolean;
  readonly showTestOrders: boolean;
  readonly onToggleShowTestOrders: (checked: boolean) => void;
  readonly customerSearchInput: string;
  readonly onCustomerSearchChange: (val: string) => void;
  readonly onCustomerSearchFocus?: () => void;
  readonly onCustomerSearchBlur?: () => void;
  readonly onCustomerSearchKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly onCustomerSearchClear?: () => void;
  readonly showSettings: boolean;
  readonly onToggleShowSettings: () => void;
  readonly onCloseSettings: () => void;
  readonly visibilitySettings: VisibilitySettings;
  readonly onToggleVisibility: (key: keyof VisibilitySettings) => void;
  readonly showOrderFilters: boolean;
  readonly isSidebarOpen: boolean;
  readonly onToggleSidebar: () => void;
  readonly onCreateOrder: (type: 'sale' | 'budget' | 'assistance' | 'return') => void;
}

export const SalesOrderTopToolbar: React.FC<SalesOrderTopToolbarProps> = ({
  isSalesOrderRoute,
  isBudgetRoute,
  isAssistanceRoute,
  isReturnRoute,
  isAdministrator,
  showTestOrders,
  onToggleShowTestOrders,
  customerSearchInput,
  onCustomerSearchChange,
  onCustomerSearchFocus,
  onCustomerSearchBlur,
  onCustomerSearchKeyDown,
  onCustomerSearchClear,
  showSettings,
  onToggleShowSettings,
  onCloseSettings,
  visibilitySettings,
  onToggleVisibility,
  showOrderFilters,
  isSidebarOpen,
  onToggleSidebar,
  onCreateOrder,
}) => {
  const [isCompactActionsOpen, setIsCompactActionsOpen] = React.useState(false);
  const compactActionsRef = React.useRef<HTMLDivElement>(null);
  const compactCreateAction = isBudgetRoute
    ? { type: 'budget' as const, label: 'Novo Orçamento', icon: 'bi-calculator-fill' }
    : isAssistanceRoute
      ? { type: 'assistance' as const, label: 'Nova Assistência Avulsa', icon: 'bi-tools' }
      : isReturnRoute
        ? { type: 'return' as const, label: 'Nova Devolução avulsa', icon: 'bi-arrow-counterclockwise' }
        : { type: 'sale' as const, label: 'Nova Venda', icon: 'bi-plus-lg' };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compactActionsRef.current && !compactActionsRef.current.contains(event.target as Node)) {
        setIsCompactActionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCompactActionsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 mb-3">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Lado esquerdo: no Pedidos de Venda fica o campo de busca de cliente; nas outras abas fica o título */}
        {isSalesOrderRoute ? (
          <div className="flex-1 min-w-0 lg:max-w-md">
            <OrderCustomerSearchBar
              value={customerSearchInput}
              onChange={onCustomerSearchChange}
              onSearchFocus={onCustomerSearchFocus}
              onSearchBlur={onCustomerSearchBlur}
              onKeyDown={onCustomerSearchKeyDown}
              onClear={onCustomerSearchClear}
              placeholder="Buscar pedido pelo nome do cliente (mín. 3 caracteres)..."
            />
          </div>
        ) : (
          <div className="min-w-0 hidden lg:block">
            <h1 className="text-xl xl:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-all leading-tight">
              {isBudgetRoute
                ? 'Orçamentos'
                : isAssistanceRoute
                  ? 'Assistências'
                  : isReturnRoute
                    ? 'Devoluções'
                    : 'Pedidos de Venda'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] mt-0.5 hidden lg:block">
              {isBudgetRoute
                ? 'Gestão de Propostas e Orçamentos'
                : isAssistanceRoute
                  ? 'Atendimento Técnico e Manutenção'
                  : isReturnRoute
                    ? 'Controle de Devoluções e Estornos'
                    : 'Gestão de Vendas e Fluxo de Pedidos'}
            </p>
          </div>
        )}

        {/* Action Buttons Group */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {isAdministrator && (
            <div className="hidden lg:block">
              <ShowTestDataToggle checked={showTestOrders} onChange={onToggleShowTestOrders} />
            </div>
          )}

          {/* Visualização Dropdown */}
          {!isReturnRoute && !isSalesOrderRoute && (
            <div className="relative hidden lg:block">
              <button
                onClick={onToggleShowSettings}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl transition-all shadow-sm font-bold text-[10px] uppercase tracking-wider active:scale-95 ${
                  showSettings
                    ? 'border-blue-300 text-blue-600 dark:border-blue-800'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                title="Visualização"
              >
                <i
                  className={`bi ${showSettings ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-sm`}
                ></i>
                <span>Visualização</span>
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={onCloseSettings} />
                  <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-slide-up">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                      Colunas da Tabela
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {TABLE_VISIBILITY_COLUMNS.map((col) => (
                        <button
                          key={col.key}
                          onClick={() => onToggleVisibility(col.key)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 transition-all group outline-none"
                        >
                          <span
                            className={`text-[11px] font-bold ${
                              visibilitySettings[col.key]
                                ? 'text-slate-700 dark:text-slate-200'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          >
                            {col.label}
                          </span>
                          <div
                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                              visibilitySettings[col.key]
                                ? 'bg-blue-600 dark:bg-blue-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          >
                            <div
                              className={`w-3 h-3 bg-white dark:bg-slate-300 rounded-full transition-transform ${
                                visibilitySettings[col.key] ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Filtros: exibidos antes da criação e alinhados à direita em telas menores */}
          {showOrderFilters && (
            <button
              onClick={onToggleSidebar}
              className={`min-[1701px]:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shadow-sm font-bold text-[10px] uppercase tracking-widest border ${
                isSidebarOpen
                  ? 'bg-white text-blue-600 border-blue-100 dark:bg-slate-900 dark:border-blue-900/30'
                  : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
              }`}
              title="Filtros"
            >
              <i className={`bi ${isSidebarOpen ? 'bi-funnel-fill' : 'bi-funnel'} text-sm`}></i>
              <span>Filtros</span>
            </button>
          )}

          {/* Botões de Criação Conforme Rota */}
          {isBudgetRoute && (
            <button
              onClick={() => onCreateOrder('budget')}
              className="hidden lg:flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <i className="bi bi-plus-lg text-sm" />
              <span>Novo Orçamento</span>
            </button>
          )}
          {isAssistanceRoute && (
            <button
              onClick={() => onCreateOrder('assistance')}
              className="hidden lg:flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <i className="bi bi-tools text-sm" />
              <span>Nova Assistência Avulsa</span>
            </button>
          )}
          {isReturnRoute && (
            <button
              onClick={() => onCreateOrder('return')}
              className="hidden lg:flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <ReturnIcon white className="h-5 w-5" />
              <span>Nova Devolução avulsa</span>
            </button>
          )}
          {!isBudgetRoute && !isAssistanceRoute && !isReturnRoute && (
            <button
              onClick={() => onCreateOrder('sale')}
              className="hidden lg:flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
              <i className="bi bi-plus-lg text-sm" />
              <span>Nova Venda</span>
            </button>
          )}

          <div className="relative lg:hidden" ref={compactActionsRef}>
            <button
              type="button"
              onClick={() => setIsCompactActionsOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Mais opções"
              aria-label="Mais opções de pedidos"
              aria-haspopup="true"
              aria-expanded={isCompactActionsOpen}
              aria-controls="sales-order-compact-actions"
            >
              <i className="bi bi-three-dots-vertical text-lg" aria-hidden="true" />
            </button>

            {isCompactActionsOpen && (
              <div
                id="sales-order-compact-actions"
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                {isAdministrator && (
                  <div className="px-3 py-2">
                    <ShowTestDataToggle
                      checked={showTestOrders}
                      onChange={onToggleShowTestOrders}
                      compact
                    />
                  </div>
                )}
                {isAdministrator && <div className="mx-3 h-px bg-slate-100 dark:bg-slate-800" />}
                <button
                  type="button"
                  onClick={() => {
                    setIsCompactActionsOpen(false);
                    onCreateOrder(compactCreateAction.type);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <i
                    className={`bi ${compactCreateAction.icon} text-base text-slate-500 dark:text-slate-400`}
                    aria-hidden="true"
                  />
                  {compactCreateAction.label}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
