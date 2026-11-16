import { db, patch } from '@/store/db';
import { logActivity } from './activity';

export const getSettings = async () => db().settings;

export const updateSettings = async (data: Settings) => {
  patch({ settings: data });
  logActivity('settings.update', data.businessName);
};