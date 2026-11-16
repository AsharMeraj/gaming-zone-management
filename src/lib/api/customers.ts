import { db, patch } from '@/store/db';
import { uid } from '@/lib/utils';
import { logActivity } from './activity';

export const getCustomers = async () => db().customers;
export const getCustomer = async (id: string) => db().customers.find((c) => c.id === id) ?? null;

export const createCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>) => {
  const customer: Customer = { ...data, id: uid('c'), createdAt: new Date().toISOString() };
  patch({ customers: [customer, ...db().customers] });
  logActivity('customer.create', customer.name);
  return customer;
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  patch({ customers: db().customers.map((c) => (c.id === id ? { ...c, ...data } : c)) });
  logActivity('customer.update', id);
};

export const getCustomerProfile = async (id: string) => {
  const customer = db().customers.find((c) => c.id === id);
  if (!customer) return null;

  const sessions = db()
    .sessions.filter((s) => s.customerId === id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const sessionIds = new Set(sessions.map((s) => s.id));
  const spent = db()
    .payments.filter((p) => sessionIds.has(p.sessionId))
    .reduce((n, p) => n + p.amount, 0);

  const ms = sessions
    .filter((s) => s.endedAt)
    .reduce(
      (n, s) => n + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime() - s.totalPausedMs),
      0
    );

  return { customer, sessions, stats: { sessions: sessions.length, spent, hours: ms / 3_600_000 } };
};