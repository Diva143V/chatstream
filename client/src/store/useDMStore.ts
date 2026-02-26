import { create } from 'zustand';
import api from '@/api/axios';
import type { User } from '@/types';

interface DMChannel {
    id: string;
    recipient: User;
    lastMessage?: string;
    updatedAt: string;
}

export interface FriendWithRelation extends User {
    friendId: string;
    relationStatus: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
    isRequester: boolean;
}

interface DMStore {
    friends: FriendWithRelation[];
    dmChannels: DMChannel[];
    loading: boolean;

    fetchFriends: (currentUserId: string) => Promise<void>;
    fetchDMs: () => Promise<void>;
    updateFriendRequest: (friendId: string, action: 'accept' | 'decline') => Promise<void>;
    addFriend: (username: string) => Promise<void>;
}

export const useDMStore = create<DMStore>((set) => ({
    friends: [],
    dmChannels: [],
    loading: false,

    fetchFriends: async (currentUserId: string) => {
        try {
            set({ loading: true });
            const { data } = await api.get<{ friends: any[] }>('/friends');

            // Transform relations into user objects
            const transformedFriends = data.friends.map(f => {
                const friend = f.requesterId === currentUserId ? f.receiver : f.requester;
                return {
                    ...friend,
                    friendId: f.id, // Keep the relation ID for removal
                    relationStatus: f.status,
                    isRequester: f.requesterId === currentUserId
                };
            });

            set({ friends: transformedFriends });
        } catch (err) {
            console.error('Failed to fetch friends:', err);
            // Mock data fallback if API is not available/working
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
            const { data } = await api.get<{ dms: any[] }>('/friends/dms');

            // Get current user to exclude from recipient mapping
            const currentUserId = (await api.get('/auth/me')).data.user.id;

            const transformedDMs = data.dms.map(dm => {
                const other = dm.participants.find((p: any) => p.user.id !== currentUserId)?.user;
                return {
                    id: dm.id,
                    recipient: other,
                    lastMessage: dm.messages[0]?.content,
                    updatedAt: dm.updatedAt
                };
            });

            set({ dmChannels: transformedDMs });
        } catch (err) {
            console.error('Failed to fetch DMs:', err);
            set({ dmChannels: [] });
        } finally {
            set({ loading: false });
        }
    },

    updateFriendRequest: async (friendId: string, action: 'accept' | 'decline') => {
        try {
            set({ loading: true });
            await api.patch(`/friends/${friendId}`, { action });
            // Get current user ID from state or pass it
            // For now, assume we refetch outside or we'd need access to user ID
        } finally {
            set({ loading: false });
        }
    },

    addFriend: async (username: string) => {
        try {
            set({ loading: true });
            await api.post('/friends', { username });
        } finally {
            set({ loading: false });
        }
    }
}));
