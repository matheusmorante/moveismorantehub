import { toast } from 'react-toastify';
import type { FieldErrors, FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import { flattenFormErrors } from '@/hooks/useZodForm';
import type {
  labelArtworkExportFormSchema,
  labelArtworkTitleFormSchema,
} from '../../../../../../../../shared-utils/labelArtworkFormSchemas';
import { exportLabelImage } from '../../services/priceLabelExportService';
import type { LabelConfig } from '../../utils/LabelConstants';

type ValidateAndRun<TInput extends FieldValues, TOutput extends FieldValues> = <TResult>(
  values: TInput,
  onValid: (data: TOutput) => TResult | Promise<TResult>,
  onInvalid?: (errors: FieldErrors<TInput>) => void,
) => Promise<TResult | false>;

interface PriceLabelArtworkActionParams {
  active: { current: boolean };
  actionInFlight: { current: boolean };
  closing: { current: boolean };
  isArtConfigLoading: boolean;
  artQueryError: unknown;
  saveGuard: { error: Error | null };
  isTestValuesModalOpen: boolean;
  config: LabelConfig;
  getSnapshot: () => Record<string, any>;
  latestSnapshot: { readonly current: () => Record<string, any> };
  previewRef: { readonly current: HTMLDivElement | null };
  title: string;
  setTitle: (title: string) => void;
  setSelectedElement: (element: any) => void;
  setSelectedElements: (elements: Set<any>) => void;
  setActionBusy: (busy: boolean) => void;
  setActionError: (error: string) => void;
  validateExport: ValidateAndRun<
    z.input<typeof labelArtworkExportFormSchema>,
    z.output<typeof labelArtworkExportFormSchema>
  >;
  validateTitle: ValidateAndRun<
    z.input<typeof labelArtworkTitleFormSchema>,
    z.output<typeof labelArtworkTitleFormSchema>
  >;
}

export function createPriceLabelArtworkActionHandlers({
  active,
  actionInFlight,
  closing,
  isArtConfigLoading,
  artQueryError,
  saveGuard,
  isTestValuesModalOpen,
  config,
  getSnapshot,
  latestSnapshot,
  previewRef,
  title,
  setTitle,
  setSelectedElement,
  setSelectedElements,
  setActionBusy,
  setActionError,
  validateExport,
  validateTitle,
}: PriceLabelArtworkActionParams) {
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

  return { handleExport, handleRenameTitle };
}
