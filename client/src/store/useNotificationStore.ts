import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface Notification {
  id: string;
  type: 'MESSAGE' | 'FRIEND_REQUEST' | 'MENTION' | 'REPLY' | 'SYSTEM';
  title: string;
  content: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

interface NotificationStoreState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Preferences
  mutedChannels: Set<string>;
  mutedServers: Set<string>;
  muteAll: boolean;
  
  // Settings
  enableMentions: boolean;
  enableReplies: boolean;
  enableDMs: boolean;
  enableSounds: boolean;
  
  // Actions
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Preferences
  muteChannel: (channelId: string, duration?: Date) => Promise<void>;
  unmuteChannel: (channelId: string) => Promise<void>;
  muteServer: (serverId: string, duration?: Date) => Promise<void>;
  unmuteServer: (serverId: string) => Promise<void>;
  toggleMuteAll: () => Promise<void>;
  
  // Settings
  updateNotificationSettings: (settings: Partial<{
    enableMentions: boolean;
    enableReplies: boolean;
    enableDMs: boolean;
    enableSounds: boolean;
  }>) => Promise<void>;
  
  // Fetch
  fetchNotifications: () => Promise<void>;
  fetchNotificationSettings: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStoreState>()(
  subscribeWithSelector((set) => ({
    notifications: [],
    unreadCount: 0,
    mutedChannels: new Set(),
    mutedServers: new Set(),
    muteAll: false,
    enableMentions: true,
    enableReplies: true,
    enableDMs: true,
    enableSounds: true,
    
    addNotification: (notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));
    },
    
    removeNotification: (id) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    },
    
    markAsRead: async (id) => {
      try {
        await fetch(`/api/notifications/${id}/read`, {
          method: 'PATCH',
        });
        
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    
    markAllAsRead: async () => {
      try {
        await fetch('/api/notifications/read-all', {
          method: 'PATCH',
        });
        
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    },
    
    muteChannel: async (channelId, duration) => {
      try {
        await fetch(`/api/notifications/mute-channel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, until: duration }),
        });
        
        set((state) => ({
          mutedChannels: new Set([...state.mutedChannels, channelId]),
        }));
      } catch (error) {
        console.error('Failed to mute channel:', error);
      }
    },
    
    unmuteChannel: async (channelId) => {
      try {
        await fetch(`/api/notifications/unmute-channel/${channelId}`, {
          method: 'DELETE',
        });
        
        set((state) => {
          const muted = new Set(state.mutedChannels);
          muted.delete(channelId);
          return { mutedChannels: muted };
        });
      } catch (error) {
        console.error('Failed to unmute channel:', error);
      }
    },
    
    muteServer: async (serverId, duration) => {
      try {
        await fetch(`/api/notifications/mute-server`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverId, until: duration }),
        });
        
        set((state) => ({
          mutedServers: new Set([...state.mutedServers, serverId]),
        }));
      } catch (error) {
        console.error('Failed to mute server:', error);
      }
    },
    
    unmuteServer: async (serverId) => {
      try {
        await fetch(`/api/notifications/unmute-server/${serverId}`, {
          method: 'DELETE',
        });
        
        set((state) => {
          const muted = new Set(state.mutedServers);
          muted.delete(serverId);
          return { mutedServers: muted };
        });
      } catch (error) {
        console.error('Failed to unmute server:', error);
      }
    },
    
    toggleMuteAll: async () => {
      try {
        await fetch('/api/notifications/mute-all', {
          method: 'PATCH',
        });
        
        set((state) => ({
          muteAll: !state.muteAll,
        }));
      } catch (error) {
        console.error('Failed to toggle mute all:', error);
      }
    },
    
    updateNotificationSettings: async (settings) => {
      try {
        await fetch('/api/notifications/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        
        set(settings);
      } catch (error) {
        console.error('Failed to update notification settings:', error);
      }
    },
    
    fetchNotifications: async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        
        set({
          notifications: data.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          })),
          unreadCount: data.filter((n: any) => !n.read).length,
        });
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    },
    
    fetchNotificationSettings: async () => {
      try {
        const res = await fetch('/api/notifications/settings');
        const data = await res.json();
        
        set({
          muteAll: data.muteAll || false,
          mutedChannels: new Set(data.mutedChannels || []),
          mutedServers: new Set(data.mutedServers || []),
          enableMentions: data.mentions ?? true,
          enableReplies: data.replies ?? true,
          enableDMs: data.dms ?? true,
          enableSounds: data.sounds ?? true,
        });
      } catch (error) {
        console.error('Failed to fetch notification settings:', error);
      }
    },
  }))
);
