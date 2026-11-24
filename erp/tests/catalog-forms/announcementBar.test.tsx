import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementBar } from '@/features/announcement-bar';

vi.mock('@/lib/supabase/client', () => ({
  supabaseUrl: 'https://catalog.example',
  supabaseAnonKey: 'public-key',
}));

const notice = {
  message: 'Aviso da vitrine',
  background_color: '#173D30',
  text_color: '#FFFFFF',
  font_weight: 600,
  font_size_px: 14,
  ends_at: null,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('announcement bar in the public catalog', () => {
  it('requests at most one current notice and renders one bar with the saved style', async () => {
    const fetchNotice = vi.fn().mockResolvedValue(Response.json([notice, { ...notice, message: 'Outro aviso' }]));
    vi.stubGlobal('fetch', fetchNotice);

    render(await AnnouncementBar());
    const bar = screen.getByRole('complementary', { name: 'Aviso da loja' });
    expect(bar.textContent).toBe(notice.message);
    expect(bar.style.fontSize).toBe('14px');
    expect(bar.style.fontWeight).toBe('600');
    expect(screen.getAllByRole('complementary')).toHaveLength(1);

    const [url, options] = fetchNotice.mock.calls[0];
    expect(url.pathname).toBe('/rest/v1/site_element_announcement_bars');
    expect(url.searchParams.get('limit')).toBe('1');
    expect(options.cache).toBe('no-store');
  });

  it('renders nothing when the public query has no eligible notice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])));
    render(await AnnouncementBar());
    expect(screen.queryByRole('complementary', { name: 'Aviso da loja' })).toBeNull();
  });

  it('hides an expired notice in the open page without an additional request', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T18:00:00Z'));
    const fetchNotice = vi.fn().mockResolvedValue(Response.json([
      { ...notice, ends_at: '2026-11-24T18:00:01Z' },
    ]));
    vi.stubGlobal('fetch', fetchNotice);

    render(await AnnouncementBar());
    expect(screen.getByRole('complementary', { name: 'Aviso da loja' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.queryByRole('complementary', { name: 'Aviso da loja' })).toBeNull();
    expect(fetchNotice).toHaveBeenCalledOnce();
  });
});
