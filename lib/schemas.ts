import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(2),
  contact: z.string().optional().default(""),
  company: z.string().optional().default(""),
});

export const createServiceSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().nonnegative(),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  role: z.enum(["admin", "manager", "employee"]),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export const createIncomeSchema = z.object({
  client_id: z.string().default(""),
  client_name: z.string().min(2),
  service_id: z.string().default(""),
  service_type: z.string().min(2),
  amount: z.coerce.number().positive(),
  status: z.enum(["Advance", "Paid", "To be paid"]),
  payment_method: z.string().default(""),
  date: z.string().min(4),
  notes: z.string().optional().default(""),
});

export const createExpenseSchema = z.object({
  date: z.string().min(4),
  item: z.string().min(2),
  project: z.string().min(2),
  paid_by: z.string().min(2),
  amount: z.coerce.number().positive(),
  category: z.string().min(2),
  notes: z.string().optional().default(""),
});

export const updateIncomeSchema = createIncomeSchema.partial();
export const updateExpenseSchema = createExpenseSchema.partial();
export const updateClientSchema = createClientSchema.partial();
export const updateServiceSchema = createServiceSchema.partial();
export const updateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    role: z.enum(["admin", "manager", "employee"]).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });
