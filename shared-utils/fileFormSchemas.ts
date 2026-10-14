import { z } from 'zod';

export const imageFilesFormSchema = z.object({
  files: z.array(z.custom<File>((file) => typeof file === 'object' && file !== null && 'type' in file && typeof file.type === 'string' && file.type.startsWith('image/'), 'Selecione um arquivo de imagem.')).min(1, 'Selecione uma imagem.'),
});
export const documentFilesFormSchema = z.object({
  files: z.array(z.custom<File>((file) => typeof file === 'object' && file !== null && 'type' in file && typeof file.type === 'string' && (file.type.startsWith('image/') || file.type === 'application/pdf'), 'Selecione arquivos PDF ou imagens.')).min(1, 'Selecione um arquivo.'),
});
export const avatarUploadFormSchema = imageFilesFormSchema.extend({ userId: z.string().min(1, 'Entre novamente para atualizar sua foto.') });
