type Role = 'owner' | 'manager' | 'cashier';
type StationStatus = 'available' | 'occupied' | 'maintenance' | 'unavailable';
type SessionType = 'open' | 'fixed';
type SessionStatus = 'active' | 'paused' | 'completed';
type PaymentStatus = 'unpaid' | 'partial' | 'paid';
type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';

interface Room { id: string; name: string; category: string; capacity: number; description?: string; active: boolean; hourlyRate?: number }
interface Station { id: string; name: string; number: string; roomId: string; platform: string; category: string; hourlyRate?: number; status: StationStatus; notes?: string; active: boolean }
interface Customer { id: string; name: string; phone: string; email?: string; notes?: string; createdAt: string }
interface Session {
  id: string;
  customerId: string | null; // null = walk-in
  stationId: string;
  type: SessionType;
  startedAt: string;
  pausedAt?: string;
  totalPausedMs: number;
  endedAt?: string;
  plannedMinutes?: number; // fixed only
  planName?: string;
  planPrice?: number;
  extensionAmount: number;
  rate: number; // hourly rate, copied at start
  status: SessionStatus;
  discount: number;
  total?: number;
  notes?: string;
  cashierId: string;
  shiftId: string;
  invoiceNo?: string;
}
interface Payment { id: string; sessionId: string; amount: number; method: PaymentMethod; createdAt: string; cashierId: string; shiftId: string }

interface Shift { id: string; cashierId: string; openedAt: string; closedAt?: string; openingCash: number; actualCash?: number; summary?: ShiftSummary; // saved on close, read-only afterwards
}
interface ShiftSummary {
    cash: number;
    card: number;
    bankTransfer: number;
    other: number;
    discounts: number;
    expectedCash: number;
    difference: number;
}
interface ActivityLog { id: string; userId: string; action: string; target: string; createdAt: string }

interface FixedPlan { id: string; name: string; minutes: number; price: number }
interface Pricing { defaultHourly: number; defaultHalfHour: number; plans: FixedPlan[] }
interface Settings { businessName: string; currency: string; receiptFooter: string }

interface User {
  id: string;
  name: string;
  username: string;
  password: string; // mock only, plain text. The real backend must hash it
  role: Role;
  active: boolean;
}

