import { describe, expect, it } from 'vitest';
import { SITE_ANNOUNCEMENT_MAX_LENGTH, SITE_ELEMENT_MAX_FILE_BYTES, siteElementAnnouncementFormSchema, siteElementCarouselFormSchema, siteElementImageFileSchema, siteElementLinkSchema, siteElementModelFormSchema } from '../../../../../../shared-utils/siteElementSchemas';

const image = (name: string, width: number, height: number) => ({
  file: new File(['image'], `${name}.png`, { type: 'image/png' }), existingImagePath: null, width, height,
});
const values = () => ({
  name: '  Campanha de novembro  ', kind: 'carousel' as const,
  ...image('desktop', 1920, 600), tablet: image('tablet', 1200, 600), mobile: image('mobile', 800, 800),
});
const topBarValues = () => ({ kind: 'top_bar' as const, message: 'Compre em até 10x sem juros!',
  backgroundColor: '#173D30', textColor: '#FFFFFF', fontWeight: '400' as const, fontSizePx: '14' as const, startsAt: '', endsAt: '' });

describe('site element model validation', () => {
  it('accepts optional catalog destinations and rejects unsafe or malformed links', () => {
    expect(siteElementLinkSchema.parse('  /?type=salvados#produtos  ')).toBe('/?type=salvados#produtos');
    expect(siteElementLinkSchema.parse('https://exemplo.com/promocoes')).toBe('https://exemplo.com/promocoes');
    expect(siteElementLinkSchema.parse('')).toBe('');
    for (const link of ['javascript:alert(1)', 'data:text/html,example', '//exemplo.com', '/\\exemplo.com',
      'https:///exemplo.com', 'https://user@exemplo.com', 'http://', '/com espaço', '/' + 'a'.repeat(2048)]) {
      expect(siteElementLinkSchema.safeParse(link).success).toBe(false);
    }
  });
  it('requires the name and all three images for carousel creation and trims the name', () => {
    expect(siteElementCarouselFormSchema.parse(values()).name).toBe('Campanha de novembro');
    expect(siteElementModelFormSchema.safeParse({ ...values(), name: '  ' }).success).toBe(false);
    expect(siteElementModelFormSchema.safeParse({ ...values(), file: null }).success).toBe(false);
    expect(siteElementModelFormSchema.safeParse({ ...values(), tablet: undefined }).success).toBe(false);
    expect(siteElementModelFormSchema.safeParse({ ...values(), mobile: undefined }).success).toBe(false);
  });
  it('requires standard carousel dimensions and keeps legacy carousel models editable', () => {
    expect(siteElementModelFormSchema.safeParse({ ...values(), width: 1080 }).success).toBe(false);
    const carousel = values();
    expect(siteElementModelFormSchema.safeParse({ ...carousel, height: 620 }).success).toBe(false);
    expect(siteElementModelFormSchema.safeParse({ ...carousel, mobile: { ...carousel.mobile, height: 600 } }).success).toBe(false);
    const legacy = { ...values(), height: 620, file: null, existingImagePath: 'existing/path.png', tablet: undefined, mobile: undefined };
    expect(siteElementModelFormSchema.safeParse(legacy).success).toBe(true);
    expect(siteElementModelFormSchema.safeParse({ ...legacy, mobile: carousel.mobile }).success).toBe(false);
    expect(siteElementAnnouncementFormSchema.parse(topBarValues()).message).toBe('Compre em até 10x sem juros!');
    expect(siteElementAnnouncementFormSchema.parse({ ...topBarValues(), message: '  Aviso  ' }).message).toBe('Aviso');
    expect(siteElementAnnouncementFormSchema.safeParse({ ...topBarValues(), message: '' }).success).toBe(false);
    expect(siteElementAnnouncementFormSchema.safeParse({ ...topBarValues(), message: 'x'.repeat(SITE_ANNOUNCEMENT_MAX_LENGTH + 1) }).success).toBe(false);
    expect(siteElementAnnouncementFormSchema.safeParse({ ...topBarValues(), backgroundColor: 'verde' }).success).toBe(false);
    expect(siteElementAnnouncementFormSchema.safeParse({ ...topBarValues(), fontWeight: '900' }).success).toBe(false);
    expect(siteElementAnnouncementFormSchema.safeParse({ ...topBarValues(), fontSizePx: '24' }).success).toBe(false);
    expect(siteElementAnnouncementFormSchema.safeParse({ ...topBarValues(), startsAt: '2026-11-24T14:00', endsAt: '2026-11-24T13:00' }).success).toBe(false);
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
