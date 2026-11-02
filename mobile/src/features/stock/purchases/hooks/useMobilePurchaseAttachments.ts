import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { mobilePurchaseAttachmentUploadFormSchema } from '../../../../../../shared-utils/purchaseFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supabase } from '../../../../services/supabaseClient';

export type PickedPurchaseAttachment = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
  file?: Blob;
};

export interface UseMobilePurchaseAttachmentsOptions {
  readonly onAttachmentChange?: () => void;
  readonly storageFolder?: 'purchases' | 'receipts';
  readonly recordLabel?: 'pedido' | 'recebimento';
}

/**
 * Sub-hook de anexos para pedidos de compra e recebimentos no app.
 */
export function useMobilePurchaseAttachments(options?: UseMobilePurchaseAttachmentsOptions) {
  const onAttachmentChange = options?.onAttachmentChange;
  const storageFolder = options?.storageFolder || 'purchases';
  const recordLabel = options?.recordLabel || 'pedido';
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const attachmentUploadForm = useZodForm(mobilePurchaseAttachmentUploadFormSchema, {
    existingCount: attachments.length,
    assets: [],
  });

  const addAttachments = useCallback(async () => {
    if (isUploading) return;
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (selection.canceled || !selection.assets?.length) return;

      await attachmentUploadForm.validateAndRun(
        { existingCount: attachments.length, assets: selection.assets },
        async (values) => {
          setIsUploading(true);
          const uploadedUrls = [...attachments];
          try {
            for (let index = 0; index < values.assets.length; index += 1) {
              const asset = values.assets[index] as PickedPurchaseAttachment;
              const responseBlob = asset.file
                ? asset.file
                : await withTimeout(
                    fetch(asset.uri).then((response) => {
                      if (!response.ok) throw new Error('Não foi possível ler o arquivo selecionado.');
                      return response.blob();
                    }),
                    20_000,
                    null,
                    `mobile:${recordLabel}:ler-anexo`
                  );
              if (!responseBlob) throw new Error('A leitura do arquivo demorou demais. Selecione-o novamente.');

              const candidateExtension = asset.name.split('.').pop()?.toLowerCase() || '';
              const extension = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'bmp'].includes(candidateExtension)
                ? candidateExtension
                : asset.mimeType?.toLowerCase() === 'application/pdf'
                  ? 'pdf'
                  : 'jpg';
              const contentType = asset.mimeType && asset.mimeType !== 'application/octet-stream'
                ? asset.mimeType
                : responseBlob.type || (extension === 'pdf' ? 'application/pdf' : `image/${extension === 'jpg' ? 'jpeg' : extension}`);
              const filePath = `${storageFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
              const uploadResult = await withTimeout(
                supabase.storage
                  .from('purchase-attachments')
                  .upload(filePath, responseBlob, { contentType, upsert: false })
                  .then(({ error }) => ({ error })),
                30_000,
                null,
                `mobile:${recordLabel}:enviar-anexo`
              );
              if (!uploadResult) throw new Error('O envio do arquivo demorou demais. Confira sua conexão e tente novamente.');
              if (uploadResult.error) throw uploadResult.error;

              const { data } = supabase.storage.from('purchase-attachments').getPublicUrl(filePath);
              if (!data.publicUrl) throw new Error('Não foi possível obter o link do anexo enviado.');
              uploadedUrls.push(data.publicUrl);
              setAttachments([...uploadedUrls]);
              onAttachmentChange?.();
            }
            Alert.alert('Anexos adicionados', `Os arquivos foram anexados ao ${recordLabel}.`);
          } catch (cause: any) {
            console.error(`[Stock] Falha ao anexar arquivo ao ${recordLabel}:`, cause);
            Alert.alert('Não foi possível anexar', cause?.message || 'Confira sua conexão e tente novamente.');
          } finally {
            setIsUploading(false);
          }
          return true;
        },
        (errors) => Alert.alert('Arquivo inválido', Object.values(flattenFormErrors(errors))[0])
      );
    } catch (cause: any) {
      console.error(`[Stock] Falha ao selecionar anexos do ${recordLabel}:`, cause);
      Alert.alert('Não foi possível abrir os arquivos', cause?.message || 'Tente selecionar os arquivos novamente.');
    }
  }, [attachments, isUploading, attachmentUploadForm, onAttachmentChange, recordLabel, storageFolder]);

  const removeAttachment = useCallback((index: number) => {
    if (isUploading) return;
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    onAttachmentChange?.();
  }, [isUploading, onAttachmentChange]);

  return {
    attachments,
    setAttachments,
    isUploading,
    setIsUploading,
    addAttachments,
    removeAttachment,
    attachmentUploadForm,
  };
}
