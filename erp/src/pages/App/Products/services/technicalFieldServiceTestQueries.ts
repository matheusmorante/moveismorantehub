import { vi } from 'vitest';

export const createApplicationLinksQuery = (pages: Array<{ data: any[] | null; error: any }> = [
  { data: [], error: null },
]) => {
  const builder = {
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation(async (start: number) =>
      pages[Math.floor(start / 1000)] ?? { data: [], error: null }
    ),
  };
  return { select: vi.fn().mockReturnValue(builder), builder };
};

export const createEmptyApplicationLinksQuery = () => createApplicationLinksQuery();
