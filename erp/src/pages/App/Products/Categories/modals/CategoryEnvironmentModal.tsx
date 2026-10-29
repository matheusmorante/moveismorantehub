import { ZodForm } from '@/components/forms/ZodForm';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { catalogNameFormSchema } from '../../../../../../../shared-utils/catalogFormSchemas';
import React from 'react';
import {
  EnvironmentNode,
  CategoryNode,
  ModalType,
  EditingNode,
} from '../types/categoryEnvironment.types';
import { SecureDeleteButton } from '../components/SecureDeleteButton';
import type { CharacteristicCategoryApplication } from '@/pages/utils/categoryService';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';

interface CategoryEnvironmentModalProps {
  readonly showModal: ModalType | null;
  readonly editingNode: EditingNode | null;
  readonly nameInput: string;
  readonly onChangeNameInput: (value: string) => void;
  readonly selectedLinks: string[];
  readonly isLoadingAttributes?: boolean;
  readonly attributeLoadFailed?: boolean;
  readonly selectedCharacteristicApplications?: CharacteristicCategoryApplication[];
  readonly setSelectedCharacteristicApplications?: React.Dispatch<
    React.SetStateAction<CharacteristicCategoryApplication[]>
  >;
  readonly isLoadingCharacteristicApplications?: boolean;
  readonly characteristicApplicationsLoadFailed?: boolean;
  readonly onToggleLink: (id: string) => void;
  readonly categories: CategoryNode[];
  readonly environments: EnvironmentNode[];
  readonly isSubmitting: boolean;
  readonly onClose: () => void;
  readonly onSave: (e: React.FormEvent) => void;
  readonly onDelete?: (id: string, isEnv: boolean) => void;
}

export const CategoryEnvironmentModal: React.FC<CategoryEnvironmentModalProps> = ({
  showModal,
  editingNode,
  nameInput,
  onChangeNameInput,
  selectedLinks,
  isLoadingAttributes = false,
  attributeLoadFailed = false,
  selectedCharacteristicApplications = [],
  setSelectedCharacteristicApplications,
  isLoadingCharacteristicApplications = false,
  characteristicApplicationsLoadFailed = false,
  onToggleLink,
  categories,
  environments,
  isSubmitting,
  onClose,
  onSave,
  onDelete,
}) => {
  useBodyScrollLock(Boolean(showModal));

  const [characteristicSearchTerm, setCharacteristicSearchTerm] = React.useState('');
  React.useEffect(() => {
    setCharacteristicSearchTerm('');
  }, [showModal, editingNode?.id]);
  if (!showModal) return null;

  const isEnv = showModal === 'ambiente';
  const title = editingNode
    ? `Editar ${isEnv ? 'Ambiente' : 'Categoria'}`
    : `Novo ${isEnv ? 'Ambiente' : 'Categoria'}`;
  const normalizedCharacteristicSearch = characteristicSearchTerm
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
  const visibleCharacteristicApplications = selectedCharacteristicApplications.filter((item) => {
    if (!normalizedCharacteristicSearch) return true;
    const normalizedName = item.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    return normalizedName.includes(normalizedCharacteristicSearch);
  });

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-900/60 p-0 backdrop-blur-sm lg:p-4">
      <button
        type="button"
        className="absolute inset-0 z-0 border-0 cursor-default"
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <ZodForm schema={catalogNameFormSchema} values={{ name: nameInput }}
        onSubmit={onSave}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-environment-modal-title"
        className="relative z-10 min-h-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden border border-slate-100 bg-white text-slate-800 shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col animate-in zoom-in-95 duration-200 lg:h-auto lg:max-h-[calc(100dvh-2rem)] lg:max-w-3xl lg:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
          <h3 id="category-environment-modal-title" className="text-base font-bold text-slate-850 dark:text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 transition-colors bg-transparent border-0"
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg text-lg" />
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 custom-scrollbar sm:px-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Nome d{isEnv ? 'o Ambiente' : 'a Categoria'}
            </label>
            <input
              autoFocus
              required
              type="text"
              value={nameInput}
              onChange={(e) => onChangeNameInput(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500"
              placeholder={`Ex: ${isEnv ? 'COZINHA' : 'SOFÁ'}`}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {isEnv ? 'Vincular Categorias' : 'Vincular a Ambientes'}
            </label>
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 max-h-48 overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar">
              {isEnv
                ? categories.map((cat) => {
                    const isChecked = selectedLinks.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2.5 p-1 rounded hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleLink(cat.id)}
                          className="h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                          {cat.name}
                        </span>
                      </label>
                    );
                  })
                : environments.map((env) => {
                    const isChecked = selectedLinks.includes(env.id);
                    return (
                      <label
                        key={env.id}
                        className="flex items-center gap-2.5 p-1 rounded hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleLink(env.id)}
                          className="h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                          {env.name}
                        </span>
                      </label>
                    );
                  })}
            </div>
          </div>

          {!isEnv && setSelectedCharacteristicApplications && (
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Aplicação das características
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Defina quais características se aplicam a esta categoria. As características sem configuração começam como opcionais.
              </p>
              {isLoadingCharacteristicApplications && (
                <p className="flex items-center gap-2 text-xs text-slate-500" role="status">
                  <i className="bi bi-arrow-repeat animate-spin" /> Carregando aplicações...
                </p>
              )}
              {characteristicApplicationsLoadFailed && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
                  Não foi possível carregar as aplicações atuais. Feche o formulário e tente novamente.
                </p>
              )}
              {!isLoadingCharacteristicApplications && !characteristicApplicationsLoadFailed && (
                <>
                  <input
                    type="search"
                    value={characteristicSearchTerm}
                    onChange={(event) => setCharacteristicSearchTerm(event.target.value)}
                    placeholder="Pesquisar característica..."
                    aria-label="Pesquisar características para esta categoria"
                    disabled={isSubmitting}
                    className="w-full bg-transparent border-0 border-b border-slate-300 px-1 py-2 text-xs outline-none focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:text-slate-100"
                  />
                  {selectedCharacteristicApplications.length === 0 ? (
                    <p className="py-2 text-xs text-slate-500">Nenhuma característica ativa cadastrada.</p>
                  ) : (
                    <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto overscroll-contain border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                      {visibleCharacteristicApplications.length === 0 ? (
                        <p className="py-3 text-xs text-slate-500">Nenhuma característica encontrada.</p>
                      ) : visibleCharacteristicApplications.map((item) => (
                        <label key={item.attributeId} className="flex items-center justify-between gap-3 py-2">
                          <span className="min-w-0 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                            {item.name}
                          </span>
                          <select
                            value={item.application}
                            onChange={(event) => setSelectedCharacteristicApplications((previous) =>
                              previous.map((application) => application.attributeId === item.attributeId
                                ? { ...application, application: event.target.value as typeof item.application }
                                : application)
                            )}
                            disabled={isSubmitting}
                            aria-label={`Aplicação de ${item.name} nesta categoria`}
                            className="w-36 shrink-0 bg-transparent border-0 border-b border-slate-300 px-1 py-1.5 text-xs outline-none focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:text-slate-100"
                          >
                            <option value="unavailable">N/A</option>
                            <option value="optional">Opcional</option>
                            <option
                              value="required"
                              disabled={isCatalogNeverRequiredCharacteristicName(item.name)}
                            >
                              Obrigatório
                            </option>
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4">
          {isLoadingAttributes && (
            <p role="status" className="text-xs text-slate-500">Carregando configurações atuais da categoria…</p>
          )}
          {attributeLoadFailed && (
            <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
              Não foi possível carregar as configurações atuais da categoria. Feche o modal e tente novamente.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              {editingNode && isEnv && onDelete && (() => {
                const env = environments.find((item) => item.id === editingNode.id);
                const count = env?.categories?.length || 0;
                const reason = `Não é possível excluir este ambiente porque ele possui ${count} categoria${count > 1 ? 's vinculadas' : ' vinculada'}. Desvincule todas as categorias deste ambiente antes de excluí-lo.`;
                return (
                  <SecureDeleteButton
                    disabled={count > 0}
                    disabledReason={reason}
                    onDelete={() => {
                      onClose();
                      onDelete(editingNode.id, true);
                    }}
                    ariaLabel={`Excluir ambiente ${nameInput}`}
                    title="Excluir ambiente"
                  />
                );
              })()}
            </div>
            <div className="ml-auto flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingAttributes || attributeLoadFailed || isLoadingCharacteristicApplications || characteristicApplicationsLoadFailed}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all disabled:opacity-60"
            >
              {isSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </div>
      </div>
      </ZodForm>
    </div>
  );
};
