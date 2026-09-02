import React from 'react';
import Person from '../../../types/person.type';
import { UserRole } from '@/context/AuthContext';

interface Props {
  people: Person[];
}

export const AccessStatsCards: React.FC<Props> = ({ people }) => {
  const getCountByRole = (role: UserRole) => {
    return people.filter(p => {
      if (p.roles && p.roles.length > 0) return p.roles.includes(role);
      return p.role === role;
    }).length;
  };

  const total = people.length;
  const admins = getCountByRole('administrator');
  const managers = getCountByRole('manager');
  const stockists = getCountByRole('stockist');
  const sellers = getCountByRole('seller');
  const deliverers = getCountByRole('deliverer');
  const pending = getCountByRole('pending');

  const stats = [
    { label: 'Total Usuários', count: total, icon: 'bi-people-fill', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30' },
    { label: 'Administradores', count: admins, icon: 'bi-shield-shaded', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30' },
    { label: 'Gestores', count: managers, icon: 'bi-briefcase-fill', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' },
    { label: 'Estoquistas', count: stockists, icon: 'bi-boxes', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/30' },
    { label: 'Vendedores', count: sellers, icon: 'bi-tag-fill', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' },
    { label: 'Entregadores', count: deliverers, icon: 'bi-truck', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30' },
    { label: 'Sem Acesso', count: pending, icon: 'bi-slash-circle', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`p-4 rounded-2xl border ${s.bg} flex flex-col justify-between transition-all shadow-xs`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{s.label}</span>
            <i className={`bi ${s.icon} text-sm ${s.color}`} />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{s.count}</p>
        </div>
      ))}
    </div>
  );
};
