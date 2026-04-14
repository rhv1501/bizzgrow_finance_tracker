-- Initial Schema for Finance Tracker

-- 1. Create tables

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'viewer',
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.income (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    payment_method TEXT,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    item TEXT NOT NULL,
    project TEXT NOT NULL,
    paid_by TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    target_user_id UUID,
    target_user_email TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_income_updated_at
BEFORE UPDATE ON public.income
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create public.users row when auth.users signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'), 'viewer');
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime for standard tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'income'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.income;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;

-- 2. Setup RLS (Row Level Security)

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read everything
CREATE POLICY "Allow authenticated full read access" ON public.clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access" ON public.services FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access" ON public.users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access" ON public.income FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access" ON public.expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access" ON public.audit_logs FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow updates/inserts for admin/staff (Simplified to authenticated for now, API or further precise RLS can handle roles)
-- For a robust app, you would join public.users here, e.g.:
-- USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'staff')))
-- We implement a simple version first to ensure migration success, then can lock it down.
CREATE POLICY "Allow authenticated changes" ON public.clients FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated changes" ON public.services FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated changes" ON public.users FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated changes" ON public.income FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated changes" ON public.expenses FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated changes" ON public.audit_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- Storage bucket RLS policies
CREATE POLICY "Allow public read access on receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Allow authenticated users to upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);
