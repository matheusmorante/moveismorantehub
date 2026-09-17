--
-- PostgreSQL database dump
--

\restrict KMyEh9EHg055WCO45lFPF1r1sYz0pvpNtL4z1GLibM63LpagRhALjkX9uWTNmnF

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: block_product_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_product_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
--
-- PostgreSQL database dump
--

\restrict KMyEh9EHg055WCO45lFPF1r1sYz0pvpNtL4z1GLibM63LpagRhALjkX9uWTNmnF

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: block_product_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_product_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Não é permitido excluir produtos do banco de dados para preservar o histórico. Utilize o campo active como false para desativar o produto.';
END;
$$;


--
-- Name: fn_generate_sku_prefix(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generate_sku_prefix(p_description text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    first_word TEXT;
    prefix TEXT := '';
BEGIN
    -- Extract first word, trim and replace non-alphabetic/numeric characters
    first_word := split_part(trim(p_description), ' ', 1);
    first_word := regexp_replace(first_word, '[^a-zA-Z0-9]', '', 'g');
    
    IF length(first_word) >= 3 THEN
        prefix := upper(substring(first_word from 1 for 3));
    ELSE
        prefix := upper(rpad(first_word, 3, 'X'));
    END IF;
    
    RETURN prefix;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$$;


--
-- Name: immutable_unaccent(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $_$
    SELECT public.unaccent($1);
$_$;


--
-- Name: is_administrator(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_administrator() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator') $$;


--
-- Name: protect_profile_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.is_administrator()
     AND NEW.role <> 'pending'
     AND lower(coalesce(auth.jwt() ->> 'email', '')) <> 'matheusmorante002@gmail.com' THEN
    RAISE EXCEPTION 'Only administrators can assign roles';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: send_app_notification_push(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_app_notification_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
    is_new_scheduled_order BOOLEAN;
    is_order_cancelled BOOLEAN;
    is_order_updated BOOLEAN;
    messages JSONB;
BEGIN
    is_new_scheduled_order := NEW.type = 'order_created'
        AND lower(coalesce(NEW.order_data->>'status', '')) IN ('scheduled', 'agendado');
    is_order_cancelled := NEW.type = 'order_edited'
        AND lower(coalesce(NEW.order_data->>'status', '')) IN ('cancelled', 'cancelado');
    is_order_updated := NEW.type = 'order_edited';

    SELECT jsonb_agg(jsonb_build_object(
        'to', token,
        'sound', CASE
            WHEN is_new_scheduled_order THEN 'levelup.mp3'
            WHEN is_order_cancelled THEN 'order_cancelled.mp3'
            WHEN is_order_updated THEN 'order_updated.mp3'
            ELSE 'default'
        END,
        'title', NEW.title,
        'body', NEW.message,
        'channelId', CASE
            WHEN is_new_scheduled_order THEN 'morante_scheduled_orders_v2'
            WHEN is_order_cancelled THEN 'morante_order_cancelled_v2'
            WHEN is_order_updated THEN 'morante_order_updated_v2'
            ELSE 'morante_general_v1'
        END,
        'priority', 'high',
        '_displayInForeground', true,
        'data', jsonb_build_object(
            'orderId', NEW.order_id,
            'type', NEW.type,
            'status', NEW.order_data->>'status',
            'scheduleText', NEW.schedule_text
        )
    )) INTO messages
    FROM public.push_tokens
    WHERE token LIKE 'ExponentPushToken[%'
       OR token LIKE 'ExpoPushToken[%';

    IF messages IS NOT NULL THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := jsonb_build_object('Accept', 'application/json', 'Content-Type', 'application/json'),
            body := messages
        );
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: sync_order_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_order_columns() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.order_data IS NOT NULL THEN
    NEW.order_number := NEW.id::text;
    NEW.status := COALESCE(NEW.order_data->>'status', NEW.status);
    NEW.customer_id := NEW.order_data->'customerData'->>'id';
    NEW.customer_name := NEW.order_data->'customerData'->>'fullName';
    NEW.seller_name := NEW.order_data->>'seller';
    
    -- Busca automatica do seller_id a partir da tabela profiles pelo nome completo concatenado
    SELECT id INTO NEW.seller_id FROM public.profiles WHERE LOWER(TRIM(first_name || ' ' || COALESCE(last_name, ''))) = LOWER(NEW.order_data->>'seller') LIMIT 1;

    NEW.items := NEW.order_data->'items';
    NEW.total_amount := COALESCE((NEW.order_data->'paymentsSummary'->>'totalOrderValue')::numeric, 0);
    NEW.payment_method := NEW.order_data->'payments'->0->>'method';
    NEW.channel := COALESCE(NEW.order_data->>'channel', NEW.channel);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trg_auto_generate_sku(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_auto_generate_sku() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INT;
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE '%-' THEN
        v_prefix := fn_generate_sku_prefix(NEW.description);
        
        -- Find next available 6-digit sequence for this prefix
        SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(code from 5 for 6), '[^0-9]', '', 'g'), '')::INT), 0) + 1
        INTO v_next_num
        FROM products
        WHERE code LIKE v_prefix || '-%';
        
        NEW.code := v_prefix || '-' || LPAD(v_next_num::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_payable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    due_date date NOT NULL,
    status text NOT NULL,
    category_id uuid,
    supplier_name text,
    payment_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounts_payable_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text, 'overdue'::text])))
);


--
-- Name: accounts_receivable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_receivable (
    id text DEFAULT gen_random_uuid() NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    due_date date NOT NULL,
    status text NOT NULL,
    category_id text,
    customer_name text,
    order_id text,
    payment_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounts_receivable_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text, 'overdue'::text])))
);


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id text,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    schedule_text text,
    read boolean DEFAULT false NOT NULL,
    order_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assemblies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assemblies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item text NOT NULL,
    date date NOT NULL,
    "time" text DEFAULT '08:00'::text NOT NULL,
    type text DEFAULT 'delivery'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    order_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date timestamp with time zone DEFAULT now(),
    salesperson_name text,
    customer_phone text,
    transcript text,
    audio_url text,
    structured_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attribute_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attribute_id uuid NOT NULL,
    value character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attributes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    active boolean DEFAULT true
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    image_url text NOT NULL,
    link_url text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'category'::text,
    parent_id uuid,
    meta_title text,
    meta_description text,
    seo_description text
);


--
-- Name: category_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_relationships (
    parent_id uuid NOT NULL,
    child_id uuid NOT NULL
);


--
-- Name: customer_desires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_desires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_phone text DEFAULT ''::text,
    customer_name text,
    product_name text DEFAULT ''::text,
    category text,
    details text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: desire_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.desire_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    desire_id uuid,
    product_id uuid,
    notified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: facebook_catalog_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facebook_catalog_settings (
    id boolean DEFAULT true NOT NULL,
    global_description_prefix text DEFAULT ''::text NOT NULL,
    column_mappings jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta_access_token text,
    meta_catalog_id text,
    CONSTRAINT facebook_catalog_settings_id_check CHECK ((id = true))
);


--
-- Name: financial_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT financial_categories_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: financial_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_transactions (
    id text DEFAULT gen_random_uuid() NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    type text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    category_id text,
    payment_method text,
    reference_type text,
    reference_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    payable_id text,
    receivable_id text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT financial_transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: inventory_moves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_moves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id text,
    product_name text,
    variation_id uuid,
    type text,
    quantity numeric DEFAULT 0,
    previous_stock numeric DEFAULT 0,
    new_stock numeric DEFAULT 0,
    reason text,
    order_id text,
    user_name text,
    created_at timestamp with time zone DEFAULT now(),
    unit_price numeric(10,2),
    product_description text,
    date timestamp with time zone DEFAULT now(),
    label text,
    unit_cost numeric(10,2) DEFAULT 0,
    observation text,
    CONSTRAINT inventory_moves_type_check CHECK ((type = ANY (ARRAY['entry'::text, 'exit'::text, 'adjustment'::text])))
);


--
-- Name: label_art_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.label_art_configs (
    layout_id text NOT NULL,
    category text NOT NULL,
    art_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT label_art_configs_category_check CHECK ((category = ANY (ARRAY['identificacao'::text, 'precos'::text, 'logos'::text, 'posts'::text])))
);


--
-- Name: label_layouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.label_layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    columns integer DEFAULT 1 NOT NULL,
    rows integer DEFAULT 1 NOT NULL,
    margin_t numeric DEFAULT 10 NOT NULL,
    margin_b numeric DEFAULT 10 NOT NULL,
    margin_l numeric DEFAULT 10 NOT NULL,
    margin_r numeric DEFAULT 10 NOT NULL,
    gap_h numeric DEFAULT 0 NOT NULL,
    gap_v numeric DEFAULT 0 NOT NULL,
    paper_size text DEFAULT 'A4'::text NOT NULL,
    paper_width numeric,
    paper_height numeric,
    icon text DEFAULT 'bi-square'::text NOT NULL,
    type text DEFAULT 'rect'::text NOT NULL,
    name_font_size numeric DEFAULT 7,
    name_color text DEFAULT '#1e293b'::text,
    price_font_size numeric DEFAULT 11,
    price_color text DEFAULT '#1e293b'::text,
    promo_font_size numeric DEFAULT 9,
    promo_color text DEFAULT '#16a34a'::text,
    name_pos_x numeric DEFAULT 50,
    name_pos_y numeric DEFAULT 30,
    price_pos_x numeric DEFAULT 50,
    price_pos_y numeric DEFAULT 60,
    promo_pos_x numeric DEFAULT 50,
    promo_pos_y numeric DEFAULT 75,
    barcode_pos_x numeric DEFAULT 50,
    barcode_pos_y numeric DEFAULT 90,
    price_font_size_hundreds numeric,
    price_font_size_thousands numeric,
    promo_price_color text DEFAULT '#2563eb'::text,
    old_price_color text DEFAULT '#94a3b8'::text,
    promo_price_font_size numeric DEFAULT 24,
    name_width numeric DEFAULT 80,
    name_height numeric DEFAULT 20,
    name_bold boolean DEFAULT true,
    name_align text DEFAULT 'center'::text,
    name_valign text DEFAULT 'middle'::text,
    price_width numeric DEFAULT 80,
    price_height numeric DEFAULT 30,
    price_bold boolean DEFAULT true,
    price_align text DEFAULT 'center'::text,
    price_valign text DEFAULT 'middle'::text,
    promo_width numeric DEFAULT 80,
    promo_height numeric DEFAULT 40,
    promo_bold boolean DEFAULT true,
    promo_align text DEFAULT 'center'::text,
    promo_valign text DEFAULT 'middle'::text,
    bg_color text DEFAULT '#ffffff'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    promo_price_bold boolean,
    promo_price_align text,
    promo_price_valign text,
    old_price_bold boolean,
    old_price_font_size numeric,
    old_price_align text,
    old_price_valign text,
    name_bg_color text,
    price_bg_color text,
    promo_bg_color text,
    price_format text,
    price_symbol_font_size numeric,
    price_decimals_font_size numeric,
    price_symbol_pos_x numeric,
    price_symbol_pos_y numeric,
    price_decimals_pos_x numeric,
    price_decimals_pos_y numeric,
    price_symbol_color text,
    price_decimals_color text,
    price_symbol_bold boolean,
    price_decimals_bold boolean,
    old_price_pos_x numeric,
    old_price_pos_y numeric,
    old_price_width numeric,
    old_price_height numeric,
    promo_name_pos_x numeric,
    promo_name_pos_y numeric,
    promo_name_font_size numeric,
    promo_name_align text,
    promo_name_valign text,
    promo_name_color text,
    promo_name_bold boolean,
    promo_name_width numeric,
    promo_name_height numeric,
    promo_name_bg_color text,
    promo_barcode_pos_x numeric,
    promo_barcode_pos_y numeric,
    price_font_size_tens text,
    price_font_size_ten_thousands text,
    promo_price_symbol_pos_x numeric,
    promo_price_symbol_pos_y numeric,
    promo_price_symbol_font_size numeric,
    promo_price_symbol_color text,
    promo_price_symbol_bold boolean,
    promo_price_decimals_pos_x numeric,
    promo_price_decimals_pos_y numeric,
    promo_price_decimals_font_size numeric,
    promo_price_decimals_color text,
    promo_price_decimals_bold boolean,
    extra_fields jsonb,
    extra_fields_promo jsonb,
    font_family text,
    image_fit text,
    safety_margin numeric,
    preview_image text,
    base_model_id uuid,
    de_price_por_group_pos_x numeric DEFAULT 0 NOT NULL,
    de_price_por_group_pos_y numeric DEFAULT 0 NOT NULL,
    de_price_por_group_rotation numeric DEFAULT 0 NOT NULL,
    de_price_por_group_gap numeric DEFAULT 10 NOT NULL,
    art_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT label_layouts_category_check CHECK ((category = ANY (ARRAY['identificacao'::text, 'precos'::text, 'logos'::text, 'posts'::text]))),
    CONSTRAINT label_layouts_type_check CHECK ((type = ANY (ARRAY['rect'::text, 'round'::text])))
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    badge_color text DEFAULT 'bg-red-600'::text NOT NULL,
    border_color text DEFAULT 'border-orange-500'::text NOT NULL,
    border_style text DEFAULT 'solid'::text NOT NULL,
    badge_animation text DEFAULT 'pulse'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    observations text,
    title_color text,
    image_url text
);


--
-- Name: COLUMN opportunities.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opportunities.image_url IS 'URL da imagem 4:1 usada como selo da oportunidade nos templates de posts.';


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id text,
    old_status text,
    new_status text,
    changed_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id text DEFAULT gen_random_uuid() NOT NULL,
    order_number text,
    status text DEFAULT 'pending'::text,
    customer_id text,
    customer_name text,
    seller_id text,
    seller_name text,
    items jsonb DEFAULT '[]'::jsonb,
    total_amount numeric(10,2) DEFAULT 0.00,
    payment_method text,
    channel text DEFAULT 'Catálogo Digital'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    order_data jsonb DEFAULT '{}'::jsonb
);


--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people (
    id text DEFAULT gen_random_uuid() NOT NULL,
    person_type text,
    person_type_pf_pj text DEFAULT 'PF'::text,
    full_name text NOT NULL,
    social_name text,
    nickname text,
    cpf_cnpj text,
    rg_ie text,
    email text,
    phone text,
    observation text,
    "position" text,
    active boolean DEFAULT true,
    is_draft boolean DEFAULT false,
    lead_time integer,
    deleted boolean DEFAULT false,
    marketing_origin text,
    full_address jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    address text,
    deleted_at timestamp with time zone
);


--
-- Name: product_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    visitor_id text NOT NULL,
    ip_address text,
    country text,
    region text,
    city text,
    referer text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    image_url text NOT NULL,
    is_main boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_materials (
    id bigint NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.product_materials ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.product_materials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_price_history (

CREATE TRIGGER trg_sync_order_columns BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_columns();


--
-- Name: products trigger_block_product_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_block_product_delete BEFORE DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.block_product_delete();


--
-- Name: accounts_payable accounts_payable_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.financial_categories(id);


--
-- Name: attribute_values attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: category_relationships category_relationships_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_relationships
    ADD CONSTRAINT category_relationships_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_relationships category_relationships_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_relationships
    ADD CONSTRAINT category_relationships_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: desire_matches desire_matches_desire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desire_matches
    ADD CONSTRAINT desire_matches_desire_id_fkey FOREIGN KEY (desire_id) REFERENCES public.customer_desires(id) ON DELETE CASCADE;


--
-- Name: desire_matches desire_matches_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desire_matches
    ADD CONSTRAINT desire_matches_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_analytics product_analytics_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_price_history product_price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variations product_variations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations
    ADD CONSTRAINT product_variations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products products_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;


--
-- Name: products products_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: store_style_settings Admin gerencia as configurações de estilo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia as configurações de estilo" ON public.store_style_settings USING ((auth.email() = 'matheusmorante002@gmail.com'::text)) WITH CHECK ((auth.email() = 'matheusmorante002@gmail.com'::text));


--
-- Name: facebook_catalog_settings Admin gerencia configurações do catálogo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia configurações do catálogo" ON public.facebook_catalog_settings USING ((auth.email() = 'matheusmorante002@gmail.com'::text)) WITH CHECK ((auth.email() = 'matheusmorante002@gmail.com'::text));


--
-- Name: materials Admin gerencia materiais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia materiais" ON public.materials USING ((auth.email() = 'matheusmorante002@gmail.com'::text));


--
-- Name: opportunities Admin gerencia oportunidades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia oportunidades" ON public.opportunities USING ((auth.email() = 'matheusmorante002@gmail.com'::text));


--
-- Name: profiles Administrators delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Administrators delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_administrator());


--
-- Name: settings Administrators manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Administrators manage settings" ON public.settings TO authenticated USING (public.is_administrator()) WITH CHECK (public.is_administrator());


--
-- Name: rede_config Admins can manage rede_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage rede_config" ON public.rede_config USING (true);


--
-- Name: inventory_moves Allow all access to inventory_moves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to inventory_moves" ON public.inventory_moves USING (true) WITH CHECK (true);


--
-- Name: purchases Allow all access to purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to purchases" ON public.purchases USING (true) WITH CHECK (true);


--
-- Name: assemblies Allow all assemblies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all assemblies" ON public.assemblies USING (true) WITH CHECK (true);


--
-- Name: showroom_assemblies Allow all on showroom_assemblies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all on showroom_assemblies" ON public.showroom_assemblies USING (true) WITH CHECK (true);


--
-- Name: showcase_assemblies Allow all showcase; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all showcase" ON public.showcase_assemblies USING (true) WITH CHECK (true);


--
-- Name: showroom_assemblies Allow all showroom; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all showroom" ON public.showroom_assemblies USING (true) WITH CHECK (true);


--
-- Name: app_notifications Allow anon read/write app_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon read/write app_notifications" ON public.app_notifications USING (true) WITH CHECK (true);


--
-- Name: push_tokens Allow anon read/write push_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon read/write push_tokens" ON public.push_tokens USING (true) WITH CHECK (true);


--
-- Name: label_layouts Allow authenticated users to delete label layouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to delete label layouts" ON public.label_layouts FOR DELETE TO authenticated USING (true);


--
-- Name: label_layouts Allow authenticated users to insert label layouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert label layouts" ON public.label_layouts FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: label_layouts Allow authenticated users to read label layouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to read label layouts" ON public.label_layouts FOR SELECT TO authenticated USING (true);


--
-- Name: label_layouts Allow authenticated users to update label layouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update label layouts" ON public.label_layouts FOR UPDATE TO authenticated USING (true);


--
-- Name: label_art_configs Allow public users to insert label art configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public users to insert label art configs" ON public.label_art_configs FOR INSERT WITH CHECK (true);


--
-- Name: label_art_configs Allow public users to read label art configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public users to read label art configs" ON public.label_art_configs FOR SELECT USING (true);


--
-- Name: label_art_configs Allow public users to update label art configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public users to update label art configs" ON public.label_art_configs FOR UPDATE USING (true);


--
-- Name: settings Anyone can read settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);


--
-- Name: orders Atualizacao permissiva orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Atualizacao permissiva orders" ON public.orders FOR UPDATE USING (true);


--
-- Name: people Atualizacao permissiva people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Atualizacao permissiva people" ON public.people FOR UPDATE USING (true);


--
-- Name: profiles Authenticated users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (((id = auth.uid()) OR public.is_administrator()));


--
-- Name: profiles Authenticated users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.is_administrator()));


--
-- Name: accounts_payable Escrita permissiva accounts_payable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita permissiva accounts_payable" ON public.accounts_payable FOR INSERT WITH CHECK (true);


--
-- Name: accounts_receivable Escrita permissiva accounts_receivable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita permissiva accounts_receivable" ON public.accounts_receivable FOR INSERT WITH CHECK (true);


--
-- Name: financial_categories Escrita permissiva financial_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita permissiva financial_categories" ON public.financial_categories FOR INSERT WITH CHECK (true);


--
-- Name: financial_transactions Escrita permissiva financial_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita permissiva financial_transactions" ON public.financial_transactions FOR INSERT WITH CHECK (true);


--
-- Name: inventory_moves Escrita permissiva inventory_moves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita permissiva inventory_moves" ON public.inventory_moves FOR INSERT WITH CHECK (true);


--
-- Name: orders Escrita permissiva orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita permissiva orders" ON public.orders FOR INSERT WITH CHECK (true);


--
-- Name: people Escrita permissiva people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita permissiva people" ON public.people FOR INSERT WITH CHECK (true);


--
-- Name: product_images Gestão total de imagens para admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Gestão total de imagens para admin" ON public.product_images USING (true) WITH CHECK (true);


--
-- Name: accounts_payable Leitura permissiva accounts_payable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura permissiva accounts_payable" ON public.accounts_payable FOR SELECT USING (true);


--
-- Name: accounts_receivable Leitura permissiva accounts_receivable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura permissiva accounts_receivable" ON public.accounts_receivable FOR SELECT USING (true);


--
-- Name: financial_categories Leitura permissiva financial_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura permissiva financial_categories" ON public.financial_categories FOR SELECT USING (true);


--
-- Name: financial_transactions Leitura permissiva financial_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura permissiva financial_transactions" ON public.financial_transactions FOR SELECT USING (true);


--
-- Name: inventory_moves Leitura permissiva inventory_moves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura permissiva inventory_moves" ON public.inventory_moves FOR SELECT USING (true);


--
-- Name: orders Leitura permissiva orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura permissiva orders" ON public.orders FOR SELECT USING (true);


--
-- Name: people Leitura permissiva people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura permissiva people" ON public.people FOR SELECT USING (true);


--
-- Name: store_style_settings Leitura pública das configurações de estilo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública das configurações de estilo" ON public.store_style_settings FOR SELECT USING (true);


--
-- Name: facebook_catalog_settings Leitura pública das configurações do catálogo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública das configurações do catálogo" ON public.facebook_catalog_settings FOR SELECT USING (true);


--
-- Name: product_images Leitura pública de imagens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de imagens" ON public.product_images FOR SELECT USING (true);


--
-- Name: materials Leitura pública de materiais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de materiais" ON public.materials FOR SELECT USING (true);


--
-- Name: opportunities Leitura pública de oportunidades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de oportunidades" ON public.opportunities FOR SELECT USING (true);


--
-- Name: attendance_logs Permitir full attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir full attendance" ON public.attendance_logs TO authenticated USING (true) WITH CHECK (true);


--
-- Name: customer_desires Permitir full desires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir full desires" ON public.customer_desires TO authenticated USING (true) WITH CHECK (true);


--
-- Name: order_status_history Permitir full history status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir full history status" ON public.order_status_history TO authenticated USING (true) WITH CHECK (true);


--
-- Name: desire_matches Permitir full matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir full matches" ON public.desire_matches TO authenticated USING (true) WITH CHECK (true);


--
-- Name: product_price_history Permitir full price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir full price history" ON public.product_price_history TO authenticated USING (true) WITH CHECK (true);


--
-- Name: categories Permitir gestão de categorias para autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir gestão de categorias para autenticados" ON public.categories TO authenticated USING (true) WITH CHECK (true);


--
-- Name: product_images Permitir gestão de imagens para autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir gestão de imagens para autenticados" ON public.product_images TO authenticated USING (true) WITH CHECK (true);


--
-- Name: products Permitir gestão de produtos para autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir gestão de produtos para autenticados" ON public.products TO authenticated USING (true) WITH CHECK (true);


--
-- Name: category_relationships Permitir gestão de relacionamentos para autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir gestão de relacionamentos para autenticados" ON public.category_relationships TO authenticated USING (true) WITH CHECK (true);


--
-- Name: product_analytics Permitir inserções públicas anônimas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir inserções públicas anônimas" ON public.product_analytics FOR INSERT WITH CHECK (true);


--
-- Name: product_analytics Permitir leitura para administradores autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura para administradores autenticados" ON public.product_analytics FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: categories Permitir leitura pública de categorias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura pública de categorias" ON public.categories FOR SELECT USING (true);


--
-- Name: product_images Permitir leitura pública de imagens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura pública de imagens" ON public.product_images FOR SELECT USING (true);


--
-- Name: products Permitir leitura pública de produtos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura pública de produtos" ON public.products FOR SELECT USING (true);


--
-- Name: category_relationships Permitir leitura pública de relacionamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura pública de relacionamentos" ON public.category_relationships FOR SELECT USING (true);


--
-- Name: profiles Users update own profile or administrators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own profile or administrators" ON public.profiles FOR UPDATE TO authenticated USING (((id = auth.uid()) OR public.is_administrator())) WITH CHECK (((id = auth.uid()) OR public.is_administrator()));


--
-- Name: rede_transactions View transaction logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View transaction logs" ON public.rede_transactions FOR SELECT USING (true);


--
-- Name: accounts_payable; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variations allow_all_product_variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all_product_variations ON public.product_variations USING (true) WITH CHECK (true);


--
-- Name: products allow_all_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all_products ON public.products USING (true) WITH CHECK (true);


--
-- Name: product_categories allow_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_delete ON public.product_categories FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: product_variations allow_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_delete ON public.product_variations FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: attributes allow_delete_attr; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_delete_attr ON public.attributes FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: attribute_values allow_delete_val; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_delete_val ON public.attribute_values FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: product_categories allow_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_insert ON public.product_categories FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: product_variations allow_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_insert ON public.product_variations FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: attributes allow_insert_attr; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_insert_attr ON public.attributes FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: attribute_values allow_insert_val; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_insert_val ON public.attribute_values FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: attributes allow_public_all_attr; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_all_attr ON public.attributes USING (true) WITH CHECK (true);


--
-- Name: attribute_values allow_public_all_val; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_all_val ON public.attribute_values USING (true) WITH CHECK (true);


--
-- Name: product_variations allow_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_select ON public.product_variations FOR SELECT USING (true);


--
-- Name: products allow_public_select_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_select_products ON public.products FOR SELECT USING (true);


--
-- Name: product_variations allow_public_select_variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_select_variations ON public.product_variations FOR SELECT USING (true);


--
-- Name: product_variations allow_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_select ON public.product_variations FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: attributes allow_select_attr; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_select_attr ON public.attributes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: attribute_values allow_select_val; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_select_val ON public.attribute_values FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: product_categories allow_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_update ON public.product_categories FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: product_variations allow_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_update ON public.product_variations FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: attributes allow_update_attr; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_update_attr ON public.attributes FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: attribute_values allow_update_val; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_update_val ON public.attribute_values FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: app_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: assemblies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: attribute_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;

--
-- Name: attributes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

--
-- Name: banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: category_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.category_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_desires; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_desires ENABLE ROW LEVEL SECURITY;

--
-- Name: desire_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.desire_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: facebook_catalog_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facebook_catalog_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_moves; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_moves ENABLE ROW LEVEL SECURITY;

--
-- Name: label_art_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.label_art_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: label_layouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.label_layouts ENABLE ROW LEVEL SECURITY;

--
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- Name: push_tokens mobile_can_manage_push_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobile_can_manage_push_tokens ON public.push_tokens TO anon USING (true) WITH CHECK (true);


--
-- Name: opportunities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

--
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: people; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

--
-- Name: product_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: product_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: product_price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: product_categories public_can_select_product_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_can_select_product_categories ON public.product_categories FOR SELECT USING (true);


--
-- Name: purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: push_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: rede_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rede_config ENABLE ROW LEVEL SECURITY;

--
-- Name: rede_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rede_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: showcase_assemblies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.showcase_assemblies ENABLE ROW LEVEL SECURITY;

--
-- Name: showroom_assemblies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.showroom_assemblies ENABLE ROW LEVEL SECURITY;

--
-- Name: store_style_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_style_settings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict KMyEh9EHg055WCO45lFPF1r1sYz0pvpNtL4z1GLibM63LpagRhALjkX9uWTNmnF
