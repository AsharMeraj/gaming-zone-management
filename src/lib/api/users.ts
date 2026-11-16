import { db, patch } from '@/store/db';
import { useAuth } from '@/store/auth';
import { uid } from '@/lib/utils';
import { logActivity } from './activity';

export const getUsers = async () => db().users;

export const createUser = async (data: { name: string; username: string; password: string; role: Role }) => {
  const username = data.username.trim().toLowerCase();
  if (db().users.some((u) => u.username === username)) throw new Error('Username already taken');
  const user: User = { ...data, username, id: uid('u'), active: true };
  patch({ users: [...db().users, user] });
  logActivity('user.create', `${user.username} (${user.role})`);
};

export const updateUser = async (id: string, data: Partial<Pick<User, 'name' | 'role' | 'password'>>) => {
  patch({ users: db().users.map((u) => (u.id === id ? { ...u, ...data } : u)) });
  logActivity('user.update', id);
};

export const toggleUser = async (id: string) => {
  if (useAuth.getState().user?.id === id) throw new Error("You can't deactivate your own account");
  const u = db().users.find((x) => x.id === id);
  if (!u) throw new Error('User not found');
  patch({ users: db().users.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) });
  logActivity(u.active ? 'user.deactivate' : 'user.activate', u.username);
};