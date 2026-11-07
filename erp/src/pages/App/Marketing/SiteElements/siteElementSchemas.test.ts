import { describe, expect, it } from 'vitest';
import { SITE_ELEMENT_MAX_FILE_BYTES, siteElementImageFileSchema, siteElementModelFormSchema } from '../../../../../../shared-utils/siteElementSchemas';

const values = () => ({ name: '  Campanha de novembro  ', kind: 'carousel' as const,
  file: new File(['image'], 'banner.png', { type: 'image/png' }), existingImagePath: null, width: 1920, height: 620 });

describe('site element model validation', () => {
  it('requires the name and an image for creation, and trims the persisted name', () => {
    expect(siteElementModelFormSchema.parse(values()).name).toBe('Campanha de novembro');
    expect(siteElementModelFormSchema.safeParse({ ...values(), name: '  ' }).success).toBe(false);
    expect(siteElementModelFormSchema.safeParse({ ...values(), file: null }).success).toBe(false);
  });
  it('requires the standard dimensions for each element and accepts existing images for rename', () => {
    expect(siteElementModelFormSchema.safeParse({ ...values(), width: 1080 }).success).toBe(false);
    expect(siteElementModelFormSchema.safeParse({ ...values(), kind: 'top_bar' }).success).toBe(false);
    expect(siteElementModelFormSchema.safeParse({ ...values(), kind: 'top_bar', height: 80 }).success).toBe(true);
    expect(siteElementModelFormSchema.safeParse({ ...values(), file: null, existingImagePath: 'existing/path.png' }).success).toBe(true);
  });
  it('rejects empty, oversized, SVG, disguised non-file input and unsupported image files', () => {
    for (const file of [new File([], 'empty.png', { type: 'image/png' }),
      new File(['svg'], 'banner.svg', { type: 'image/svg+xml' }),
      new File(['text'], 'banner.txt', { type: 'text/plain' }),
      new File([new Uint8Array(SITE_ELEMENT_MAX_FILE_BYTES + 1)], 'large.png', { type: 'image/png' }),
      { name: 'fake.png', size: 10, type: 'image/png' }, null, undefined]) {
      expect(siteElementImageFileSchema.safeParse(file).success).toBe(false);
    }
  });
});
