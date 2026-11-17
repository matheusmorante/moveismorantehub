import { vi } from 'vitest';

export const missingCategoryApplicationsQuery = () => ({
  select: () => ({
    limit: async () => ({
      data: null,
      error: {
        code: 'PGRST205',
        message: 'Could not find table attribute_category_applications',
      },
    }),
  }),
});

export const queryWith = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnValue({
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  }),
});
