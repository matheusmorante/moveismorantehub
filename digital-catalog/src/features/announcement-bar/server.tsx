import 'server-only';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/client';
import { AnnouncementExpiry } from './announcement-expiry';

type AnnouncementBarRow = {
  message: string;
  background_color: string;
  text_color: string;
  font_weight: number;
  font_size_px: number;
  ends_at: string | null;
};

async function getStorefrontAnnouncementBar(): Promise<AnnouncementBarRow | null> {
  const url = new URL('/rest/v1/site_element_announcement_bars', supabaseUrl);
  url.searchParams.set('select', 'message,background_color,text_color,font_weight,font_size_px,ends_at');
  url.searchParams.set('limit', '1');
  // RLS returns only the active notice within its display window.
  try {
    const response = await fetch(url, {
      headers: { apikey: supabaseAnonKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const [notice] = await response.json() as AnnouncementBarRow[];
    return notice ?? null;
  } catch {
    return null;
  }
}

export async function AnnouncementBar() {
  const notice = await getStorefrontAnnouncementBar();
  if (!notice) return null;

  const strip = (
    <aside aria-label="Aviso da loja"
      className="min-h-8 w-full px-3 py-2 text-center leading-snug [overflow-wrap:anywhere]"
      style={{
        backgroundColor: notice.background_color,
        color: notice.text_color,
        fontWeight: notice.font_weight,
        fontSize: notice.font_size_px,
      }}>
      {notice.message}
    </aside>
  );

  return notice.ends_at
    ? <AnnouncementExpiry endsAt={notice.ends_at}>{strip}</AnnouncementExpiry>
    : strip;
}
