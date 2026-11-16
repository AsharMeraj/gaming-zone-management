import { db, patch } from '@/store/db';
import { useAuth } from '@/store/auth';
import { uid } from '@/lib/utils';
import { resolveHourlyRate } from '@/lib/pricing';
import { calcAmount } from '@/lib/session';
import { logActivity } from './activity';

const find = (id: string) => {
    const s = db().sessions.find((x) => x.id === id);
    if (!s) throw new Error('Session not found');
    return s;
};

const update = (id: string, data: Partial<Session>) =>
    patch({ sessions: db().sessions.map((s) => (s.id === id ? { ...s, ...data } : s)) });

export const getSessions = async () => db().sessions;

export type SessionRow = Session & { paid: number; paymentStatus: PaymentStatus };

export const getSessionHistory = async (): Promise<SessionRow[]> =>
    db()
        .sessions.filter((s) => s.status === 'completed')
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map((s) => {
            const paid = db().payments.filter((p) => p.sessionId === s.id).reduce((n, p) => n + p.amount, 0);
            const total = s.total ?? 0;
            const paymentStatus: PaymentStatus = paid <= 0 && total > 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial';
            return { ...s, paid, paymentStatus };
        });

export const startSession = async (input: {
    customerId: string | null;
    stationId: string;
    type: SessionType;
    planId?: string;
    notes?: string;
}) => {
    const user = useAuth.getState().user;
    if (!user) throw new Error('Not logged in');

    const shift = db().shifts.find((s) => s.cashierId === user.id && !s.closedAt);
    if (!shift) throw new Error('Start a shift first');

    const station = db().stations.find((s) => s.id === input.stationId);
    if (!station || !station.active) throw new Error('Station not found');
    if (station.status !== 'available') throw new Error(`Station is ${station.status}`);
    if (db().sessions.some((s) => s.stationId === station.id && s.status !== 'completed')) {
        throw new Error('Station already has an active session');
    }

    const plan = input.type === 'fixed' ? db().pricing.plans.find((p) => p.id === input.planId) : undefined;
    if (input.type === 'fixed' && !plan) throw new Error('Select a plan');

    const room = db().rooms.find((r) => r.id === station.roomId);
    const session: Session = {
        id: uid('ses'),
        customerId: input.customerId,
        stationId: station.id,
        type: input.type,
        startedAt: new Date().toISOString(),
        totalPausedMs: 0,
        plannedMinutes: plan?.minutes,
        planName: plan?.name,
        planPrice: plan?.price,
        extensionAmount: 0,
        rate: resolveHourlyRate(station, room, db().pricing),
        status: 'active',
        discount: 0,
        notes: input.notes || undefined,
        cashierId: user.id,
        shiftId: shift.id,
    };

    patch({
        sessions: [...db().sessions, session],
        stations: db().stations.map((s) => (s.id === station.id ? { ...s, status: 'occupied' } : s)),
    });
    logActivity('session.start', `${session.id} on ${station.name}`);
    return session;
};

export const pauseSession = async (id: string) => {
    const s = find(id);
    if (s.status !== 'active') throw new Error('Session is not running');
    update(id, { status: 'paused', pausedAt: new Date().toISOString() });
    logActivity('session.pause', id);
};

export const resumeSession = async (id: string) => {
    const s = find(id);
    if (s.status !== 'paused' || !s.pausedAt) throw new Error('Session is not paused');
    update(id, {
        status: 'active',
        pausedAt: undefined,
        totalPausedMs: s.totalPausedMs + (Date.now() - new Date(s.pausedAt).getTime()),
    });
    logActivity('session.resume', id);
};

export const extendSession = async (id: string, minutes: number) => {
    const s = find(id);
    if (s.type !== 'fixed' || s.status === 'completed') throw new Error('Only fixed sessions can be extended');
    const amount = Math.ceil((minutes / 60) * s.rate);
    update(id, {
        plannedMinutes: (s.plannedMinutes ?? 0) + minutes,
        extensionAmount: s.extensionAmount + amount,
    });
    logActivity('session.extend', `${id} +${minutes}min (+${amount})`);
};

export const endSession = async (id: string, discount: number) => {
    const s = find(id);
    if (s.status === 'completed') throw new Error('Session already ended');

    const now = Date.now();
    const totalPausedMs = s.pausedAt ? s.totalPausedMs + (now - new Date(s.pausedAt).getTime()) : s.totalPausedMs;
    const ended: Session = { ...s, totalPausedMs, pausedAt: undefined, endedAt: new Date(now).toISOString() };

    const amount = calcAmount(ended, now);
    const clean = Math.min(Math.max(0, Math.round(discount)), amount);

    const invoiceNo = `INV-${String(db().sessions.filter((x) => x.invoiceNo).length + 1).padStart(4, '0')}`;
    update(id, { ...ended, status: 'completed', discount: clean, total: amount - clean, invoiceNo });
    patch({
        stations: db().stations.map((st) =>
            st.id === s.stationId && st.status === 'occupied' ? { ...st, status: 'available' } : st
        ),
    });
    logActivity('session.end', `${id} total ${amount - clean}`);
    if (clean > 0) logActivity('session.discount', `${id}: ${clean}`);
};