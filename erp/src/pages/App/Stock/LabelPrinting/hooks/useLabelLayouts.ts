import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelLayoutDefaultFormSchema, labelLayoutDuplicateFormSchema, labelLayoutCopyFormSchema, labelLayoutDeleteFormSchema, labelLayoutPreferenceFormSchema, LabelLayoutUnconfirmedError } from '../../../../../../../shared-utils/labelLayoutFormSchemas';
import { findIdenticalGridModel, saveGridModelWithFallback } from '../services/labelGridModelPersistence';
import { getSettings, saveSettings, subscribeToSettings } from '../../../../utils/settingsService';
import {
  deleteRemoteLabelLayout,
  fetchRemoteLabelLayouts,
} from '../services/labelLayoutService';
import {
  applyPresetToConfig,
  createInitialLabelConfig,
  mapModelToLabelConfig,
} from '../services/labelModelMapper';
import {
  getCustomLabelLayouts,
  getHiddenDefaultLayoutIds,
  getLastSelectedRectModelId,
  getLastSelectedRoundModelId,
  saveCustomLabelLayouts,
  saveHiddenDefaultLayoutIds,
  saveLastSelectedRectModelId,
  saveLastSelectedRoundModelId,
} from '../services/labelStorageService';
import { subscribeToPriceLabelTemplateUpdates } from '../services/priceLabelTemplateSync';
import type { GridModel } from '../types/LabelGridModelTypes';
import {
  DEFAULT_LAYOUT_MODELS,
  type LabelConfig,
  type LabelPreset,
  type LabelType,
} from '../utils/LabelConstants';
import type { CategoryType } from './useLabelCategory';

interface UseLabelLayoutsProps {
  selectedCategory: CategoryType | null;
  catFromUrl?: CategoryType | null;
  isProductContext?: boolean;
}

export const useLabelLayouts = ({
  selectedCategory,
  catFromUrl,
  isProductContext = false,
}: UseLabelLayoutsProps) => {
  const [currentModel, setCurrentModel] = useState<GridModel | null>(null);
  const [editingGridModel, setEditingGridModel] = useState<GridModel | null>(null);
  const [customLayouts, setCustomLayouts] = useState<GridModel[]>(() => getCustomLabelLayouts() ?? []);
  const [savedArtConfigs, setSavedArtConfigs] = useState<
    Record<string, NonNullable<LabelConfig['artConfig']>>
  >({});
  const [hiddenDefaultIds, setHiddenDefaultIds] = useState<string[]>(getHiddenDefaultLayoutIds);
  const [artVersion, setArtVersion] = useState(0);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  const [lastSelectedRoundModelId, setLastSelectedRoundModelId] = useState<string>(
    getLastSelectedRoundModelId
  );
  const [lastSelectedRectModelId, setLastSelectedRectModelId] = useState<string>(
    getLastSelectedRectModelId
  );

  const [defaultLayoutIds, setDefaultLayoutIds] = useState<Record<string, string>>(
    getSettings().defaultLabelLayoutIds || {}
  );
  const defaultIdsRef = useRef(defaultLayoutIds);
  defaultIdsRef.current = defaultLayoutIds;

  useEffect(() => {
    const unsubscribe = subscribeToSettings((settings) => {
      if (settings.defaultLabelLayoutIds) {
        defaultIdsRef.current = settings.defaultLabelLayoutIds;
        setDefaultLayoutIds(settings.defaultLabelLayoutIds);
      }
    });
    return unsubscribe;
  }, []);

  const [config, setConfig] = useState<LabelConfig>(() =>
    createInitialLabelConfig(isProductContext)
  );
  const duplicateForm = useZodForm(labelLayoutDuplicateFormSchema, { model: { ...DEFAULT_LAYOUT_MODELS[0] } });
  const copyForm = useZodForm(labelLayoutCopyFormSchema, { model: { ...DEFAULT_LAYOUT_MODELS[0] }, category: 'logos' });
  const deleteForm = useZodForm(labelLayoutDeleteFormSchema, { id: '' });
  const { enqueueAndRun: persistPreferences } = useZodForm(labelLayoutPreferenceFormSchema, { roundId: lastSelectedRoundModelId, rectId: lastSelectedRectModelId });
  const [layoutPreferenceError, setLayoutPreferenceError] = useState('');
  const [layoutsLoading, setLayoutsLoading] = useState(true), [layoutsQueryError, setLayoutsQueryError] = useState('');
  const [layoutsBusy, setLayoutsBusy] = useState(false), [layoutsError, setLayoutsError] = useState(''), [layoutsBlocked, setLayoutsBlocked] = useState(false);
  const mutationLock = useRef(false), replayBlocked = useRef(false), mounted = useRef(false), mutationRevision = useRef(0);
  const layoutsRef = useRef(customLayouts), hiddenIdsRef = useRef(hiddenDefaultIds);
  layoutsRef.current = customLayouts; hiddenIdsRef.current = hiddenDefaultIds;
  const categoryOwner = useRef({ category: selectedCategory, revision: 0 });
  if (categoryOwner.current.category !== selectedCategory) categoryOwner.current = { category: selectedCategory, revision: categoryOwner.current.revision + 1 };
  useEffect(() => { const revision = mutationRevision; mounted.current = true; return () => { mounted.current = false; revision.current++; }; }, []);
  useEffect(() => { if (!replayBlocked.current) setLayoutsError(''); }, [selectedCategory]);
  const configRef = useRef(config);
  const defaultForm = useZodForm(labelLayoutDefaultFormSchema, { modelId: '', category: 'identificacao', type: 'rect' });
  configRef.current = config;

  const prevCategoryRef = useRef<CategoryType | null>(null);
  const prevTypeRef = useRef<LabelType>(config.type || 'rect');

  // Subscrição de atualizações de template de etiquetas de preço
  useEffect(
    () =>
      subscribeToPriceLabelTemplateUpdates(({ layoutId, artConfig }) => {
        setSavedArtConfigs((prev) => ({
          ...prev,
          [layoutId]: artConfig,
          preco_2x5_restored: artConfig,
        }));
        setConfig((prev) => ({ ...prev, artConfig }));
        setArtVersion((prev) => prev + 1);
      }),
    []
  );

  // Sincroniza layouts customizados com o serviço remoto e o cache local.
  useEffect(() => {
    let active = true; const revision = mutationRevision.current;
    const fetchCustomLayouts = async () => {
      try {
        const { data, error } = await fetchRemoteLabelLayouts();
        if (!active || revision !== mutationRevision.current) return;
        const saved = getCustomLabelLayouts() ?? layoutsRef.current;
        const layouts = data && !error
          ? [...data, ...saved.filter((model) => model.id.startsWith('custom_') && !data.some((remote) => remote.id === model.id))]
          : saved;
        layoutsRef.current = layouts; setCustomLayouts(layouts);
        if (error) setLayoutsQueryError('Não foi possível consultar os modelos na nuvem. A lista local foi preservada; recarregue para tentar novamente.');
        if (data && !error) saveCustomLabelLayouts(layouts);
      } catch {
        if (active && revision === mutationRevision.current) {
          const saved = getCustomLabelLayouts() ?? layoutsRef.current; layoutsRef.current = saved; setCustomLayouts(saved);
          setLayoutsQueryError('Não foi possível consultar os modelos na nuvem. A lista local foi preservada; recarregue para tentar novamente.');
        }
      } finally { if (active) setLayoutsLoading(false); }
    };
    void fetchCustomLayouts();
    return () => { active = false; };
  }, []);

  // Sincroniza artConfig salvo com o config atual
  useEffect(() => {
    const artConfig = savedArtConfigs[config.layoutId || ''];
    if (artConfig && config.artConfig !== artConfig) {
      setConfig((prev) => ({ ...prev, artConfig }));
    }
  }, [config.layoutId, config.artConfig, savedArtConfigs]);

  const selectLayout = useCallback(
    (model: GridModel) => {
      setCurrentModel(model);
      if (model.type === 'round') {
        setLastSelectedRoundModelId(model.id);
      } else {
        setLastSelectedRectModelId(model.id);
      }

      setConfig((prefConfig) => mapModelToLabelConfig(model, prefConfig, savedArtConfigs));
    },
    [savedArtConfigs]
  );

  const applyPresetWithConfig = useCallback((preset: LabelPreset, baseConfig: LabelConfig) => {
    setConfig(applyPresetToConfig(preset, baseConfig));
  }, []);

  const layoutModels = useMemo(() => {
    const defaults = DEFAULT_LAYOUT_MODELS.filter((m) => {
      const sameCategory = m.category === selectedCategory;
      const sameType = m.type === config.type;
      return sameCategory && sameType && !hiddenDefaultIds.includes(m.id);
    });

    const customs = customLayouts.filter((m) => {
      const sameCategory = m.category === selectedCategory;
      const sameType = m.type === config.type;
      return sameCategory && sameType;
    });

    const finalMap = new Map<string, GridModel>();
    defaults.forEach((def) => {
      finalMap.set(def.id, def);
    });

    customs.forEach((c) => {
      if (c.baseModelId) {
        finalMap.set(c.baseModelId, c);
      } else {
        finalMap.set(c.id, c);
      }
    });

    return Array.from(finalMap.values());
  }, [selectedCategory, config.type, hiddenDefaultIds, customLayouts]);

  // Troca de modelo inicial ou ao trocar categoria/tipo
  useEffect(() => {
    const cat = selectedCategory || catFromUrl;
    if (!cat || layoutModels.length === 0) return;

    const currentConfig = configRef.current;
    const type = currentConfig.type || 'rect';
    const categoryChanged = prevCategoryRef.current !== cat;
    const typeChanged = prevTypeRef.current !== type;

    prevCategoryRef.current = cat;
    prevTypeRef.current = type;

    // Se categoria ou tipo mudou, ou se não há modelo ativo compatível
    const isCurrentModelValid = layoutModels.some((m) => m.id === currentConfig.layoutId);

    if (categoryChanged || typeChanged || !isCurrentModelValid) {
      let targetModel: GridModel | undefined;

      if (cat === 'precos') {
        const defaultId = defaultLayoutIds['precos_rect'] || defaultLayoutIds['precos'];
        const targetId = defaultId || 'preco_2x5_restored';
        targetModel = layoutModels.find((m) => m.id === targetId);
      } else if (cat === 'identificacao') {
        const defaultId =
          defaultLayoutIds['identificacao_rect'] || defaultLayoutIds['identificacao'];
        targetModel =
          (defaultId ? layoutModels.find((m) => m.id === defaultId) : undefined) ||
          layoutModels.find((m) => m.id === 'ident_2x5' || m.baseModelId === 'ident_2x5');
      } else {
        const defaultKey = `${cat}_${type}`;
        const savedId = defaultLayoutIds[defaultKey] || defaultLayoutIds[cat];
        if (savedId) {
          targetModel = layoutModels.find((m) => m.id === savedId);
        }
      }

      if (!targetModel) {
        targetModel = layoutModels[0];
      }

      if (
        targetModel &&
        (currentConfig.layoutId !== targetModel.id ||
          currentConfig.category !== cat ||
          currentConfig.type !== type)
      ) {
        selectLayout(targetModel);
      }
    }
  }, [catFromUrl, selectedCategory, config.type, defaultLayoutIds, layoutModels, selectLayout]);

  const report = (message: string) => { if (mounted.current) { setLayoutsError(message); toast.error(message); } };
  const invalid = (current: () => boolean, errors: Parameters<typeof flattenFormErrors>[0]) => { if (current()) report(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do modelo.'); };
  const runMutation = async (task: (current: () => boolean) => Promise<boolean | false>, stillCurrent: () => boolean = () => true): Promise<boolean> => {
    if (!mounted.current || mutationLock.current || replayBlocked.current) return false;
    mutationLock.current = true; setLayoutsBusy(true); setLayoutsError('');
    const revision = categoryOwner.current.revision;
    const current = () => mounted.current && revision === categoryOwner.current.revision && stillCurrent();
    try { return await task(current) === true && current(); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível alterar o modelo. Confira os dados e as permissões.';
      if ((cause as { uncertain?: boolean; requiresRefresh?: boolean })?.uncertain || (cause as { requiresRefresh?: boolean })?.requiresRefresh) {
        replayBlocked.current = true;
        if (mounted.current) { setLayoutsBlocked(true); setLayoutsError(message); }
        if (current()) toast.error(message);
      } else if (current()) report(message);
      return false;
    } finally { mutationLock.current = false; if (mounted.current) setLayoutsBusy(false); }
  };
  const createCopy = async (model: GridModel, category: CategoryType | undefined, name: string, current: () => boolean) => {
    if (!current()) return false;
    const result = await saveGridModelWithFallback({ newModel: { ...model, id: '', baseModelId: undefined, name, category },
      editingGridModel: null, customLayouts: layoutsRef.current, isCurrent: current, getCurrentLayouts: () => layoutsRef.current });
    if (!current()) return false;
    mutationRevision.current++;
    const updated = [...layoutsRef.current.filter((entry) => entry.id !== result.finalModel.id), result.finalModel];
    layoutsRef.current = updated; setCustomLayouts(updated);
    saveCustomLabelLayouts(updated);
    toast.success(result.savedToDb ? 'Cópia salva no banco.' : 'Cópia salva neste computador.');
    return true;
  };
  const handleDuplicateLayout = (model: GridModel): Promise<boolean> => runMutation((current) => duplicateForm.validateAndRun({ model: { ...model } },
    async (values) => createCopy(values.model, values.model.category, `${values.model.name} (Cópia)`, current), (errors) => invalid(current, errors)));

  // The editor owns the RHF form and passes its parsed, frozen snapshot here.
  const handleSaveGridModel = (newModel: GridModel, stillCurrent?: () => boolean): Promise<boolean> => runMutation(async (current) => {
    if (!current()) return false;
    const editing = editingGridModel;
    if (editing?.category && selectedCategory && editing.category !== selectedCategory) throw new Error('O modelo pertence a outra categoria. Feche o editor e selecione o modelo novamente.');
    const system = editing && DEFAULT_LAYOUT_MODELS.some((model) => model.id === editing.id);
    const targetId = system ? layoutsRef.current.find((model) => model.baseModelId === editing.id)?.id ?? null : editing?.id ?? null;
    const identical = findIdenticalGridModel(layoutsRef.current, newModel, targetId, editing?.id);
    if (identical) throw new Error(`Este modelo já existe como "${identical.name}". Selecione-o ou altere o design.`);
    const result = await saveGridModelWithFallback({ newModel, editingGridModel: editing, customLayouts: layoutsRef.current,
      selectedCategory, isCurrent: current, getCurrentLayouts: () => layoutsRef.current });
    if (!current()) return false;
    mutationRevision.current++;
    const baseId = result.finalModel.baseModelId;
    const updated = [...layoutsRef.current.filter((model) => model.id !== result.finalModel.id && !(baseId && model.baseModelId === baseId)), result.finalModel];
    layoutsRef.current = updated; setCustomLayouts(updated); saveCustomLabelLayouts(updated);
    if (editing?.id === configRef.current.layoutId || configRef.current.layoutId === result.finalModel.id) selectLayout(result.finalModel);
    toast.success(result.savedToDb ? 'Modelo salvo no banco.' : 'Modelo salvo neste computador.');
    return true;
  }, stillCurrent);

  const toggleDefaultLayout = (modelId: string, category: string): Promise<boolean> => runMutation((current) => {
    const model = [...DEFAULT_LAYOUT_MODELS, ...layoutsRef.current].find((entry) => entry.id === modelId.trim());
    if (!model) throw new Error('O modelo não está mais disponível. Recarregue a lista.');
    return defaultForm.validateAndRun({ modelId, category, type: model.type || 'rect' }, async (values) => {
      if (!current()) return false;
      if (model.category !== values.category) throw new Error('O modelo não pertence à categoria selecionada.');
      const newDefaults = { ...defaultIdsRef.current, [`${values.category}_${values.type}`]: values.modelId };
      const result = await saveSettings({ ...getSettings(), defaultLabelLayoutIds: newDefaults }, { confirm: true, isCurrent: current });
      if (!result?.confirmed || !current()) throw Object.assign(new Error('O padrão foi confirmado em outro contexto. Recarregue antes de alterar os modelos.'), { requiresRefresh: true });
      defaultIdsRef.current = newDefaults;
      setDefaultLayoutIds(newDefaults);
      if (!result.cached) report('O padrão foi salvo na nuvem; o cache local não pôde ser atualizado.');
      toast.info('Modelo padrão salvo na nuvem.'); return true;
    }, (errors) => invalid(current, errors));
  });

  const handleDeleteLayout = (modelId: string, stillCurrent?: () => boolean): Promise<boolean> => runMutation((current) => deleteForm.validateAndRun({ id: modelId }, async ({ id }) => {
    if (!current()) return false;
    const system = DEFAULT_LAYOUT_MODELS.some((model) => model.id === id);
    if (!system && !layoutsRef.current.some((model) => model.id === id)) throw new Error('O modelo não está mais disponível. Recarregue a lista.');
    const hidden = system ? [...new Set([...hiddenIdsRef.current, id])] : hiddenIdsRef.current;
    const local = id.startsWith('custom_');
    if (!system && !local) {
      let result;
      try { result = await deleteRemoteLabelLayout(id); } catch { throw new LabelLayoutUnconfirmedError(); }
      if (!result) throw new LabelLayoutUnconfirmedError();
      if (result.error) throw result.error;
    }
    if (!current()) return false;
    const updated = system ? layoutsRef.current : layoutsRef.current.filter((model) => model.id !== id);
    const saved = system ? saveHiddenDefaultLayoutIds(hidden) : saveCustomLabelLayouts(updated);
    if (saved !== true && (system || local)) throw new Error('Não foi possível confirmar a alteração neste computador.');
    mutationRevision.current++;
    layoutsRef.current = updated; setCustomLayouts(updated);
    hiddenIdsRef.current = hidden; setHiddenDefaultIds(hidden);
    if (saved !== true) report('Modelo excluído na nuvem; o cache local não pôde ser atualizado. Recarregue a página.');
    if (configRef.current.layoutId === id) {
      const available = [...DEFAULT_LAYOUT_MODELS, ...updated].find((model) => model.id !== id && !hidden.includes(model.id) && model.category === selectedCategory && (model.type ?? 'rect') === configRef.current.type);
      if (available) selectLayout(available);
      else { setCurrentModel(null); setConfig((previous) => ({ ...previous, layoutId: undefined })); }
    }
    toast.success(system ? 'Modelo ocultado neste computador.' : 'Modelo excluído.'); return true;
  }, (errors) => invalid(current, errors)), stillCurrent);

  const confirmDeleteLayout = (stillCurrent?: () => boolean): Promise<boolean> => handleDeleteLayout(modelToDelete ?? '', stillCurrent);

  const handleCopyToCategory = (model: GridModel, category: CategoryType, stillCurrent?: () => boolean): Promise<boolean> => runMutation((current) => copyForm.validateAndRun({ model: { ...model }, category },
    async (values) => createCopy(values.model, values.category, values.model.name, current), (errors) => invalid(current, errors)), stillCurrent);

  const selectModelId = (modelId: string) => {
    const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
    const model = allModels.find((m) => m.id === modelId);
    if (model) {
      setCurrentModel(model);
      selectLayout(model);

      if (model.type === 'round') {
        setLastSelectedRoundModelId(modelId);
      } else {
        setLastSelectedRectModelId(modelId);
      }
    }
  };

  const handleTypeChange = (type: LabelType) => {
    const newConfig = { ...config, type };
    setConfig(newConfig);

    const defaultKey = `${selectedCategory}_${type}`;
    const targetId =
      defaultLayoutIds[defaultKey] ||
      (type === 'round' ? lastSelectedRoundModelId : lastSelectedRectModelId);

    const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
    const targetModel =
      allModels.find((m) => m.id === targetId) ||
      (type === 'round'
        ? DEFAULT_LAYOUT_MODELS.find(
            (m) => m.category === (selectedCategory || 'logos') && m.type === 'round'
          )
        : DEFAULT_LAYOUT_MODELS.find(
            (m) => m.category === (selectedCategory || 'logos') && m.type === 'rect'
          ));

    if (targetModel) {
      setCurrentModel(targetModel);
      selectLayout(targetModel);
    }
  };

  useEffect(() => {
    let active = true;
    const fail = () => { if (active && mounted.current) setLayoutPreferenceError('Não foi possível salvar a seleção de modelos neste computador.'); };
    void persistPreferences({ roundId: lastSelectedRoundModelId, rectId: lastSelectedRectModelId }, (values) => {
      if (!active || !mounted.current) return;
      if (saveLastSelectedRoundModelId(values.roundId) !== true || saveLastSelectedRectModelId(values.rectId) !== true) fail();
      else setLayoutPreferenceError('');
    }, fail).catch(fail);
    return () => { active = false; };
  }, [lastSelectedRoundModelId, lastSelectedRectModelId, persistPreferences]);

  return {
    config,
    setConfig,
    DEFAULT_LAYOUT_MODELS,
    customLayouts,
    setCustomLayouts,
    savedArtConfigs,
    setSavedArtConfigs,
    artVersion,
    setArtVersion,
    layoutModels,
    currentModel,
    setCurrentModel,
    editingGridModel,
    setEditingGridModel,
    selectLayout,
    selectModelId,
    handleTypeChange,
    handleDuplicateLayout,
    handleSaveGridModel,
    toggleDefaultLayout,
    handleDeleteLayout,
    confirmDeleteLayout,
    handleCopyToCategory,
    applyPresetWithConfig,
    modelToDelete,
    setModelToDelete,
    layoutsBusy,
    layoutsLoading,
    layoutsQueryError,
    layoutPreferenceError,
    layoutsError,
    layoutsBlocked,
  };
};
