import { z } from 'zod';

export const imageFilesFormSchema = z.object({
  files: z.array(z.custom<File>((file) => typeof File !== 'undefined' && file instanceof File && file.type.startsWith('image/'), 'Selecione um arquivo de imagem.')).min(1, 'Selecione uma imagem.'),
});
export const documentFilesFormSchema = z.object({
  files: z.array(z.custom<File>((file) => typeof File !== 'undefined' && file instanceof File && (file.type.startsWith('image/') || file.type === 'application/pdf'), 'Selecione arquivos PDF ou imagens.')).min(1, 'Selecione um arquivo.'),
});
export const avatarUploadFormSchema = imageFilesFormSchema.extend({ userId: z.string().min(1, 'Entre novamente para atualizar sua foto.') });

const cropDimension = z.number({ error: 'Informe dimensões válidas para o recorte.' }).positive('A imagem ainda não está pronta para recorte.');
const cropPosition = z.number({ error: 'Informe uma posição válida para o recorte.' }).nonnegative('O recorte deve ficar dentro da imagem.');
const cropBounds = { displayWidth: cropDimension, displayHeight: cropDimension, sourceWidth: cropDimension, sourceHeight: cropDimension };
export const rectangularImageCropFormSchema = imageFilesFormSchema.extend({
  ...cropBounds,
  selection: z.object({ x: cropPosition, y: cropPosition, width: cropDimension, height: cropDimension }),
}).refine((value) => value.selection.x + value.selection.width <= value.displayWidth + 0.000001 && value.selection.y + value.selection.height <= value.displayHeight + 0.000001,
  { path: ['selection'], message: 'O recorte deve ficar dentro da imagem.' });
export const squareImageCropFormSchema = z.object({
  ...cropBounds, image: z.string().min(1, 'Selecione uma imagem.'), paddingPercent: z.number({ error: 'Informe uma margem válida.' }).min(0, 'Informe uma margem entre 0 e 35%.').max(35, 'Informe uma margem entre 0 e 35%.'),
  selection: z.object({ x: cropPosition, y: cropPosition, size: cropDimension }),
}).refine((value) => value.selection.x + value.selection.size <= value.displayWidth + 0.000001 && value.selection.y + value.selection.size <= value.displayHeight + 0.000001,
  { path: ['selection'], message: 'O recorte deve ficar dentro da imagem.' });
