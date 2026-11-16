import { db } from '@/store/db';

const day = (d: string | Date) => new Date(d).toLocaleDateString('en-CA');

export const getDashboardStats = async () => {
  const { payments, customers, logs, settings } = db();
  const today = day(new Date());

  const sum = (key: string) =>
    payments.filter((p) => day(p.createdAt) === key).reduce((n, p) => n + p.amount, 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), revenue: sum(day(d)) };
  });

  return {
    currency: settings.currency,
    revenueToday: sum(today),
    last7,
    totalCustomers: customers.length,
    newCustomersToday: customers.filter((c) => day(c.createdAt) === today).length,
    recentLogs: logs.slice(0, 10),
  };
};