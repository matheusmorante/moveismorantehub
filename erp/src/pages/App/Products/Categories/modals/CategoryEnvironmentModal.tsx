import React from 'react';
import { EnvironmentNode, CategoryNode, ModalType, EditingNode } from '../types/categoryEnvironment.types';
import { SecureDeleteButton } from '../components/SecureDeleteButton';
import AttributeAutocomplete, { type AttributeNode } from '@/components/AttributeAutocomplete';

interface CategoryEnvironmentModalProps {
    readonly showModal: ModalType | null;
    readonly editingNode: EditingNode | null;
    readonly nameInput: string;
    readonly onChangeNameInput: (value: string) => void;
    readonly selectedLinks: string[];
    readonly selectedAttributes?: AttributeNode[];
    readonly setSelectedAttributes?: (attrs: AttributeNode[] | ((prev: AttributeNode[]) => AttributeNode[])) => void;
    readonly isLoadingAttributes?: boolean;
    readonly attributeLoadFailed?: boolean;
    readonly hasAddedRequiredAttributes?: boolean;
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
    selectedAttributes = [],
    setSelectedAttributes,
    isLoadingAttributes = false,
    attributeLoadFailed = false,
    hasAddedRequiredAttributes = false,
    onToggleLink,
    categories,
    environments,
    isSubmitting,
    onClose,
    onSave,
    onDelete
}) => {
    if (!showModal) return null;

    const isEnv = showModal === 'ambiente';
    const title = editingNode
        ? `Editar ${isEnv ? 'Ambiente' : 'Categoria'}`
        : `Novo ${isEnv ? 'Ambiente' : 'Categoria'}`;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm border-0 cursor-default w-full h-full"
                onClick={onClose}
                aria-label="Fechar modal"
            />
            <form
                onSubmit={onSave}
                className="relative bg-white dark:bg-slate-900 w-full max-w-lg max-h-[calc(100dvh-2rem)] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-200"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                    <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-650 transition-colors bg-transparent border-0"
                        aria-label="Fechar"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4 custom-scrollbar">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Nome d{isEnv ? 'o Ambiente' : 'a Categoria'}
                    </label>
                    <input
                        autoFocus
                        required
                        type="text"
                        value={nameInput}
                        onChange={e => onChangeNameInput(e.target.value.toUpperCase())}
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
                        {isEnv ? (
                            categories.map(cat => {
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
                        ) : (
                            environments.map(env => {
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
                            })
                        )}
                    </div>
                </div>

                {!isEnv && setSelectedAttributes && (
                    <div className="flex flex-col gap-2 pt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Atributos Obrigatórios
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Produtos desta categoria deverão preencher estes atributos.
                        </p>
                        {isLoadingAttributes && (
                            <p className="flex items-center gap-2 text-xs text-slate-500" role="status">
                                <i className="bi bi-arrow-repeat animate-spin" /> Carregando atributos obrigatórios...
                            </p>
                        )}
                        {attributeLoadFailed && (
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
                                Não foi possível carregar a configuração atual. Feche o modal e tente novamente.
                            </p>
                        )}
                        <AttributeAutocomplete
                            selectedIds={selectedAttributes.map(a => a.id)}
                            onSelect={(attr) => setSelectedAttributes(prev => [...prev, attr])}
                            disabled={isSubmitting || isLoadingAttributes || attributeLoadFailed}
                        />
                        {selectedAttributes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {selectedAttributes.map(attr => (
                                    <div
                                        key={attr.id}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-500/20 text-xs font-bold"
                                    >
                                        <span>{attr.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedAttributes(prev => prev.filter(a => a.id !== attr.id))}
                                            className="hover:text-blue-900 dark:hover:text-blue-200 transition-colors bg-transparent border-0 flex items-center justify-center rounded-full outline-none"
                                            disabled={isSubmitting}
                                            aria-label={`Remover atributo ${attr.name}`}
                                        >
                                            <i className="bi bi-x-lg text-[10px]" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {hasAddedRequiredAttributes && (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                Novos atributos passarão a ser obrigatórios. Produtos sem valor serão sinalizados para conciliação.
                            </p>
                        )}
                    </div>
                )}
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-white px-6 py-4 dark:bg-slate-900">
                    <div>
                        {editingNode && onDelete && (
                            (() => {
                                if (isEnv) {
                                    const env = environments.find(e => e.id === editingNode.id);
                                    const count = env?.categories?.length || 0;
                                    const isDisabled = count > 0;
                                    const reason = `Não é possível excluir este ambiente porque ele possui ${count} categoria${count > 1 ? 's vinculadas' : ' vinculada'}. Desvincule todas as categorias deste ambiente antes de excluí-lo.`;
                                    return (
                                        <SecureDeleteButton
                                            disabled={isDisabled}
                                            disabledReason={reason}
                                            onDelete={() => {
                                                onClose();
                                                onDelete(editingNode.id, true);
                                            }}
                                            ariaLabel={`Excluir ambiente ${nameInput}`}
                                            title="Excluir ambiente"
                                        />
                                    );
                                } else {
                                    const cat = categories.find(c => c.id === editingNode.id);
                                    const count = cat?.productCount || 0;
                                    const isDisabled = count > 0;
                                    const reason = `Não é possível excluir esta categoria porque ela está sendo utilizada por ${count} produto${count > 1 ? 's' : ''}. Remova ou altere a categoria desses produtos antes de excluí-la.`;
                                    return (
                                        <SecureDeleteButton
                                            disabled={isDisabled}
                                            disabledReason={reason}
                                            onDelete={() => {
                                                onClose();
                                                onDelete(editingNode.id, false);
                                            }}
                                            ariaLabel={`Excluir categoria ${nameInput}`}
                                            title="Excluir categoria"
                                        />
                                    );
                                }
                            })()
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting || isLoadingAttributes || attributeLoadFailed}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all disabled:opacity-60"
                        >
                            {isSubmitting && (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                            <span>{isSubmitting ? 'Salvando...' : 'Salvar'}</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
