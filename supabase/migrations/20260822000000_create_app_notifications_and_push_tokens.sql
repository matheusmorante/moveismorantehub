-- Migration: Real-Time App Notifications & Device Push Tokens

CREATE TABLE IF NOT EXISTS app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'order_created', 'order_edited', 'order_schedule_changed'
    schedule_text TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    order_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and policies
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_notifications' AND policyname = 'Allow anon read/write app_notifications'
    ) THEN
        CREATE POLICY "Allow anon read/write app_notifications" ON app_notifications FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Enable Supabase Realtime for app_notifications and orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'app_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
END $$;

-- Table for device push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Allow anon read/write push_tokens'
    ) THEN
        CREATE POLICY "Allow anon read/write push_tokens" ON push_tokens FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
