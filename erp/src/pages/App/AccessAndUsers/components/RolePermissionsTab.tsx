import React, { useState, useEffect } from 'react';
import { UserRole } from '@/context/AuthContext';
import { AppSettings, getSettings, subscribeToSettings, saveSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';

interface RoleOption {
  value: UserRole;
  label: string;
  icon: string;
}

const ROLES: RoleOption[] = [
  { value: 'administrator', label: 'Administrador', icon: 'bi-shield-shaded' },
  { value: 'manager', label: 'Gestor', icon: 'bi-briefcase-fill' },
  { value: 'seller', label: 'Vendedor', icon: 'bi-tag-fill' },
  { value: 'deliverer', label: 'Entregador / Montador', icon: 'bi-truck' },
];

interface AreaConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const AREAS: AreaConfig[] = [
  {
    id: 'manualStockMovement',
    name: 'Movimentação de Estoque',
    description: 'Permite realizar entradas, saídas e ajustes manuais de estoque.',
    icon: 'bi-boxes',
  },
  {
    id: 'productConfig',
    name: 'Produtos e Cadastros',
    description: 'Permite criar, editar e configurar catálogo de produtos e variações.',
    icon: 'bi-box-seam',
  },
  {
    id: 'viewFinancials',
    name: 'Financeiro e Relatórios',
    description: 'Permite visualizar faturamento, ticket médio e relatórios analíticos.',
    icon: 'bi-currency-dollar',
  },
  {
    id: 'deleteOrders',
    name: 'Excluir Pedidos',
    description: 'Permite apagar ou mover pedidos de venda para a lixeira.',
    icon: 'bi-trash3-fill',
  },
  {
    id: 'startDelivery',
    name: 'Iniciar Entrega',
    description: 'Permite iniciar rotas de entrega e marcar pedidos em trânsito no app.',
    icon: 'bi-truck',
  },
];

export const RolePermissionsTab: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    const unsub = subscribeToSettings((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsub();
  }, []);

  const togglePermission = async (areaId: string, role: UserRole) => {
    if (role === 'administrator') return; // Administrador é sempre irrestrito

    const currentList: string[] = settings.rolePermissions?.[areaId as keyof NonNullable<AppSettings['rolePermissions']>] || [];
    const isGranted = currentList.includes(role);
    const nextList = isGranted
      ? currentList.filter(item => item !== role)
      : [...currentList, role];

    const nextPermissions = {
      ...(settings.rolePermissions || {}),
      [areaId]: nextList,
    };

    setSettings(prev => ({
      ...prev,
      rolePermissions: nextPermissions as any,
    }));

    try {
      await updateSettings({
        ...settings,
        rolePermissions: nextPermissions as any,
      });
      toast.success(`Permissão ${isGranted ? 'revogada' : 'concedida'} com sucesso!`, { autoClose: 1500 });
    } catch (err) {
      toast.error('Erro ao salvar permissão.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <i className="bi bi-shield-lock-fill text-blue-600" />
            Permissões de Áreas por Cargo
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Defina exatamente quais áreas e funções cada cargo da empresa pode acessar no ERP e no aplicativo móvel. Administradores possuem acesso total fixo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 pt-2">
          {AREAS.map((area) => (
            <div
              key={area.id}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <i className={`bi ${area.icon} text-base text-blue-600 dark:text-blue-400`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {area.name}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                    {area.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/60">
                {ROLES.map((role) => {
                  const isMasterAdmin = role.value === 'administrator';
                  const currentGrantedList = settings.rolePermissions?.[area.id as keyof NonNullable<AppSettings['rolePermissions']>] || [];
                  const isGranted = isMasterAdmin || currentGrantedList.includes(role.value);

                  return (
                    <button
                      key={role.value}
                      type="button"
                      disabled={isMasterAdmin}
                      onClick={() => togglePermission(area.id, role.value)}
                      title={
                        isMasterAdmin
                          ? 'Administrador tem acesso total e não pode ser desmarcado'
                          : isGranted
                            ? `Clique para revogar acesso de ${role.label}`
                            : `Clique para liberar acesso de ${role.label}`
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                        isMasterAdmin
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 opacity-90 cursor-default'
                          : isGranted
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-95'
                            : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95'
                      }`}
                    >
                      <i className={`bi ${role.icon} text-xs`} />
                      <span>{role.label}</span>
                      {isGranted && (
                        <i className="bi bi-check2 text-xs font-black ml-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
