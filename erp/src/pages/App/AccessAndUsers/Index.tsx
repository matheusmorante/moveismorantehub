import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Person from '../../../types/person.type';
import { subscribeToPeople } from '@/pages/utils/personService';
import { AccessStatsCards } from './components/AccessStatsCards';
import { UsersTab } from './components/UsersTab';
import { RolePermissionsTab } from './components/RolePermissionsTab';

export default function AccessAndUsersPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToPeople('employees', (data) => {
      setPeople(data);
      setLoading(false);
    }, false);
    return () => unsub();
  }, [refreshKey]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center p-4">
        <div>
          <i className="bi bi-shield-lock-fill mb-4 block text-6xl text-slate-300 dark:text-slate-600" />
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Acesso Restrito</h2>
          <p className="text-sm text-slate-400 mt-1">Apenas administradores podem gerenciar acessos e usuários.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <i className="bi bi-shield-lock-fill text-lg" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Gestão de Acessos e Usuários
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                Gerencie colaboradores, atribuição de cargos e permissões de acesso por área do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i className="bi bi-people-fill" />
            <span>Colaboradores & Usuários</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'permissions'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i className="bi bi-shield-shaded" />
            <span>Permissões por Cargo</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <AccessStatsCards people={people} />

      {/* Conteúdo da Aba */}
      {activeTab === 'users' ? (
        <UsersTab people={people} loading={loading} onRefresh={handleRefresh} />
      ) : (
        <RolePermissionsTab />
      )}
    </div>
  );
}
