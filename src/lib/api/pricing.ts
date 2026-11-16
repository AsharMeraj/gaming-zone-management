import { db, patch } from '@/store/db';
import { uid } from '@/lib/utils';
import { logActivity } from './activity';

export const getPricing = async () => db().pricing;

export const updateDefaults = async (defaultHourly: number, defaultHalfHour: number) => {
  patch({ pricing: { ...db().pricing, defaultHourly, defaultHalfHour } });
  logActivity('pricing.defaults', `${defaultHourly}/${defaultHalfHour}`);
};

export const createPlan = async (data: Omit<FixedPlan, 'id'>) => {
  const plan: FixedPlan = { ...data, id: uid('p') };
  patch({ pricing: { ...db().pricing, plans: [...db().pricing.plans, plan] } });
  logActivity('pricing.plan.create', plan.name);
};

export const updatePlan = async (id: string, data: Partial<FixedPlan>) => {
  const p = db().pricing;
  patch({ pricing: { ...p, plans: p.plans.map((x) => (x.id === id ? { ...x, ...data } : x)) } });
  logActivity('pricing.plan.update', id);
};

export const deletePlan = async (id: string) => {
  const p = db().pricing;
  patch({ pricing: { ...p, plans: p.plans.filter((x) => x.id !== id) } });
  logActivity('pricing.plan.delete', id);
};