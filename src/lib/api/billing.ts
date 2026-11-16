import { db, patch } from '@/store/db';
import { useAuth } from '@/store/auth';
import { uid } from '@/lib/utils';
import { logActivity } from './activity';

const statusOf = (total: number, paid: number): PaymentStatus =>
  paid <= 0 && total > 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial';

export const getInvoice = async (sessionId: string) => {
  const session = db().sessions.find((s) => s.id === sessionId && s.status === 'completed');
  if (!session) return null;

  const payments = db()
    .payments.filter((p) => p.sessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const paid = payments.reduce((n, p) => n + p.amount, 0);
  const total = session.total ?? 0;
  const station = db().stations.find((s) => s.id === session.stationId);

  return {
    session,
    payments,
    paid,
    total,
    balance: total - paid,
    status: statusOf(total, paid),
    customer: session.customerId ? db().customers.find((c) => c.id === session.customerId) ?? null : null,
    station,
    room: db().rooms.find((r) => r.id === station?.roomId),
    settings: db().settings,
  };
};

export const recordPayment = async (sessionId: string, amount: number, method: PaymentMethod) => {
  const user = useAuth.getState().user;
  if (!user) throw new Error('Not logged in');

  const shift = db().shifts.find((s) => s.cashierId === user.id && !s.closedAt);
  if (!shift) throw new Error('Start a shift first');

  const session = db().sessions.find((s) => s.id === sessionId);
  if (!session || session.status !== 'completed') throw new Error('Invoice not found');

  const paid = db().payments.filter((p) => p.sessionId === sessionId).reduce((n, p) => n + p.amount, 0);
  const balance = (session.total ?? 0) - paid;
  const value = Math.round(amount);

  if (value <= 0) throw new Error('Enter a valid amount');
  if (value > balance) throw new Error(`Amount exceeds balance (${balance})`);

  patch({
    payments: [
      ...db().payments,
      {
        id: uid('pay'),
        sessionId,
        amount: value,
        method,
        createdAt: new Date().toISOString(),
        cashierId: user.id,
        shiftId: shift.id,
      },
    ],
  });
  logActivity('payment.record', `${session.invoiceNo ?? session.id}: ${value} ${method}`);
};