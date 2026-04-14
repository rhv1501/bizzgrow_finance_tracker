-- 00003: Fix Infinite Recursion in Row Level Security

-- 1. Create a function that bypasses Row Level Security to securely determine a requesting user's true role.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop the infinitely recursive table policies from 00002.
DROP POLICY IF EXISTS "Strict read access" ON public.income;
DROP POLICY IF EXISTS "Strict read access" ON public.expenses;
DROP POLICY IF EXISTS "Strict read access" ON public.clients;
DROP POLICY IF EXISTS "Strict read access" ON public.services;
DROP POLICY IF EXISTS "Strict read access" ON public.audit_logs;

DROP POLICY IF EXISTS "Strict change access" ON public.income;
DROP POLICY IF EXISTS "Strict change access" ON public.expenses;
DROP POLICY IF EXISTS "Strict change access" ON public.clients;
DROP POLICY IF EXISTS "Strict change access" ON public.services;
DROP POLICY IF EXISTS "Strict change access" ON public.audit_logs;

DROP POLICY IF EXISTS "Strict users access" ON public.users;
DROP POLICY IF EXISTS "Admin user changes" ON public.users;
DROP POLICY IF EXISTS "Admin/Manager manage reimbursements" ON public.reimbursements;

-- 3. Replace them tightly using the SECURITY DEFINER check.
CREATE POLICY "Strict read access" ON public.income FOR SELECT USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict read access" ON public.expenses FOR SELECT USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict read access" ON public.clients FOR SELECT USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict read access" ON public.services FOR SELECT USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict read access" ON public.audit_logs FOR SELECT USING (public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Strict change access" ON public.income FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict change access" ON public.expenses FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict change access" ON public.clients FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict change access" ON public.services FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Strict change access" ON public.audit_logs FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Strict users access" ON public.users FOR SELECT USING (auth.uid() = id OR public.get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Admin user changes" ON public.users FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Admin/Manager manage reimbursements" ON public.reimbursements FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));
