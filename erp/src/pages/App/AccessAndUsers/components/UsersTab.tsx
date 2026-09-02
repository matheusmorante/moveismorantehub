import React, { useState } from 'react';
import Person from '../../../types/person.type';
import { UserRole } from '@/context/AuthContext';
import { roleLabel } from '@/pages/utils/accessRoles';
import PersonFormModal from '../../Registrations/shared/PersonFormModal';
import { updatePerson } from '@/pages/utils/personService';
import { toast } from 'react-toastify';

interface Props {
  people: Person[];
  loading: boolean;
  onRefresh: () => void;
}

const ROLE_BADGE_STYLES: Record<UserRole, { bg: string; text: string; icon: string }> = {
  administrator: { bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', icon: 'bi-shield-shaded' },
  manager: { bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', icon: 'bi-briefcase-fill' },
  seller: { bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', icon: 'bi-tag-fill' },
  deliverer: { bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', icon: 'bi-truck' },
  pending: { bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', icon: 'bi-slash-circle' },
};

export const UsersTab: React.FC<Props> = ({ people, loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const filteredPeople = people.filter((p) => {
    const term = search.toLowerCase().trim();
    const matchesSearch = !term ||
      (p.fullName || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term) ||
      (p.phone || '').includes(term);

    const rolesList = p.roles && p.roles.length > 0 ? p.roles : (p.role ? [p.role] : ['pending']);
    const matchesRole = selectedRole === 'all' || rolesList.includes(selectedRole as UserRole);

    return matchesSearch && matchesRole;
  });

  const handleOpenAdd = () => {
    setEditingPerson(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (person: Person) => {
    setEditingPerson(person);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (person: Person) => {
    try {
      await updatePerson('employees', String(person.id), { active: !person.active });
      toast.success(person.active ? 'Colaborador inativado.' : 'Colaborador ativado.');
      onRefresh();
    } catch (err) {
      toast.error('Erro ao alterar status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeletePerson) return;
    try {
      await moveToTrash('employees', String(confirmDeletePerson.id));
      toast.info('Colaborador movido para a lixeira.');
      setConfirmDeletePerson(null);
      onRefresh();
    } catch (err) {
      toast.error('Erro ao excluir colaborador.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra Superior: Busca, Filtros de Cargo e Botão Novo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-1 items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <i className="bi bi-search text-slate-400 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none w-full placeholder-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
              <i className="bi bi-x-circle-fill" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Todos os Cargos</option>
            <option value="administrator">Administrador</option>
            <option value="manager">Gestor</option>
            <option value="seller">Vendedor</option>
            <option value="deliverer">Entregador / Montador</option>
            <option value="pending">Sem Acesso</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
            <p className="text-xs text-slate-400 mt-3 font-bold">Carregando usuários...</p>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <i className="bi bi-people text-4xl text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhum usuário ou colaborador encontrado</p>
            <p className="text-xs text-slate-400">Tente ajustar os termos de busca ou filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <th className="py-3.5 px-4">Usuário / Colaborador</th>
                  <th className="py-3.5 px-4">Cargos Atribuídos</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Telefone</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Endereço</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPeople.map((person) => {
                  const rolesList = person.roles && person.roles.length > 0 ? person.roles : (person.role ? [person.role] : ['pending']);
                  const initials = (person.fullName || person.email || 'U').substring(0, 2).toUpperCase();

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Usuário e Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{person.fullName || 'Sem nome'}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{person.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Cargos */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {rolesList.map((r) => {
                            const badge = ROLE_BADGE_STYLES[r as UserRole] || ROLE_BADGE_STYLES.pending;
                            return (
                              <span
                                key={r}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badge.bg} ${badge.text}`}
                              >
                                <i className={`bi ${badge.icon} text-[10px]`} />
                                {roleLabel(r as UserRole)}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Telefone */}
                      <td className="py-3 px-4 hidden md:table-cell text-slate-600 dark:text-slate-300 font-medium">
                        {person.phone || '-'}
                      </td>

                      {/* Endereço */}
                      <td className="py-3 px-4 hidden lg:table-cell text-slate-500 dark:text-slate-400 text-[11px]">
                        {person.fullAddress?.street ? (
                          <span className="truncate block max-w-xs">{person.fullAddress.street}, {person.fullAddress.number} - {person.fullAddress.city}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 italic">Não informado</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(person)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            person.active !== false
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {person.active !== false ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(person)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer"
                            title="Editar dados e cargos do usuário"
                          >
                            <i className="bi bi-person-gear text-sm" />
                            <span>Definir Cargos / Editar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edição com Atribuição de Cargos */}
      {isModalOpen && (
        <PersonFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingPerson(null); }}
          onSuccess={() => { setIsModalOpen(false); setEditingPerson(null); onRefresh(); }}
          person={editingPerson}
          collectionName="employees"
          title="Usuário"
        />
      )}
    </div>
  );
};
