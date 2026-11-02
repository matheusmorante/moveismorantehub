import React, { useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  labelArtConfigSchema,
  labelArtLayoutSelectionSchema,
} from '../../../../../../../../shared-utils/labelArtworkFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import {
  fetchPriceLabelArtConfigResult,
  fetchOpportunitiesResult,
} from '../../services/priceLabelPersistenceService';
import type { LabelConfig } from '../../utils/LabelConstants';
import type { Opportunity } from '../../types/PriceLabelArtEditorTypes';

interface UsePriceLabelArtworkQueriesParams {
  isOpen: boolean;
  layoutId: LabelConfig['layoutId'];
  initialArtConfig: LabelConfig['artConfig'];
  initialOpportunityId: string;
  selectedOppId: string;
  applySnapshot: (snapshot: Record<string, any>, isInit: boolean) => void;
  onArtConfigLoaded?: (artConfig: NonNullable<LabelConfig['artConfig']>, stillCurrent?: () => boolean) => void;
  activeRef: React.MutableRefObject<boolean>;
  confirmedSnapshotRef: React.MutableRefObject<string>;
  lastQueuedSnapshotRef: React.MutableRefObject<string>;
  latestRequestedSnapshotRef: React.MutableRefObject<string>;
  opportunitySelectionRevision: React.MutableRefObject<number>;
  setIsArtConfigLoading: (loading: boolean) => void;
  setOppColorsMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  setDbOpportunities: (opportunities: Opportunity[]) => void;
  setSelectedOppId: (id: string) => void;
  setBgColor: (color: string) => void;
}

export function usePriceLabelArtworkQueries({
  isOpen,
  layoutId,
  initialArtConfig,
  initialOpportunityId,
  selectedOppId,
  applySnapshot,
  onArtConfigLoaded,
  activeRef,
  confirmedSnapshotRef,
  lastQueuedSnapshotRef,
  latestRequestedSnapshotRef,
  opportunitySelectionRevision,
  setIsArtConfigLoading,
  setOppColorsMap,
  setDbOpportunities,
  setSelectedOppId,
  setBgColor,
}: UsePriceLabelArtworkQueriesParams) {
  const { validateValues: validateArtQuery } = useZodForm(labelArtLayoutSelectionSchema, {
    layoutId: String(layoutId || 'preco_2x5_restored'),
  });
  const { validateValues: validateOpportunityQuery } = useZodForm(labelArtLayoutSelectionSchema, {
    layoutId: String(layoutId || 'preco_2x5_restored'),
  });
  const [artQueryError, setArtQueryError] = useState('');
  const [opportunityQueryError, setOpportunityQueryError] = useState('');
  const [queryRevision, setQueryRevision] = useState(0);
  const [opportunityQueryRevision, setOpportunityQueryRevision] = useState(0);
  const isInitializedRef = useRef(false);
  const loadedArtConfig = useRef(initialArtConfig);
  const initialArtworkQuery = useRef({ artConfig: initialArtConfig, selectedOppId, applySnapshot, onArtConfigLoaded });

  // Carrega um único layout global. A oportunidade altera somente as cores.
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      setIsArtConfigLoading(true);
      return;
    }
    let cancelled = false;
    setIsArtConfigLoading(true);
    setArtQueryError('');

    const loadArtConfigFromSupabase = async () => {
      try {
        const query = await validateArtQuery(
          { layoutId: String(layoutId || 'preco_2x5_restored') },
          (errors) => {
            throw new Error(Object.values(flattenFormErrors(errors))[0]);
          }
        );
        if (!query || cancelled) return;
        const result = await withTimeout(
          fetchPriceLabelArtConfigResult(query.layoutId),
          16000,
          { data: null, error: new Error('A consulta da arte excedeu o prazo. Tente consultar novamente.') },
          'etiquetas:consultar-arte-editor'
        );
        if (cancelled || !activeRef.current) return;
        if (result.error) throw result.error;
        const fallback = initialArtworkQuery.current.artConfig;
        const dbArtConfig = result.data ?? (fallback ? labelArtConfigSchema.parse(fallback) : undefined);
        loadedArtConfig.current = dbArtConfig;

        if (dbArtConfig) {
          initialArtworkQuery.current.onArtConfigLoaded?.(dbArtConfig, () => !cancelled && activeRef.current);
          if (dbArtConfig.oppColorsMap && typeof dbArtConfig.oppColorsMap === 'object') {
            setOppColorsMap(dbArtConfig.oppColorsMap);
          }

          const snapshotToApply =
            dbArtConfig.opportunities?.['none'] ||
            dbArtConfig.opportunities?.['default'] ||
            dbArtConfig.opportunities?.['salvado'] ||
            dbArtConfig.globalSnapshot ||
            Object.values(dbArtConfig.opportunities || {})[0];

          if (snapshotToApply) {
            const { selectedOppId: _savedContext, ...globalLayout } = snapshotToApply as Record<string, any>;
            initialArtworkQuery.current.applySnapshot(globalLayout, isInitializedRef.current);
          } else {
            const initialBg =
              initialArtworkQuery.current.selectedOppId === 'none'
                ? '#ffffff'
                : initialArtworkQuery.current.selectedOppId === 'salvado'
                  ? '#ff7900'
                  : '#ffffff';
            setBgColor(initialBg);
          }
        } else {
          const initialBg =
            initialArtworkQuery.current.selectedOppId === 'none'
              ? '#ffffff'
              : initialArtworkQuery.current.selectedOppId === 'salvado'
                ? '#ff7900'
                : '#ffffff';
          setBgColor(initialBg);
        }

        isInitializedRef.current = true;
        confirmedSnapshotRef.current = '';
        lastQueuedSnapshotRef.current = '';
        latestRequestedSnapshotRef.current = '';
      } catch (error) {
        if (!cancelled && activeRef.current) {
          setArtQueryError(error instanceof Error ? error.message : 'Não foi possível consultar a arte. Tente novamente.');
        }
      } finally {
        if (!cancelled && activeRef.current) setIsArtConfigLoading(false);
      }
    };

    loadArtConfigFromSupabase();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    layoutId,
    queryRevision,
    validateArtQuery,
    lastQueuedSnapshotRef,
    latestRequestedSnapshotRef,
    setBgColor,
    setIsArtConfigLoading,
    setOppColorsMap,
  ]);

  // Carrega oportunidades cadastradas no Supabase
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const selectionRevision = opportunitySelectionRevision.current;
    setOpportunityQueryError('');

    async function fetchOpps() {
      try {
        const query = await validateOpportunityQuery({ layoutId: String(layoutId || 'preco_2x5_restored') });
        if (!query || cancelled) return;
        const { data, error } = await withTimeout(
          fetchOpportunitiesResult(),
          16000,
          { data: [], error: new Error('A consulta das oportunidades excedeu o prazo. Tente novamente.') },
          'etiquetas:consultar-oportunidades-editor'
        );
        if (cancelled || !activeRef.current) return;
        if (error) throw error;
        setDbOpportunities(data);
        if (initialOpportunityId && opportunitySelectionRevision.current === selectionRevision) {
          setSelectedOppId(initialOpportunityId);
        }
      } catch (err) {
        if (!cancelled && activeRef.current) {
          setOpportunityQueryError(err instanceof Error ? err.message : 'Não foi possível consultar as oportunidades.');
        }
      }
    }
    fetchOpps();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    layoutId,
    initialOpportunityId,
    opportunityQueryRevision,
    validateOpportunityQuery,
    setDbOpportunities,
    setSelectedOppId,
  ]);

  return {
    loadedArtConfig,
    artQueryError,
    opportunityQueryError,
    setQueryRevision,
    setOpportunityQueryRevision,
  };
}
