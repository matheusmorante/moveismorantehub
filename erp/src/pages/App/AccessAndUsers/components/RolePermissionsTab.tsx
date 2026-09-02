import React, { useState, useEffect } from 'react';
import { UserRole } from '@/context/AuthContext';
import { AppSettings, getSettings, subscribeToSettings, saveSettings } from '@/pages/utils/settingsService';
import { ROLES, PERMISSION_AREAS, PermissionAreaDef, PermissionActionDef } from '@/pages/utils/permissionConfig';
import { toast } from 'react-toastify';

export const RolePermissionsTab: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');

  useEffect(() => {
    const unsub = subscribeToSettings((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsub();
  }, []);

  const isGranted = (actionId: string, role: UserRole): boolean => {
    if (role === 'administrator') return true;
    const currentList = settings.rolePermissions?.[actionId];
    if (currentList !== undefined) {
      return currentList.includes(role);
    }
    // Fallback to default definition
    for (const area of PERMISSION_AREAS) {
      const act = area.actions.find(a => a.id === actionId);
      if (act) return act.defaultRoles.includes(role);
    }
    return false;
  };

  const toggleActionPermission = async (actionId: string, role: UserRole) => {
    if (role === 'administrator') return;

    const currentGranted = isGranted(actionId, role);
    let currentList: string[] = settings.rolePermissions?.[actionId] ?? [];
    
    // If setting was never initialized, initialize from default definition
    if (settings.rolePermissions?.[actionId] === undefined) {
      for (const area of PERMISSION_AREAS) {
        const act = area.actions.find(a => a.id === actionId);
        if (act) {
          currentList = [...act.defaultRoles];
          break;
        }
      }
    }

    const nextList = currentGranted
      ? currentList.filter(r => r !== role)
      : [...new Set([...currentList, role])];

    const nextPermissions = {
      ...(settings.rolePermissions || {}),
      [actionId]: nextList,
    };

    setSettings(prev => ({
      ...prev,
      rolePermissions: nextPermissions,
    }));

    try {
      await saveSettings({
        ...settings,
        rolePermissions: nextPermissions,
      });
      toast.success(`Ação ${currentGranted ? 'bloqueada' : 'permitida'} para ${ROLES.find(r => r.value === role)?.label || role}`, { autoClose: 1200 });
    } catch (err) {
      toast.error('Erro ao salvar permissão.');
    }
  };

  const toggleAllInArea = async (area: PermissionAreaDef, role: UserRole, enable: boolean) => {
    if (role === 'administrator') return;

    const nextPermissions = { ...(settings.rolePermissions || {}) };

    area.actions.forEach(action => {
      let currentList: string[] = nextPermissions[action.id] ?? [...action.defaultRoles];
      if (enable) {
        currentList = [...new Set([...currentList, role])];
      } else {
        currentList = currentList.filter(r => r !== role);
      }
      nextPermissions[action.id] = currentList;
    });

    setSettings(prev => ({
      ...prev,
      rolePermissions: nextPermissions,
    }));

    try {
      await saveSettings({
        ...settings,
        rolePermissions: nextPermissions,
      });
      toast.success(`${enable ? 'Todas as ações permitidas' : 'Todas as ações revogadas'} em ${area.name}`, { autoClose: 1500 });
    } catch (err) {
      toast.error('Erro ao atualizar área.');
    }
  };

  // Count active actions for selected role
  const totalActions = PERMISSION_AREAS.reduce((acc, area) => acc + area.actions.length, 0);
  const activeActionsCount = PERMISSION_AREAS.reduce((acc, area) => {
    return acc + area.actions.filter(act => isGranted(act.id, selectedRole)).length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <i className="bi bi-shield-lock-fill text-sm" />
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Permissões e Ações por Perfil de Acesso
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Selecione um <strong>Perfil de Acesso (Tópico Principal)</strong> e configure detalhadamente cada <strong>Ação permitida em cada Área do sistema (Subtópico)</strong>. Usuários com múltiplos perfis possuem permissões acumulativas. Administradores possuem acesso total irrestrito.
          </p>
        </div>

        {/* Cargo Selector Tabs (Top Level Topics) */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2.5">
            Selecione o Perfil de Acesso para Configurar Ações:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.value;
              const count = PERMISSION_AREAS.reduce((acc, area) => {
                return acc + area.actions.filter(act => isGranted(act.id, role.value)).length;
              }, 0);

              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-900/40 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    <i className={`bi ${role.icon} text-base`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">
                      {role.label}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-tight line-clamp-2">
                      {role.description}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        role.value === 'administrator'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {role.value === 'administrator' ? 'Acesso Total' : `${count} de ${totalActions} ações`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Admin Disclaimer Banner */}
      {selectedRole === 'administrator' && (
        <div className="p-6 rounded-3xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <i className="bi bi-shield-check text-xl font-black" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wide">
              Administrador possui Acesso Irrestrito
            </h4>
            <p className="text-xs mt-1 leading-relaxed text-amber-800 dark:text-amber-300">
              O cargo de Administrador possui controle total sobre todas as áreas, menus, ações e relatórios do ERP e do aplicativo móvel. As permissões deste cargo são mantidas ativas permanentemente por segurança.
            </p>
          </div>
        </div>
      )}

      {/* Action Sections by Area (Subtopics) */}
      {selectedRole !== 'administrator' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Áreas do Sistema (Subtópicos de {ROLES.find(r => r.value === selectedRole)?.label})
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
              {activeActionsCount} de {totalActions} ações liberadas
            </span>
          </div>

          {PERMISSION_AREAS.map((area) => {
            const areaActionsGranted = area.actions.filter(act => isGranted(act.id, selectedRole)).length;
            const allGranted = areaActionsGranted === area.actions.length;

            return (
              <div
                key={area.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/90 shadow-sm overflow-hidden"
              >
                {/* Area Header (Subtopic Header) */}
                <div className="p-5 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/60 shadow-sm">
                      <i className={`bi ${area.icon} text-lg`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {area.name}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {area.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2">
                      {areaActionsGranted} / {area.actions.length} permitidas
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAllInArea(area, selectedRole, !allGranted)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        allGranted
                          ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
                          : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100'
                      }`}
                    >
                      {allGranted ? 'Desmarcar Área' : 'Marcar Todas'}
                    </button>
                  </div>
                </div>

                {/* Actions List (Checkboxes per Action) */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {area.actions.map((action) => {
                    const granted = isGranted(action.id, selectedRole);

                    return (
                      <div
                        key={action.id}
                        onClick={() => toggleActionPermission(action.id, selectedRole)}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none group ${
                          granted
                            ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500'
                            : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Custom Checkbox */}
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          granted
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-transparent group-hover:border-slate-400'
                        }`}>
                          <i className="bi bi-check-lg text-xs font-black" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <i className={`bi ${action.icon} text-xs ${granted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                              {action.label}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              granted
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}>
                              {granted ? 'Permitido' : 'Bloqueado'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
