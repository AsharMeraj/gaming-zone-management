import { db, patch } from '@/store/db';
import { useAuth } from '@/store/auth';
import { uid } from '@/lib/utils';

export const logActivity = (action: string, target: string) => {
  const user = useAuth.getState().user;
  patch({
    logs: [
      { id: uid('log'), userId: user?.id ?? 'system', action, target, createdAt: new Date().toISOString() },
      ...db().logs,
    ],
  });
};

export const getLogs = async () => db().logs;