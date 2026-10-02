import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getSettings, saveSettings, subscribeToSettings } from '../../../../utils/settingsService';
import {
  deleteRemoteLabelLayout,
  fetchRemoteLabelLayouts,
  insertRemoteLabelLayout,
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
  const [customLayouts, setCustomLayouts] = useState<GridModel[]>([]);
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

  useEffect(() => {
    const unsubscribe = subscribeToSettings((settings) => {
      if (settings.defaultLabelLayoutIds) {
        setDefaultLayoutIds(settings.defaultLabelLayoutIds);
      }
    });
    return unsubscribe;
  }, []);

  const [config, setConfig] = useState<LabelConfig>(() =>
    createInitialLabelConfig(isProductContext)
  );
  const configRef = useRef(config);
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
    const fetchCustomLayouts = async () => {
      const { data } = await fetchRemoteLabelLayouts();
      if (data && data.length > 0) {
        setCustomLayouts(data);
        saveCustomLabelLayouts(data);
      } else {
        const saved = getCustomLabelLayouts();
        if (saved) setCustomLayouts(saved);
      }
    };
    fetchCustomLayouts();
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

  const handleDuplicateLayout = async (model: GridModel) => {
    const newModel = {
      ...model,
      id: undefined,
      name: `${model.name} (Cópia)`,
    };

    const { data, error } = await insertRemoteLabelLayout(newModel);

    if (data && !error) {
      const saved = data;
      const updated = [...customLayouts, saved];
      setCustomLayouts(updated);
      saveCustomLabelLayouts(updated);
      toast.success('Layout duplicado e salvo no banco!');
    } else {
      const localModel: GridModel = { ...newModel, id: `custom_${Date.now()}` };
      const updated = [...customLayouts, localModel];
      setCustomLayouts(updated);
      saveCustomLabelLayouts(updated);
      toast.success('Layout duplicado (Local)');
    }
  };

  const toggleDefaultLayout = (modelId: string, category: string) => {
    const model = [...DEFAULT_LAYOUT_MODELS, ...customLayouts].find((m) => m.id === modelId);
    if (!model) return;

    const key = `${category}_${model.type || 'rect'}`;
    const newDefaults = { ...defaultLayoutIds, [key]: modelId };
    setDefaultLayoutIds(newDefaults);

    // Persist to Supabase app settings
    const currentSettings = getSettings();
    saveSettings({
      ...currentSettings,
      defaultLabelLayoutIds: newDefaults,
    })
      .then(() => {
        toast.info(
          `Modelo definido como padrão para ${model.type === 'round' ? 'etiquetas redondas' : 'etiquetas retangulares'} (Salvo na nuvem).`
        );
      })
      .catch((err) => {
        console.error('Erro ao salvar modelo padrão', err);
        toast.error('Erro ao salvar modelo padrão na nuvem.');
      });
  };

  const handleDeleteLayout = async (modelId: string) => {
    const isSystemDefault = DEFAULT_LAYOUT_MODELS.some((m) => m.id === modelId);
    const isLocalOnly = String(modelId).startsWith('custom_');

    if (isSystemDefault) {
      if (!hiddenDefaultIds.includes(modelId)) {
        const updated = [...hiddenDefaultIds, modelId];
        setHiddenDefaultIds(updated);
        saveHiddenDefaultLayoutIds(updated);
      }
    } else {
      const updatedCustom = customLayouts.filter((m) => m.id !== modelId);
      setCustomLayouts(updatedCustom);
      saveCustomLabelLayouts(updatedCustom);

      if (!isLocalOnly) {
        try {
          const dbId = /^\d+$/.test(modelId) ? Number(modelId) : modelId;
          await deleteRemoteLabelLayout(dbId);
        } catch (e) {
          console.error('Erro na requisição de deleção:', e);
        }
      }
    }

    if (config.layoutId === modelId) {
      const allModels = [
        ...DEFAULT_LAYOUT_MODELS,
        ...customLayouts.filter((m) => m.id !== modelId),
      ];
      const available = allModels.filter(
        (m) =>
          m.id !== modelId && !hiddenDefaultIds.includes(m.id) && m.category === selectedCategory
      );
      if (available.length > 0) selectLayout(available[0]);
    }
  };

  const confirmDeleteLayout = async () => {
    if (!modelToDelete) return;
    await handleDeleteLayout(modelToDelete);
    toast.success('Modelo excluído ou ocultado com sucesso.');
    setModelToDelete(null);
  };

  const handleCopyToCategory = async (model: GridModel, targetCat: CategoryType) => {
    const newModel = {
      ...model,
      id: undefined,
      category: targetCat,
      name: model.name,
    };

    const { data, error } = await insertRemoteLabelLayout(newModel);

    if (data && !error) {
      const saved = data;
      const updated = [...customLayouts, saved];
      setCustomLayouts(updated);
      saveCustomLabelLayouts(updated);
      const catName =
        targetCat === 'identificacao'
          ? 'Identificação'
          : targetCat === 'precos'
            ? 'Preços'
            : targetCat === 'logos'
              ? 'Logos'
              : 'Posts';
      toast.success(`Copiado com sucesso para ${catName}`);
    } else {
      console.error('Erro ao exportar layout:', error);
      const localModel: GridModel = { ...newModel, id: `custom_${Date.now()}` };
      const updated = [...customLayouts, localModel];
      setCustomLayouts(updated);
      saveCustomLabelLayouts(updated);
      toast.success('Copiado para outra categoria (Local)');
    }
  };

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
    saveLastSelectedRoundModelId(lastSelectedRoundModelId);
  }, [lastSelectedRoundModelId]);

  useEffect(() => {
    saveLastSelectedRectModelId(lastSelectedRectModelId);
  }, [lastSelectedRectModelId]);

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
    toggleDefaultLayout,
    handleDeleteLayout,
    confirmDeleteLayout,
    handleCopyToCategory,
    applyPresetWithConfig,
    modelToDelete,
    setModelToDelete,
  };
};
