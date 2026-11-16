import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed, type DB } from '@/lib/seed';

export const useDb = create<DB>()(persist(() => seed, { name: 'gz-db' }));

export const db = () => useDb.getState();
export const patch = (p: Partial<DB>) => useDb.setState(p);