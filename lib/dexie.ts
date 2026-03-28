import Dexie, { type EntityTable } from 'dexie';
import { Client, Service, User, Income, Expense, AuditLog } from './types';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncOperationRecord {
  id?: number;
  table: string;
  operation: SyncOperation;
  payload: any;
  record_id: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
}

export class FinanceTrackerDB extends Dexie {
  clients!: EntityTable<Client, 'id'>;
  services!: EntityTable<Service, 'id'>;
  users!: EntityTable<User, 'id'>;
  income!: EntityTable<Income, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  audit_logs!: EntityTable<AuditLog, 'id'>;
  syncQueue!: EntityTable<SyncOperationRecord, 'id'>;

  constructor() {
    super('FinanceTrackerDB');
    this.version(1).stores({
      clients: 'id, name, created_at',
      services: 'id, name',
      users: 'id, email, role',
      income: 'id, client_id, date, status',
      expenses: 'id, date, paid_by, category',
      audit_logs: 'id, created_at, actor_email',
      syncQueue: '++id, table, operation, status, timestamp'
    });
  }
}

export const db = new FinanceTrackerDB();
