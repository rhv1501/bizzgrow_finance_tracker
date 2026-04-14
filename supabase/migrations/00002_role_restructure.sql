-- Phase 2: Role Restructuring and Employee Reimbursements

-- 1. Modify trigger to set default role to 'employee'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'), 'employee');
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'employee';
UPDATE public.users SET role = 'employee' WHERE role NOT IN ('admin', 'manager', 'employee');

-- 2. Create Reimbursements table
CREATE TABLE IF NOT EXISTS public.reimbursements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for reimbursement updated_at
CREATE TRIGGER update_reimbursements_updated_at
BEFORE UPDATE ON public.reimbursements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Update Existing RLS Policies to lock out Employees
DROP POLICY IF EXISTS "Allow authenticated full read access" ON public.income;
DROP POLICY IF EXISTS "Allow authenticated full read access" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated full read access" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated full read access" ON public.services;
DROP POLICY IF EXISTS "Allow authenticated full read access" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated full read access" ON public.users;

DROP POLICY IF EXISTS "Allow authenticated changes" ON public.income;
DROP POLICY IF EXISTS "Allow authenticated changes" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated changes" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated changes" ON public.services;
DROP POLICY IF EXISTS "Allow authenticated changes" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated changes" ON public.users;

-- Admin/Manager Core Read (using JWT claims implicitly or checking users table safely)
-- Note: Policy subqueries might impact realtime/performance, but for a 3-role system:
CREATE POLICY "Strict read access" ON public.income FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict read access" ON public.expenses FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict read access" ON public.clients FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict read access" ON public.services FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict read access" ON public.audit_logs FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));

-- Strict change access
CREATE POLICY "Strict change access" ON public.income FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict change access" ON public.expenses FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict change access" ON public.clients FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict change access" ON public.services FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Strict change access" ON public.audit_logs FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));

-- User table management
CREATE POLICY "Strict users access" ON public.users FOR SELECT USING (auth.uid() = id OR auth.uid() IN (SELECT u.id FROM public.users u WHERE u.role IN ('admin', 'manager')));
CREATE POLICY "Admin user changes" ON public.users FOR ALL USING (auth.uid() IN (SELECT u.id FROM public.users u WHERE u.role = 'admin'));

-- 4. Enable Reimbursements RLS
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager manage reimbursements" ON public.reimbursements FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'manager')));
CREATE POLICY "Employee manage own reimbursements" ON public.reimbursements FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for reimbursements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'reimbursements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reimbursements;
  END IF;
END $$;
