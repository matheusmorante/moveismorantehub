import React from 'react';
import CurrencyInput from '../../../../components/inputs/CurrencyInput';
import type { FinancialCategory, FinancialTransaction } from '../../../types/finance.type';
import {
  accounts,
  isProLabore,
  paymentMethods,
  type TransactionFormData,
  vehicles,
} from './transactionFormModel';

interface TransactionFormModalProps {
  isOpen: boolean;
  editingTransaction: FinancialTransaction | null;
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  categories: FinancialCategory[];
  availableCategories: FinancialCategory[];
  collaborators: { id: string; name: string }[];
  collaboratorsLoading: boolean;
  needsVehicle: boolean;
  needsCollaborator: boolean;
  saving: boolean;
  operationBlocked: boolean;
  operationError: string | null;
  onClose: () => void;
  onSubmit: () => void;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  editingTransaction,
  formData,
  setFormData,
  categories,
  availableCategories,
  collaborators,
  collaboratorsLoading,
  needsVehicle,
  needsCollaborator,
  saving,
  operationBlocked,
  operationError,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="financial-transaction-title"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col animate-slide-up"
      >
        <div className="p-6 xl:p-8 border-b border-slate-50 dark:border-slate-800">
          {operationError && <p role="alert" className="p-4 text-red-700">{operationError}</p>}
          {saving && <p role="status" className="p-4 animate-pulse">Validando e registrando a movimentação…</p>}
          <h2 id="financial-transaction-title" className="text-xl font-black text-slate-800 dark:text-slate-100">
            {editingTransaction ? 'Editar movimentação' : 'Lançamento Direto no Caixa'}
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Sem vínculo com Contas a Pagar/Receber
          </p>
        </div>

        <fieldset disabled={operationBlocked} className="p-6 xl:p-8 space-y-4">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setFormData({
                ...formData,
                type: 'income',
                category_id: '',
                category_name: '',
                purpose: 'BUSINESS',
                vehicle_id: '',
                collaborator_id: '',
                collaborator_name: '',
              })}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                formData.type === 'income'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                  : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              Entrada
            </button>
            <button
              onClick={() => setFormData({
                ...formData,
                type: 'expense',
                category_id: '',
                category_name: '',
                purpose: 'BUSINESS',
                vehicle_id: '',
                collaborator_id: '',
                collaborator_name: '',
              })}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                formData.type === 'expense'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none'
                  : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              Saída
            </button>
          </div>

          {formData.type === 'expense' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Finalidade</label>
              <div role="group" aria-label="Finalidade da saída" className="flex gap-2">
                {[
                  { value: 'BUSINESS', label: '🏢 Operação da Empresa' },
                  { value: 'PERSONAL_PARTNER', label: '👤 Uso Particular' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={formData.purpose === option.value}
                    onClick={() => {
                      const purpose = option.value as 'BUSINESS' | 'PERSONAL_PARTNER';
                      const proLabore = purpose === 'PERSONAL_PARTNER'
                        ? categories.find((category) => category.type === 'expense' && isProLabore(category.name))
                        : undefined;
                      setFormData({
                        ...formData,
                        purpose,
                        category_id: proLabore?.id || '',
                        category_name: proLabore?.name || '',
                        vehicle_id: '',
                        collaborator_id: '',
                        collaborator_name: '',
                      });
                    }}
                    className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold ${formData.purpose === option.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-4">
            <CurrencyInput
              value={formData.amount}
              onChangeValue={(val) => setFormData({ ...formData, amount: val })}
              showBadge={false}
              className="w-1/2 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-1/2 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={formData.category_id}
            onChange={(e) => {
              const category = availableCategories.find((item) => item.id === e.target.value);
              setFormData({
                ...formData,
                category_id: e.target.value,
                category_name: category?.name || '',
                vehicle_id: '',
                collaborator_id: '',
                collaborator_name: '',
              });
            }}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma categoria</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parent_id ? `　${category.name}` : category.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Forma de pagamento"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione a forma de pagamento</option>
            {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>

          {needsVehicle && (
            <select
              aria-label="Veículo"
              value={formData.vehicle_id}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o veículo (opcional)</option>
              {vehicles.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
            </select>
          )}

          {needsCollaborator && (
            <select
              aria-label="Colaborador / Funcionário"
              value={formData.collaborator_id}
              onChange={(e) => {
                const collaborator = collaborators.find((item) => item.id === e.target.value);
                setFormData({
                  ...formData,
                  collaborator_id: collaborator?.id || '',
                  collaborator_name: collaborator?.name || '',
                });
              }}
              disabled={collaboratorsLoading}
              className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="">{collaboratorsLoading ? 'Carregando colaboradores…' : 'Selecione um colaborador (opcional)'}</option>
              {collaborators.map((collaborator) => (
                <option key={collaborator.id} value={collaborator.id}>{collaborator.name}</option>
              ))}
            </select>
          )}
        </fieldset>

        <div className="p-6 xl:p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-xs uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={operationBlocked}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-colors disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none flex justify-center items-center gap-2"
          >
            {saving ? (
              <i className="bi bi-arrow-repeat animate-spin"></i>
            ) : (
              <i className="bi bi-check-lg"></i>
            )}
            {editingTransaction ? 'Salvar alterações' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
};
