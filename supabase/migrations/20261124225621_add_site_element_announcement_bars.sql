BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE TABLE public.site_element_announcement_bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 240 AND message = btrim(message)),
  background_color text NOT NULL DEFAULT '#173D30' CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text NOT NULL DEFAULT '#FFFFFF' CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_weight smallint NOT NULL DEFAULT 400 CHECK (font_weight IN (400, 500, 600, 700)),
  font_size_px smallint NOT NULL DEFAULT 14 CHECK (font_size_px IN (12, 14, 16, 18, 20)),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_element_announcement_bars_schedule CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at
  )
);

ALTER TABLE public.site_element_announcement_bars ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_element_announcement_bars FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_element_announcement_bars TO authenticated;
GRANT SELECT (id, message, background_color, text_color, font_weight, font_size_px, created_at)
  ON public.site_element_announcement_bars TO anon;

CREATE POLICY site_element_announcement_bars_marketing_access
  ON public.site_element_announcement_bars FOR ALL TO authenticated
  USING ((SELECT public.has_manage_site_elements_permission()))
  WITH CHECK ((SELECT public.has_manage_site_elements_permission()));

CREATE POLICY site_element_announcement_bars_public_current
  ON public.site_element_announcement_bars FOR SELECT TO anon
  USING (
    active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE INDEX site_element_announcement_bars_created_id_idx
  ON public.site_element_announcement_bars (created_at DESC, id);

CREATE TRIGGER site_element_announcement_bars_updated_at
  BEFORE UPDATE ON public.site_element_announcement_bars
  FOR EACH ROW EXECUTE FUNCTION public.touch_site_element_model_updated_at();

COMMENT ON TABLE public.site_element_announcement_bars IS
  'Avisos em texto da barra responsiva do Catálogo Digital, com estilo e período de exibição.';
COMMENT ON COLUMN public.site_element_announcement_bars.message IS
  'Texto do aviso; a fonte é herdada da tipografia padrão do Catálogo Digital.';
COMMENT ON COLUMN public.site_element_announcement_bars.active IS
  'Ativação administrativa independente do período opcional de exibição.';

COMMIT;
