import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { default as VariationType, CharacteristicGroup } from '../../types/variation.type';
import { normalizeSearchTerm } from '../../utils/textUtils';
import { getVariationErrorMessage, saveCharacteristicOptions } from '../../utils/variationService';
import {
  CHARACTERISTIC_GROUPS_QUERY_KEY,
  deleteCharacteristicGroup,
  fetchCharacteristicGroups,
} from '../../utils/characteristicGroupService';
import { AttributeCard } from './components/AttributeCard';
import { useVariations } from './hooks/useVariations';
import { VariationFormModal } from './modals/VariationFormModal';
import { CharacteristicGroupFormPanel } from './modals/CharacteristicGroupFormPanel';
import { CharacteristicOptionsModal } from './modals/CharacteristicOptionsModal';
import { getCharacteristicSubtitle } from './domain/characteristicFormRules';

type EditorState =
  | { type: 'group'; groupId?: string }
  | {
      type: 'characteristic';
      characteristic?: VariationType | null;
      defaultGroupId?: string;
      returnToGroupId?: string;
      backgroundGroupId?: string;
    };

interface VariationsProps {
  readonly focusAttributeName?: string;
  readonly autoOpenAttributeName?: string;
  readonly onClose?: () => void;
}

const Variations = ({ focusAttributeName, autoOpenAttributeName, onClose }: VariationsProps) => {
  const { variations, loading: attributesLoading, error: attributesError, refresh, handleDelete } = useVariations();
  const {
    data: groupData,
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: CHARACTERISTIC_GROUPS_QUERY_KEY,
    queryFn: fetchCharacteristicGroups,
    staleTime: 60_000,
  });
  const groups = groupData?.groups ?? [];
  const [searchTerm, setSearchTerm] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [optionsEditor, setOptionsEditor] = useState<VariationType | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const initialFocusHandled = useRef(false);

  const search = normalizeSearchTerm(searchTerm);
  const visibleGroups = useMemo(() => groups
    .map((group) => {
      const groupCharacteristics = variations
        .filter((item) => item.groupId === group.id)
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }));
      const groupMatches = !search || normalizeSearchTerm(group.name).includes(search) || normalizeSearchTerm(group.description ?? '').includes(search);
      const matchingCharacteristics = groupMatches || !search
        ? groupCharacteristics
        : groupCharacteristics.filter((item) => {
            return normalizeSearchTerm(`${item.name} ${getCharacteristicSubtitle(item)}`).includes(search);
          });
      return {
        group,
        allCharacteristics: groupCharacteristics,
        characteristics: matchingCharacteristics,
        matches: groupMatches || matchingCharacteristics.length > 0,
        expanded: Boolean(search) || expandedGroups.has(group.id),
      };
    })
    .filter((item) => item.matches)
    .sort((left, right) => left.group.name.localeCompare(right.group.name, 'pt-BR', { sensitivity: 'base' })),
  [expandedGroups, groups, search, variations]);

  const startGroupEditor = (group?: CharacteristicGroup | null) => {
    setNewMenuOpen(false);
    setOpenActionsFor(null);
    setEditor({ type: 'group', groupId: group?.id });
  };

  const startCharacteristicEditor = (
    characteristic?: VariationType | null,
    defaultGroupId?: string,
    returnToGroupId?: string
  ) => {
    setNewMenuOpen(false);
    setOpenActionsFor(null);
    setEditor({ type: 'characteristic', characteristic, defaultGroupId, returnToGroupId });
  };

  const closeCharacteristicEditor = (returnToGroupId?: string) => {
    setEditor(returnToGroupId ? { type: 'group', groupId: returnToGroupId } : null);
  };

  const handleDeleteGroup = async (group: CharacteristicGroup) => {
    if (!window.confirm(`Excluir o grupo "${group.name}"?`)) return;
    try {
      await deleteCharacteristicGroup(group.id);
      await refetchGroups();
      toast.success('Grupo excluído.');
    } catch (error: unknown) {
      toast.error(getVariationErrorMessage(error, 'Não foi possível excluir o grupo.'));
    }
  };

  const retry = () => {
    void refresh();
    void refetchGroups();
  };

  useEffect(() => {
    if (initialFocusHandled.current || attributesLoading || groupsLoading) return;
    if (!focusAttributeName && !autoOpenAttributeName) return;
    initialFocusHandled.current = true;

    const normalizedFocusName = normalizeSearchTerm(focusAttributeName || autoOpenAttributeName || '');
    const normalizedEditorName = normalizeSearchTerm(autoOpenAttributeName || '');
    const focusedCharacteristic = variations.find(
      (item) => normalizeSearchTerm(item.name) === normalizedFocusName
    );
    const characteristicToEdit = variations.find(
      (item) => normalizeSearchTerm(item.name) === normalizedEditorName
    );
    const groupId = focusedCharacteristic?.groupId ?? characteristicToEdit?.groupId;
    const groupExists = groups.some((group) => group.id === groupId);

    setSearchTerm(focusAttributeName || autoOpenAttributeName || '');
    if (groupExists && groupId) {
      setExpandedGroups((current) => new Set(current).add(groupId));
    }

    if (characteristicToEdit) {
      const returnToGroupId = groupExists ? groupId : undefined;
      setEditor({
        type: 'characteristic',
        characteristic: characteristicToEdit,
        defaultGroupId: returnToGroupId,
        returnToGroupId,
        backgroundGroupId: returnToGroupId,
      });
    }
  }, [attributesLoading, autoOpenAttributeName, focusAttributeName, groups, groupsLoading, variations]);

  const groupPanelOpen = editor?.type === 'group' ||
    (editor?.type === 'characteristic' && Boolean(editor.backgroundGroupId));
  const groupPanelId = editor?.type === 'group' ? editor.groupId :
    editor?.type === 'characteristic' ? editor.backgroundGroupId : undefined;
  const groupPanel = groups.find((group) => group.id === groupPanelId) ?? null;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
      <header className="z-20 shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <i className="bi bi-sliders2 text-lg text-blue-700 dark:text-blue-300" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Características</h1>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-72" aria-label="Pesquisar grupos e características">
              <i className="bi bi-search absolute left-0 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar grupos e características"
                className="w-full bg-transparent border-0 border-b border-slate-300 py-2 pl-5 pr-1 text-sm outline-none focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:text-slate-100"
              />
            </label>
            {onClose && <button type="button" onClick={onClose} aria-label="Fechar gerenciamento de características" className="px-2 py-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><i className="bi bi-x-lg" aria-hidden="true" /></button>}
            <div className="relative shrink-0">
              <button type="button" onClick={() => setNewMenuOpen((open) => !open)} aria-expanded={newMenuOpen} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800">
                Novo <i className="bi bi-chevron-down text-[10px]" aria-hidden="true" />
              </button>
              {newMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-48 bg-white py-1 shadow-xl dark:bg-slate-900">
                  <button type="button" onClick={() => startCharacteristicEditor()} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Característica</button>
                  <button type="button" onClick={() => startGroupEditor()} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Grupo</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            {attributesLoading || groupsLoading ? (
              <div className="py-12 text-center text-sm text-slate-500"><i className="bi bi-arrow-clockwise mr-2 animate-spin" aria-hidden="true" />Carregando grupos e características…</div>
            ) : attributesError || groupsError ? (
              <div role="alert" className="py-10 text-center text-sm text-red-700 dark:text-red-300">
                <p>Não foi possível carregar grupos e características.</p>
                <button type="button" onClick={retry} className="mt-3 text-sm font-semibold underline">Tentar novamente</button>
              </div>
            ) : groups.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">Nenhum grupo cadastrado. Use <strong>Novo</strong> para criar um grupo.</div>
            ) : visibleGroups.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">Nenhum grupo ou característica encontrado.</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {visibleGroups.map(({ group, allCharacteristics, characteristics, expanded }) => {
                  return (
                    <section key={group.id} aria-labelledby={`characteristic-group-${group.id}`}>
                      <div className="flex min-h-12 items-center gap-3 py-2">
                        <button
                          type="button"
                          onClick={() => setExpandedGroups((current) => {
                            const next = new Set(current);
                            if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
                            return next;
                          })}
                          aria-expanded={expanded}
                          aria-controls={`characteristics-in-group-${group.id}`}
                          aria-label={`${expanded ? 'Recolher' : 'Expandir'} grupo ${group.name}`}
                          className="shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <i className={`bi ${expanded ? 'bi-chevron-down' : 'bi-chevron-right'} text-xs text-slate-400`} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startGroupEditor(group)}
                          className="min-w-0 truncate text-left text-sm font-semibold text-slate-900 hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-300"
                        >
                          <span id={`characteristic-group-${group.id}`} className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{group.name}</span>
                        </button>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="shrink-0 text-xs text-slate-500">{allCharacteristics.length} {allCharacteristics.length === 1 ? 'característica' : 'características'}</span>
                        </div>
                        <div className="relative shrink-0">
                          <button type="button" onClick={() => setOpenActionsFor((current) => current === group.id ? null : group.id)} aria-expanded={openActionsFor === group.id} aria-label={`Abrir ações do grupo ${group.name}`} className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"><i className="bi bi-three-dots-vertical" aria-hidden="true" /></button>
                          {openActionsFor === group.id && (
                            <div className="absolute right-0 top-full z-30 w-52 bg-white py-1 shadow-xl dark:bg-slate-900">
                              <button type="button" onClick={() => startGroupEditor(group)} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Editar grupo</button>
                              <button type="button" onClick={() => startCharacteristicEditor(null, group.id, group.id)} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Adicionar característica</button>
                              <button type="button" onClick={() => { setOpenActionsFor(null); void handleDeleteGroup(group); }} disabled={group.isDefault || allCharacteristics.length > 0} title={group.isDefault ? 'Grupo usado por cadastros legados.' : allCharacteristics.length ? 'Mova ou exclua as características vinculadas antes.' : 'Excluir grupo'} className="w-full px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/30">Excluir grupo</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {expanded && (
                        <div id={`characteristics-in-group-${group.id}`} className="mb-3 ml-4 border-l border-slate-200 pl-4 dark:border-slate-800">
                          {characteristics.length === 0 ? (
                            <p className="py-3 text-xs text-slate-400">Este grupo ainda não tem características.</p>
                          ) : characteristics.map((attribute) => (
                            <AttributeCard
                              key={attribute.id}
                              attribute={attribute}
                              onEdit={(item) => startCharacteristicEditor(item, undefined, group.id)}
                              onManageOptions={(item) => setOptionsEditor(item)}
                              onDelete={(item) => { if (item.id) void handleDelete(item.id); }}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {groupPanelOpen && (
          <CharacteristicGroupFormPanel
            key={`group-${groupPanelId ?? 'new'}`}
            group={groupPanel}
            characteristics={variations}
            groups={groups}
            onClose={() => setEditor(null)}
            onSaved={async (groupId) => {
              await refetchGroups();
              await refresh();
              setExpandedGroups((current) => new Set(current).add(groupId));
              setEditor({ type: 'group', groupId });
            }}
            onAddCharacteristic={(groupId) => startCharacteristicEditor(null, groupId, groupId)}
            onEditCharacteristic={(characteristic) => startCharacteristicEditor(characteristic, undefined, editor.groupId)}
            onDeleted={async () => {
              await refetchGroups();
              setEditor(null);
            }}
          />
        )}
        {editor?.type === 'characteristic' && (
          <VariationFormModal
            key={`characteristic-${editor.characteristic?.id ?? 'new'}`}
            onClose={() => closeCharacteristicEditor(editor.returnToGroupId)}
            onSuccess={async (savedId, values, wasNew) => {
              await refresh();
              if (wasNew) {
                setEditor((current) => current?.type === 'characteristic' ? {
                  ...current,
                  characteristic: {
                    id: savedId,
                    name: values.name,
                    groupId: values.groupId,
                    dataType: values.dataType,
                    unit: values.unit,
                    decimalPlaces: values.dataType === 'decimal' ? values.decimalPlaces : undefined,
                    configuration: values.configuration,
                    active: values.active,
                    options: values.options,
                    isCustom: true,
                    dependency: null,
                  },
                } : current);
                return;
              }
              if (editor.returnToGroupId) {
                setExpandedGroups((current) => new Set(current).add(editor.returnToGroupId!));
                setEditor({ type: 'group', groupId: editor.returnToGroupId });
              } else setEditor(null);
            }}
            variation={editor.characteristic}
            allVariations={variations}
            groups={groups}
            defaultGroupId={editor.defaultGroupId}
          />
        )}
      </div>
      {optionsEditor && (
        <CharacteristicOptionsModal
          characteristicName={optionsEditor.name}
          options={optionsEditor.options}
          onClose={() => setOptionsEditor(null)}
          onSave={async (options) => {
            if (!optionsEditor.id) throw new Error('Não foi possível identificar a característica.');
            await saveCharacteristicOptions(optionsEditor.id, options);
            await refresh();
          }}
        />
      )}
    </div>
  );
};

export default Variations;
