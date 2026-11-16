import { db, patch } from '@/store/db';
import { uid } from '@/lib/utils';
import { logActivity } from './activity';

const calcSummary = (shift: Shift, actualCash?: number): ShiftSummary => {
  const pays = db().payments.filter((p) => p.shiftId === shift.id);
  const sum = (m: PaymentMethod) =>
    pays.filter((p) => p.method === m).reduce((n, p) => n + p.amount, 0);
  const discounts = db()
    .sessions.filter((s) => s.shiftId === shift.id)
    .reduce((n, s) => n + s.discount, 0);
  const cash = sum('cash');
  const expectedCash = shift.openingCash + cash;
  return {
    cash,
    card: sum('card'),
    bankTransfer: sum('bank_transfer'),
    other: sum('other'),
    discounts,
    expectedCash,
    difference: (actualCash ?? expectedCash) - expectedCash,
  };
};

export type ShiftRow = Shift & { summary: ShiftSummary };

export const getShifts = async (): Promise<ShiftRow[]> =>
  [...db().shifts]
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .map((s) => ({ ...s, summary: s.summary ?? calcSummary(s) }));

export const getOpenShift = async (cashierId: string) =>
  db().shifts.find((s) => s.cashierId === cashierId && !s.closedAt) ?? null;

export const openShift = async (cashierId: string, openingCash: number) => {
  if (db().shifts.some((s) => s.cashierId === cashierId && !s.closedAt)) {
    throw new Error('You already have an open shift');
  }
  const shift: Shift = {
    id: uid('sh'),
    cashierId,
    openedAt: new Date().toISOString(),
    openingCash,
  };
  patch({ shifts: [...db().shifts, shift] });
  logActivity('shift.open', shift.id);
  return shift;
};

export const closeShift = async (id: string, actualCash: number) => {
  const shift = db().shifts.find((s) => s.id === id);
  if (!shift || shift.closedAt) throw new Error('Shift not found or already closed');

  const busy = db().sessions.some((s) => s.shiftId === id && s.status !== 'completed');
  if (busy) throw new Error('End all active sessions before closing the shift');

  const summary = calcSummary(shift, actualCash);
  patch({
    shifts: db().shifts.map((s) =>
      s.id === id ? { ...s, closedAt: new Date().toISOString(), actualCash, summary } : s
    ),
  });
  logActivity('shift.close', `${id} (diff ${summary.difference})`);
};