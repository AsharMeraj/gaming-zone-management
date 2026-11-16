import { db, patch } from '@/store/db';
import { uid } from '@/lib/utils';
import { logActivity } from './activity';

export const getRooms = async () => db().rooms;

export const createRoom = async (data: Omit<Room, 'id' | 'active'>) => {
  const room: Room = { ...data, id: uid('r'), active: true };
  patch({ rooms: [...db().rooms, room] });
  logActivity('room.create', room.name);
  return room;
};

export const updateRoom = async (id: string, data: Partial<Room>) => {
  patch({ rooms: db().rooms.map((r) => (r.id === id ? { ...r, ...data } : r)) });
  logActivity('room.update', id);
};