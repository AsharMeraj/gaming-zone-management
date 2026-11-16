import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useDb } from './db';

export type LoginResult = 'ok' | 'invalid' | 'deactivated';

interface AuthState {
    user: Omit<User, 'password'> | null;
    login: (username: string, password: string) => LoginResult;
    guestLogin: () => void;
    logout: () => void;
}

export const useAuth = create<AuthState>()(
    persist(
        (set) => ({

            user: null,

            login: (username, password) => {
                const found = useDb
                    .getState()
                    .users.find((u) => u.username === username && u.password === password);
                if (!found) return 'invalid';
                if (!found.active) return 'deactivated';
                const { password: _pw, ...safe } = found;
                set({ user: safe });
                return 'ok';
            },

            guestLogin: () => {
                const owner = useDb.getState().users.find((u) => u.role === 'owner');
                if (!owner) return;
                const { password: _pw, ...safe } = owner;
                set({ user: safe });
            },

            logout: () => set({ user: null }),
            
        }),
        { name: 'gz-auth', skipHydration: true }
    )
);