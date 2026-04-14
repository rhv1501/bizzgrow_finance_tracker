-- Add expense-related columns to reimbursements table
ALTER TABLE public.reimbursements ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE NOT NULL;
ALTER TABLE public.reimbursements ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'Internal' NOT NULL;
ALTER TABLE public.reimbursements ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Reimbursement' NOT NULL;
