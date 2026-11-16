import { db, patch } from '@/store/db';
import { uid } from '@/lib/utils';
import { logActivity } from './activity';

export const getStations = async () => db().stations;

export const createStation = async (data: Omit<Station, 'id' | 'active' | 'status'>) => {
  const station: Station = { ...data, id: uid('s'), status: 'available', active: true };
  patch({ stations: [...db().stations, station] });
  logActivity('station.create', station.name);
  return station;
};

export const updateStation = async (id: string, data: Partial<Station>) => {
  patch({ stations: db().stations.map((s) => (s.id === id ? { ...s, ...data } : s)) });
  logActivity('station.update', id);
};

export const setStationStatus = async (id: string, status: StationStatus) => {
  patch({ stations: db().stations.map((s) => (s.id === id ? { ...s, status } : s)) });
  logActivity(`station.status.${status}`, id);
};