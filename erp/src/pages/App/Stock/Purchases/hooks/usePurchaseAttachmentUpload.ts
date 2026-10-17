import { useState } from 'react';
import { toast } from 'react-toastify';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/pages/utils/supabaseConfig';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { purchaseAttachmentUploadFormSchema } from '../../../../../../../shared-utils/purchaseFormSchemas';

export interface UsePurchaseAttachmentUploadOptions {
  readonly initialAttachments?: readonly string[];
}

export function usePurchaseAttachmentUpload(options?: UsePurchaseAttachmentUploadOptions) {
  const [attachments, setAttachments] = useState<readonly string[]>(options?.initialAttachments || []);
  const [isUploading, setIsUploading] = useState(false);

  const uploadForm = useZodForm(purchaseAttachmentUploadFormSchema, {
    existingCount: attachments.length,
    files: [],
  });

  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    if (file.size <= 2 * 1024 * 1024) return file;

    const compressionOptions = {
      maxSizeMB: 2,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, compressionOptions);
    } catch (error: unknown) {
      console.error('Erro ao comprimir imagem:', error);
      return file;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    return uploadForm.validateAndRun(
      { existingCount: attachments.length, files: Array.from(files) },
      async (values) => {
        setIsUploading(true);
        try {
          const uploadedUrls = [...attachments];
          for (let i = 0; i < values.files.length; i++) {
            let file = values.files[i];

            if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
              file = await compressImage(file);
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `purchases/${fileName}`;

            const { error } = await supabase.storage
              .from('purchase-attachments')
              .upload(filePath, file);

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
              .from('purchase-attachments')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              uploadedUrls.push(publicUrlData.publicUrl);
            }
          }
          setAttachments(uploadedUrls);
          toast.success('Arquivo(s) anexado(s) com sucesso!');
        } catch (error: unknown) {
          console.error('Erro ao fazer upload do arquivo:', error);
          toast.error('Erro ao fazer upload dos documentos do pedido.');
        } finally {
          setIsUploading(false);
          e.target.value = '';
        }
      },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
    );
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return {
    attachments,
    setAttachments,
    isUploading,
    handleFileUpload,
    handleRemoveAttachment,
  };
}
