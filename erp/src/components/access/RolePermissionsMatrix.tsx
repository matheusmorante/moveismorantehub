import React, { useMemo, useState } from 'react';
import type { UserRole } from '@/context/AuthContext';
import type { AppSettings } from '@/pages/utils/settingsService';
import {
  findPermissionAction,
  PERMISSION_AREAS,
  type PermissionActionDef,
  type PermissionAreaDef,
  ROLES,
  isFinanceAdminOnlyAction,
} from '@/pages/utils/permissionConfig';

interface RolePermissionsMatrixProps {
  settings: AppSettings;
  onPermissionsChange: (permissions: Record<string, string[]>) => void;
}

const capabilityLabels: Record<PermissionActionDef['capability'], string> = {
  view: 'Acessar',
  edit: 'Criar e editar',
  delete: 'Excluir',
  operate: 'Operar',
  export: 'Exportar',
};

const moduleViewChildren: Record<string, string[]> = {
  viewStock: [
    'viewStockMovements',
    'viewStockInventory',
    'viewStockUnavailabilities',
    'viewStockPurchases',
    'viewStockReceipts',
    'viewStockLabels',
    'viewBlingStock',
  ],
  viewPeople: ['viewCustomers', 'viewEmployees', 'viewServices', 'viewCustomerDesires'],
  viewFinancials: [
    'viewFinanceTransactions',
    'viewFinancePayables',
    'viewFinanceReceivables',
    'viewFinanceSettings',
  ],
  viewMarketing: ['viewMarketingPosts', 'viewChannelCatalog', 'viewMetaCatalog'],
};

export const RolePermissionsMatrix: React.FC<RolePermissionsMatrixProps> = ({
  settings,
  onPermissionsChange,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');

  const isGranted = (actionId: string, role: UserRole): boolean => {
    if (role === 'administrator') return true;
    if (isFinanceAdminOnlyAction(actionId)) return false;
    const savedRoles = settings.rolePermissions?.[actionId];
    if (savedRoles !== undefined) return savedRoles.includes(role);
    return findPermissionAction(actionId)?.defaultRoles.includes(role) ?? false;
  };

  const countGranted = (actions: PermissionActionDef[], role: UserRole) =>
    actions.filter((permission) => isGranted(permission.id, role)).length;

  const updatePermission = (actionId: string, role: UserRole, enabled: boolean) => {
    if (role === 'administrator' || isFinanceAdminOnlyAction(actionId)) return;

    const selectedAction = findPermissionAction(actionId);
    if (!selectedAction) return;

    const area = PERMISSION_AREAS.find((candidate) =>
      candidate.actions.some((permission) => permission.id === actionId)
    );
    const relatedActions = area?.actions.filter(
      (permission) => permission.submodule === selectedAction.submodule
    ) ?? [selectedAction];
    const viewAction = relatedActions.find((permission) => permission.capability === 'view');
    const updates: Record<string, string[]> = {};

    const applyRole = (permission: PermissionActionDef, nextEnabled: boolean) => {
      const currentRoles = updates[permission.id] ?? settings.rolePermissions?.[permission.id];
      const roleList = currentRoles ?? [...permission.defaultRoles];
      const nextRoles = nextEnabled
        ? [...new Set([...roleList, role])]
        : roleList.filter((assignedRole) => assignedRole !== role);
      updates[permission.id] = nextRoles;
    };

    applyRole(selectedAction, enabled);

    if (selectedAction.capability === 'view' && !enabled) {
      relatedActions
        .filter((permission) => permission.capability !== 'view')
        .forEach((permission) => applyRole(permission, false));
    } else if (selectedAction.capability !== 'view' && enabled && viewAction) {
      applyRole(viewAction, true);
    }

    const childIds = moduleViewChildren[selectedAction.id];
    if (childIds) {
      childIds.forEach((childId) => {
        const childAction = findPermissionAction(childId);
        if (childAction) applyRole(childAction, enabled);
      });
    } else if (selectedAction.capability === 'view') {
      const [parentId, siblingIds] = Object.entries(moduleViewChildren).find(([, childIds]) =>
        childIds.includes(selectedAction.id)
      ) ?? [];
      if (parentId && siblingIds) {
        if (enabled) {
          const parentAction = findPermissionAction(parentId);
          if (parentAction) applyRole(parentAction, true);
        } else {
          const anySiblingGranted = siblingIds.some((siblingId) => {
            const nextRoles = updates[siblingId] ?? settings.rolePermissions?.[siblingId];
            return nextRoles !== undefined
              ? nextRoles.includes(role)
              : (findPermissionAction(siblingId)?.defaultRoles.includes(role) ?? false);
          });
          if (!anySiblingGranted) {
            const parentAction = findPermissionAction(parentId);
            if (parentAction) applyRole(parentAction, false);
          }
        }
      }
    }

    Object.entries(moduleViewChildren).forEach(([parentId, childIds]) => {
      if (!childIds.some((childId) => updates[childId] !== undefined)) return;
      const hasGrantedChild = childIds.some((childId) => {
        const nextRoles = updates[childId] ?? settings.rolePermissions?.[childId];
        return nextRoles !== undefined
          ? nextRoles.includes(role)
          : (findPermissionAction(childId)?.defaultRoles.includes(role) ?? false);
      });
      const parentAction = findPermissionAction(parentId);
      if (parentAction) applyRole(parentAction, hasGrantedChild);
    });
    onPermissionsChange(updates);
  };

  const updateArea = (area: PermissionAreaDef, role: UserRole, enabled: boolean) => {
    if (
      role === 'administrator' ||
      area.actions.some((permission) => isFinanceAdminOnlyAction(permission.id))
    ) return;
    const updates: Record<string, string[]> = {};
    area.actions.forEach((permission) => {
      const currentRoles = updates[permission.id] ?? settings.rolePermissions?.[permission.id] ?? [...permission.defaultRoles];
      const nextRoles = enabled
        ? [...new Set([...currentRoles, role])]
        : currentRoles.filter((assignedRole) => assignedRole !== role);
      updates[permission.id] = nextRoles;
    });
    onPermissionsChange(updates);
  };

  const allActions = useMemo(() => PERMISSION_AREAS.flatMap((area) => area.actions), []);
  const totalActions = allActions.length;
  const activeActionsCount = countGranted(allActions, selectedRole);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <i className="bi bi-shield-lock-fill" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              Permissões por perfil
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Escolha um perfil e configure o acesso por módulo, submódulo e ação. Usuários com mais
              de um perfil recebem a união das permissões. Administradores mantêm acesso total.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ROLES.map((role) => {
            const selected = selectedRole === role.value;
            const grantedCount = countGranted(allActions, role.value);

            return (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                aria-pressed={selected}
                className={`flex min-h-[72px] items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20 dark:bg-blue-950/40'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    selected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <i className={`bi ${role.icon}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100">
                    {role.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">
                    {role.value === 'administrator'
                      ? 'Acesso total'
                      : `${grantedCount} de ${totalActions} permissões`}
                  </span>
                </span>
                {selected && <i className="bi bi-check-circle-fill text-blue-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRole === 'administrator' ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <i className="bi bi-shield-check mt-0.5 text-lg text-amber-600 dark:text-amber-400" />
          <p className="text-xs leading-relaxed">
            O perfil Administrador tem acesso irrestrito a todos os módulos, submódulos e ações. Esse
            acesso não pode ser removido nesta matriz.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {ROLES.find((role) => role.value === selectedRole)?.label}
            </h4>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {activeActionsCount} permissões ativas
            </span>
          </div>

          {PERMISSION_AREAS.map((area) => {
            const grantedCount = countGranted(area.actions, selectedRole);
            const allGranted = grantedCount === area.actions.length;
            const financeArea = area.actions.some((permission) => isFinanceAdminOnlyAction(permission.id));
            const submodules = Array.from(new Set(area.actions.map((permission) => permission.submodule)));

            return (
              <section
                key={area.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <i className={`bi ${area.icon}`} />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-slate-800 dark:text-slate-100">
                        {area.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                        {area.description}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {grantedCount}/{area.actions.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateArea(area, selectedRole, !allGranted)}
                      disabled={financeArea}
                      title={financeArea ? 'O Financeiro em beta está disponível somente para administradores.' : undefined}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {allGranted ? 'Revogar módulo' : 'Liberar módulo'}
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
                  {submodules.map((submodule) => {
                    const submoduleActions = area.actions.filter(
                      (permission) => permission.submodule === submodule
                    );
                    const hasAccess = submoduleActions.some((permission) =>
                      isGranted(permission.id, selectedRole)
                    );

                    return (
                      <div
                        key={submodule}
                        className={`rounded-xl border p-3 transition-colors ${
                          hasAccess
                            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                            : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/30'
                        }`}
                      >
                        <div className="mb-2.5 flex items-center justify-between gap-2">
                          <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">
                            {submodule}
                          </h5>
                          <span
                            className={`text-[9px] font-black uppercase tracking-wide ${
                              hasAccess ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            {hasAccess ? 'Liberado' : 'Bloqueado'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {submoduleActions.map((permission) => {
                            const granted = isGranted(permission.id, selectedRole);
                            return (
                              <button
                                key={permission.id}
                                type="button"
                                disabled={isFinanceAdminOnlyAction(permission.id)}
                                onClick={() =>
                                  updatePermission(permission.id, selectedRole, !granted)
                                }
                                aria-pressed={granted}
                                title={isFinanceAdminOnlyAction(permission.id)
                                  ? 'O Financeiro em beta está disponível somente para administradores.'
                                  : permission.description}
                                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent dark:hover:bg-slate-900/80"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <i
                                    className={`bi ${permission.icon} text-xs ${granted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                                  />
                                  <span className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    {capabilityLabels[permission.capability]}
                                  </span>
                                </span>
                                <span
                                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                                    granted ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                      granted ? 'translate-x-[18px]' : 'translate-x-0.5'
                                    }`}
                                  />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RolePermissionsMatrix;
