import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelPartialConfigFormSchema } from '../../../../../../../../shared-utils/labelDesignFormSchemas';
import {
  labelArtworkTitleFormSchema,
  labelArtworkExportFormSchema,
} from '../../../../../../../../shared-utils/labelArtworkFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { buildPriceLabelAutoSaveConfig } from '../../services/priceLabelAutoSaveConfig';
import { exportLabelImage } from '../../services/priceLabelExportService';
import { usePriceLabelArtworkQueries } from './usePriceLabelArtworkQueries';
import type { LabelConfig } from '../../utils/LabelConstants';
import type { Opportunity } from '../../types/PriceLabelArtEditorTypes';

export interface ArtworkSaveGuard {
  active: symbol | null;
  error: Error | null;
}

export interface UsePriceLabelArtworkSessionParams {
  isOpen: boolean;
  onClose: () => void;
  config: LabelConfig;
  onSaveConfig: (updatedConfig: Partial<LabelConfig>, stillCurrent?: () => boolean) => boolean | Promise<boolean>;
  onArtConfigLoaded?: (artConfig: NonNullable<LabelConfig['artConfig']>, stillCurrent?: () => boolean) => void;
  initialProduct?: {
    name?: string;
    price?: string;
    promoPrice?: string;
    sku?: string;
    opportunities?: any;
  };
  saveGuard: ArtworkSaveGuard;

  // Snapshot & state getters/setters
  getSnapshot: () => Record<string, any>;
  applySnapshot: (snapshot: Record<string, any>, isInit: boolean) => void;
  lastQueuedSnapshotRef: React.MutableRefObject<string>;
  latestRequestedSnapshotRef: React.MutableRefObject<string>;
  saveQueueRef: React.MutableRefObject<Promise<unknown>>;
  isArtConfigLoading: boolean;
  setIsArtConfigLoading: (loading: boolean) => void;
  autoSaveStatus: 'saved' | 'saving' | 'error';
  setAutoSaveStatus: (status: 'saved' | 'saving' | 'error') => void;

  oppColorsMap: Record<string, Record<string, string>>;
  setOppColorsMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  selectedOppId: string;
  setSelectedOppId: (id: string) => void;
  dbOpportunities: Opportunity[];
  setDbOpportunities: (opps: Opportunity[]) => void;
  setBgColor: (color: string) => void;

  title: string;
  setTitle: (title: string) => void;
  showTitle: boolean;
  normalPrice: string;
  promoPrice: string;
  showPromoPrice: boolean;
  priceColor: string;
  scaleTens: number;
  scaleHundreds: number;
  scaleThousands: number;
  scaleTenThousands: number;
  titlePos: { x: number; y: number };
  titleWidth: number;
  promoPricePos: { x: number; y: number };
  dePricePorGroupPos: { x: number; y: number };
  dePricePorGroupRotation: number;
  dePricePorGroupGap: number;

  setSelectedElement: (el: any) => void;
  setSelectedElements: (elements: Set<any>) => void;
  previewRef: React.RefObject<HTMLDivElement | null>;
  isTestValuesModalOpen: boolean;
}

export function usePriceLabelArtworkSession({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onArtConfigLoaded,
  initialProduct,
  saveGuard,
  getSnapshot,
  applySnapshot,
  lastQueuedSnapshotRef,
  latestRequestedSnapshotRef,
  saveQueueRef,
  isArtConfigLoading,
  setIsArtConfigLoading,
  autoSaveStatus,
  setAutoSaveStatus,
  oppColorsMap,
  setOppColorsMap,
  selectedOppId,
  setSelectedOppId,
  dbOpportunities,
  setDbOpportunities,
  setBgColor,
  title,
  setTitle,
  showTitle,
  normalPrice,
  promoPrice,
  showPromoPrice,
  priceColor,
  scaleTens,
  scaleHundreds,
  scaleThousands,
  scaleTenThousands,
  titlePos,
  titleWidth,
  promoPricePos,
  dePricePorGroupPos,
  dePricePorGroupRotation,
  dePricePorGroupGap,
  setSelectedElement,
  setSelectedElements,
  previewRef,
  isTestValuesModalOpen,
}: UsePriceLabelArtworkSessionParams) {
  const { validateAndRun: validateConfig } = useZodForm(labelPartialConfigFormSchema, {});
  const { validateAndRun: validateExport } = useZodForm(labelArtworkExportFormSchema, {
    layoutId: String(config.layoutId || 'preco_2x5_restored'),
    action: 'download',
    snapshot: {},
  });
  const { validateAndRun: validateTitle } = useZodForm(labelArtworkTitleFormSchema, { title: '' });

  const active = useRef(true);
  const sessionId = useRef(Symbol('price-artwork'));
  const confirmedSnapshot = useRef('');
  const saveFailure = useRef<Error | null>(saveGuard.error);
  const [saveError, setSaveError] = useState(saveGuard.error?.message || '');
  const [isClosing, setIsClosing] = useState(false);
  const closing = useRef(false);
  const actionInFlight = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const historyEditingAllowed = useRef(false);
  const opportunitySelectionRevision = useRef(0);
  const latestSnapshot = useRef(getSnapshot);
  latestSnapshot.current = getSnapshot;

  const initialOpportunityId = initialProduct?.opportunities
    ? String(initialProduct.opportunities.id || initialProduct.opportunities.slug || 'salvado')
    : '';

  useEffect(() => {
    const currentSessionId = sessionId.current;
    active.current = true;
    if (saveGuard.active && saveGuard.active !== sessionId.current) {
      saveGuard.error = Object.assign(
        new Error('Há um salvamento de outra abertura sem confirmação. Recarregue a página antes de continuar.'),
        { requiresRefresh: true }
      );
      saveFailure.current = saveGuard.error;
      setSaveError(saveGuard.error.message);
    }
    return () => {
      active.current = false;
      if (saveGuard.active === currentSessionId) {
        saveGuard.error = Object.assign(
          new Error('O editor mudou durante uma gravação. Recarregue a página antes de continuar.'),
          { requiresRefresh: true }
        );
      }
    };
  }, [saveGuard]);

  const {
    loadedArtConfig,
    artQueryError,
    opportunityQueryError,
    setQueryRevision,
    setOpportunityQueryRevision,
  } = usePriceLabelArtworkQueries({
    isOpen,
    layoutId: config.layoutId,
    initialArtConfig: config.artConfig,
    initialOpportunityId,
    selectedOppId,
    applySnapshot,
    onArtConfigLoaded,
    activeRef: active,
    confirmedSnapshotRef: confirmedSnapshot,
    lastQueuedSnapshotRef,
    latestRequestedSnapshotRef,
    opportunitySelectionRevision,
    setIsArtConfigLoading,
    setOppColorsMap,
    setDbOpportunities,
    setSelectedOppId,
    setBgColor,
  });

  historyEditingAllowed.current = !isArtConfigLoading && !artQueryError && !saveGuard.error && !actionBusy;

  const queueAutoSave = useCallback(
    (snapshot: Record<string, any>, serialized: string, force = false) => {
      if (!active.current) return Promise.resolve();
      if (saveGuard.error || saveFailure.current) return Promise.reject(saveGuard.error || saveFailure.current);
      if (!force && serialized === lastQueuedSnapshotRef.current) return saveQueueRef.current;

      const intent = structuredClone(
        buildPriceLabelAutoSaveConfig({
          artConfig: loadedArtConfig.current,
          snapshot,
          oppColorsMap,
          selectedOppId,
          title,
          normalPrice,
          promoPrice,
          showPromoPrice,
          priceColor,
          showTitle,
          scaleTens,
          scaleHundreds,
          scaleThousands,
          scaleTenThousands,
          titlePos,
          titleWidth,
          promoPricePos,
          dePricePorGroupPos,
          dePricePorGroupRotation,
          dePricePorGroupGap,
        })
      );
      lastQueuedSnapshotRef.current = serialized;
      latestRequestedSnapshotRef.current = serialized;
      setAutoSaveStatus('saving');

      const operation = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (!active.current) return;
          if (saveGuard.error || saveFailure.current) throw saveGuard.error || saveFailure.current;
          if (saveGuard.active && saveGuard.active !== sessionId.current) {
            throw Object.assign(
              new Error('Há uma gravação anterior sem confirmação. Recarregue antes de continuar.'),
              { requiresRefresh: true }
            );
          }
          saveGuard.active = sessionId.current;
          try {
            const saved = await validateConfig(
              intent,
              async (values) => {
                if (!active.current) return false;
                let acceptingConfirmation = true;
                let confirmed: boolean;
                try {
                  confirmed = await withTimeout(
                    Promise.resolve(
                      onSaveConfig(values, () => active.current && acceptingConfirmation && !saveGuard.error)
                    ),
                    45000,
                    false,
                    'etiquetas:confirmar-arte-editor'
                  );
                } finally {
                  acceptingConfirmation = false;
                }
                if (confirmed !== true) {
                  throw Object.assign(
                    new Error('A gravação da arte não foi confirmada. Recarregue a página antes de continuar.'),
                    { uncertain: true }
                  );
                }
                if (!active.current || saveGuard.error) {
                  throw (
                    saveGuard.error ||
                    Object.assign(
                      new Error('O editor mudou durante uma gravação. Recarregue antes de continuar.'),
                      { requiresRefresh: true }
                    )
                  );
                }
                loadedArtConfig.current = values.artConfig;
                return true;
              },
              (errors) => {
                throw new Error(Object.values(flattenFormErrors(errors))[0]);
              }
            );
            if (saved !== true) throw new Error('Não foi possível validar a etiqueta.');
            confirmedSnapshot.current = serialized;
            if (active.current && latestRequestedSnapshotRef.current === serialized) {
              setSaveError('');
              setAutoSaveStatus('saved');
            }
          } finally {
            if (saveGuard.active === sessionId.current) saveGuard.active = null;
          }
        })
        .catch((error) => {
          const failure =
            error instanceof Error
              ? error
              : Object.assign(new Error('Não foi possível salvar a arte. Tente novamente.'), { cause: error });
          if (
            (error as { uncertain?: boolean; requiresRefresh?: boolean })?.uncertain ||
            (error as { requiresRefresh?: boolean })?.requiresRefresh
          ) {
            saveGuard.error = failure;
          }
          if (active.current) {
            saveFailure.current = failure;
            lastQueuedSnapshotRef.current = confirmedSnapshot.current;
            setSaveError(failure.message);
            setAutoSaveStatus('error');
          }
          throw failure;
        });

      saveQueueRef.current = operation;
      return operation;
    },
    [
      saveGuard,
      validateConfig,
      onSaveConfig,
      oppColorsMap,
      selectedOppId,
      title,
      normalPrice,
      promoPrice,
      showPromoPrice,
      priceColor,
      showTitle,
      scaleTens,
      scaleHundreds,
      scaleThousands,
      scaleTenThousands,
      titlePos,
      titleWidth,
      promoPricePos,
      dePricePorGroupPos,
      dePricePorGroupRotation,
      dePricePorGroupGap,
      lastQueuedSnapshotRef,
      latestRequestedSnapshotRef,
      saveQueueRef,
      setAutoSaveStatus,
    ]
  );

  useEffect(() => {
    if (!isOpen) {
      lastQueuedSnapshotRef.current = '';
      latestRequestedSnapshotRef.current = '';
      setAutoSaveStatus('saved');
      return;
    }
    if (isArtConfigLoading || artQueryError || saveGuard.error || saveFailure.current || isClosing) return;

    const snapshot = getSnapshot();
    const serialized = JSON.stringify(snapshot);
    if (!lastQueuedSnapshotRef.current) {
      lastQueuedSnapshotRef.current = serialized;
      latestRequestedSnapshotRef.current = serialized;
      confirmedSnapshot.current = serialized;
      return;
    }
    if (serialized === lastQueuedSnapshotRef.current) return;

    const timer = setTimeout(() => {
      queueAutoSave(snapshot, serialized).catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
  }, [
    isOpen,
    isArtConfigLoading,
    artQueryError,
    saveGuard,
    isClosing,
    getSnapshot,
    queueAutoSave,
    lastQueuedSnapshotRef,
    latestRequestedSnapshotRef,
    setAutoSaveStatus,
  ]);

  const handleBackToErp = async () => {
    if (closing.current || actionInFlight.current || isArtConfigLoading || artQueryError || saveGuard.error) return;
    closing.current = true;
    setIsClosing(true);
    const snapshot = getSnapshot();
    const serialized = JSON.stringify(snapshot);
    try {
      if (saveFailure.current) throw saveFailure.current;
      if (serialized !== lastQueuedSnapshotRef.current || autoSaveStatus === 'saving') {
        if (serialized !== lastQueuedSnapshotRef.current) queueAutoSave(snapshot, serialized);
        const drained = await withTimeout(
          saveQueueRef.current.then(() => true),
          45000,
          false,
          'etiquetas:aguardar-saida-editor'
        );
        if (!drained) {
          throw Object.assign(
            new Error('A confirmação das alterações excedeu o prazo. Recarregue a página antes de continuar.'),
            { uncertain: true }
          );
        }
      }
      if (active.current) onClose();
    } catch (error) {
      if ((error as { uncertain?: boolean })?.uncertain) {
        saveGuard.error = error as Error;
        saveFailure.current = error as Error;
        if (active.current) {
          setSaveError((error as Error).message);
          setAutoSaveStatus('error');
        }
      }
      toast.error('A alteração ainda não foi salva. Tente voltar novamente.');
    } finally {
      closing.current = false;
      if (active.current) setIsClosing(false);
    }
  };

  const retrySave = async () => {
    if (saveGuard.error || isArtConfigLoading || artQueryError || closing.current || actionInFlight.current) return;
    saveFailure.current = null;
    setSaveError('');
    lastQueuedSnapshotRef.current = confirmedSnapshot.current;
    const snapshot = getSnapshot();
    try {
      await queueAutoSave(snapshot, JSON.stringify(snapshot), true);
    } catch {
      /* Visible owner error is set by the queue. */
    }
  };

  const runArtworkAction = async (operation: () => Promise<unknown>) => {
    if (
      !active.current ||
      actionInFlight.current ||
      closing.current ||
      isArtConfigLoading ||
      artQueryError ||
      saveGuard.error
    ) {
      return;
    }
    actionInFlight.current = true;
    setActionBusy(true);
    setActionError('');
    try {
      await operation();
    } catch (error) {
      if (active.current) {
        setActionError(error instanceof Error ? error.message : 'Não foi possível concluir a ação da arte.');
      }
    } finally {
      actionInFlight.current = false;
      if (active.current) setActionBusy(false);
    }
  };

  const invalidArtworkAction = (errors: Parameters<typeof flattenFormErrors>[0]) => {
    if (active.current) {
      setActionError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da arte.');
    }
  };

  const handleExport = (action: 'copy' | 'download') =>
    runArtworkAction(async () => {
      if (isTestValuesModalOpen) throw new Error('Conclua o teste de numeração antes de exportar a arte.');
      const snapshot = structuredClone(getSnapshot());
      const serialized = JSON.stringify(snapshot);
      await validateExport(
        { layoutId: String(config.layoutId || 'preco_2x5_restored'), action, snapshot },
        async (values) => {
          const stillCurrent = () => active.current && JSON.stringify(latestSnapshot.current()) === serialized;
          if (!stillCurrent()) throw new Error('A arte mudou durante a exportação. Tente novamente.');
          await exportLabelImage(previewRef.current, values, stillCurrent);
          if (stillCurrent()) {
            toast.success(
              values.action === 'copy'
                ? 'Imagem da etiqueta copiada para a área de transferência!'
                : 'Download da imagem PNG iniciado!'
            );
          }
          return true;
        },
        invalidArtworkAction
      );
    });

  const handleRenameTitle = () =>
    runArtworkAction(async () => {
      const newTitle = window.prompt('Nome / Título da Arte:', title);
      if (newTitle === null) return;
      await validateTitle(
        { title: newTitle },
        (values) => {
          if (!active.current) return false;
          setSelectedElement('title');
          setSelectedElements(new Set(['title']));
          setTitle(values.title);
          toast.success('Título da arte atualizado!');
          return true;
        },
        invalidArtworkAction
      );
    });

  return {
    active,
    closing,
    actionInFlight,
    historyEditingAllowed,
    opportunitySelectionRevision,
    saveError,
    artQueryError,
    opportunityQueryError,
    actionError,
    actionBusy,
    isClosing,
    setQueryRevision,
    setOpportunityQueryRevision,
    handleBackToErp,
    retrySave,
    handleExport,
    handleRenameTitle,
  };
}
