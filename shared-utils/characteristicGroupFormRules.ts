import { z } from 'zod';
import type { CharacteristicGroup } from '../erp/src/pages/types/variation.type';

export type CharacteristicGroupFormData = {
  id?: string;
  name: string;
};

export const createCharacteristicGroupFormSchema = (
  existingGroups: readonly CharacteristicGroup[] = []
) =>
  z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'O nome do grupo é obrigatório.'),
  }).superRefine((group, context) => {
    const normalizedName = group.name.trim().toLocaleLowerCase('pt-BR');
    if (existingGroups.some((item) => item.id !== group.id && item.name.trim().toLocaleLowerCase('pt-BR') === normalizedName)) {
      context.addIssue({ code: 'custom', path: ['name'], message: 'Já existe um grupo com esse nome.' });
    }
  });

export const getInitialCharacteristicGroupFormData = (
  group: CharacteristicGroup | null | undefined
): CharacteristicGroupFormData => ({
  id: group?.id,
  name: group?.name ?? '',
});
