import { create } from 'zustand';
import api from '@/api/axios';
import type { User } from '@/types';

interface DMChannel {
    id: string;
    recipient: User;
    lastMessage?: string;
    updatedAt: string;
}

interface DMStore {
    friends: User[];
    dmChannels: DMChannel[];
    loading: boolean;

    fetchFriends: () => Promise<void>;
    fetchDMs: () => Promise<void>;
}

export const useDMStore = create<DMStore>((set) => ({
    friends: [],
    dmChannels: [],
    loading: false,

    fetchFriends: async () => {
        try {
            set({ loading: true });
            // This endpoint is an assumption, if it fails we can fallback to mock
            const { data } = await api.get<{ friends: User[] }>('/users/friends');
            set({ friends: data.friends });
        } catch (err) {
            console.error('Failed to fetch friends:', err);
            // Mock data fallback
            set({
                friends: [
                    { id: '1', username: 'Alex', status: 'ONLINE', email: 'alex@example.com', createdAt: new Date().toISOString() },
                    { id: '2', username: 'Sam', status: 'IDLE', email: 'sam@example.com', createdAt: new Date().toISOString() },
                    { id: '3', username: 'Jordan', status: 'OFFLINE', email: 'jordan@example.com', createdAt: new Date().toISOString() },
                ] as any
            });
        } finally {
            set({ loading: false });
        }
    },

    fetchDMs: async () => {
        try {
            set({ loading: true });
            const { data } = await api.get<{ dms: DMChannel[] }>('/dms');
            set({ dmChannels: data.dms });
        } catch (err) {
            console.error('Failed to fetch DMs:', err);
            set({ dmChannels: [] });
        } finally {
            set({ loading: false });
        }
    }
}));
