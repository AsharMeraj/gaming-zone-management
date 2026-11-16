import { db } from '@/store/db';

export const userName = (id: string) => db().users.find((u) => u.id === id)?.name ?? id;