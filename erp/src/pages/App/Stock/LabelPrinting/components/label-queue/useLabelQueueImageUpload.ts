import React from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelQueueImageUploadFormSchema } from '../../../../../../../../shared-utils/labelImageFormSchemas';
import { readImageFile } from '../../../../../../../../shared-utils/readImageFile';

interface UseLabelQueueImageUploadParams {
  labelItems: any[];
  setLabelItems: React.Dispatch<React.SetStateAction<any[]>>;
  selectedCategory?: string | null;
  printingMode: 'simple' | 'advanced';
}

export const useLabelQueueImageUpload = ({
  labelItems,
  setLabelItems,
  selectedCategory,
  printingMode,
}: UseLabelQueueImageUploadParams) => {
  const imageForm = useZodForm(labelQueueImageUploadFormSchema, { files: [], index: 0, blank: false });
  const [imageBusy, setImageBusy] = React.useState(false);
  const [imageError, setImageError] = React.useState('');
  const activeRead = React.useRef<AbortController | null>(null);
  const mounted = React.useRef(false);
  const ownerKey = `${selectedCategory ?? ''}:${printingMode}`;
  const currentOwner = React.useRef(ownerKey);
  const currentItems = React.useRef(labelItems);
  currentOwner.current = ownerKey;
  currentItems.current = labelItems;

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeRead.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    setImageError('');
    return () => activeRead.current?.abort();
  }, [ownerKey]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>, index: number, blank = false) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || activeRead.current) return;
    const controller = new AbortController();
    const snapshot = labelItems;
    activeRead.current = controller;
    setImageBusy(true);
    setImageError('');
    const current = () => mounted.current && !controller.signal.aborted && currentOwner.current === ownerKey;
    const fail = (message: string) => {
      if (current()) {
        setImageError(message);
        toast.error(message);
      }
    };
    try {
      await imageForm.validateAndRun(
        { files: [file], index, blank },
        async (values) => {
          if (!current()) return;
          const target = snapshot[values.index];
          if (!target) throw new Error('A etiqueta não está mais disponível.');
          const image = await readImageFile(values.files[0], controller.signal);
          if (!current()) return;
          if (!currentItems.current.includes(target))
            throw new Error('A etiqueta mudou durante a leitura. Selecione a imagem novamente.');
          setLabelItems((previous) =>
            previous.map((item) =>
              item === target
                ? { ...item, image, ...(values.blank ? { isBlank: false, printingMode: 'simple' } : {}) }
                : item
            )
          );
        },
        (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira a imagem.')
      );
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : 'Não foi possível ler a imagem.');
    } finally {
      if (activeRead.current === controller) {
        activeRead.current = null;
        if (mounted.current) setImageBusy(false);
      }
    }
  };

  return {
    imageBusy,
    imageError,
    handleImageChange,
  };
};
