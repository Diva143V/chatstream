import { create } from 'zustand';
import type { Server, Channel } from '@/types';
import api from '@/api/axios';

interface ServerStore {
  servers: Server[];
  selectedServerId: string | null;
  selectedChannelId: string | null;
  isLoading: boolean;

  // Computed
  selectedServer: Server | null;
  selectedChannel: Channel | null;

  // Actions
  fetchServers: () => Promise<void>;
  selectServer: (serverId: string | null) => void;
  selectChannel: (channelId: string | null) => void;
  addServer: (server: Server) => void;
  createServer: (name: string, description?: string) => Promise<Server>;
  joinServer: (inviteCode: string) => Promise<Server>;
  updateServer: (serverId: string, updates: Partial<Server>) => void;
  reset: () => void;
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  selectedServerId: null,
  selectedChannelId: null,
  isLoading: false,

  get selectedServer() {
    const { servers, selectedServerId } = get();
    return servers.find((s) => s.id === selectedServerId) ?? null;
  },

  get selectedChannel() {
    const { selectedServer, selectedChannelId } = get();
    return selectedServer?.channels.find((c) => c.id === selectedChannelId) ?? null;
  },

  fetchServers: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<{ servers: Server[] }>('/servers');
      set({ servers: data.servers });

      // Auto-select first server and channel
      const { selectedServerId } = get();
      if (!selectedServerId && data.servers.length > 0) {
        const first = data.servers[0];
        const firstChannel = first.channels.find((c) => c.type === 'TEXT') ?? first.channels[0];
        set({
          selectedServerId: first.id,
          selectedChannelId: firstChannel?.id ?? null,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  selectServer: (serverId) => {
    set({ selectedServerId: serverId });
    if (serverId) {
      const server = get().servers.find((s) => s.id === serverId);
      const firstChannel = server?.channels.find((c) => c.type === 'TEXT') ?? server?.channels[0];
      set({ selectedChannelId: firstChannel?.id ?? null });
    } else {
      set({ selectedChannelId: null });
    }
  },

  selectChannel: (channelId) => set({ selectedChannelId: channelId }),

  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),

  createServer: async (name, description) => {
    const { data } = await api.post<{ server: Server }>('/servers', { name, description });
    set((state) => ({ servers: [...state.servers, data.server] }));
    return data.server;
  },

  joinServer: async (inviteCode) => {
    const { data } = await api.post<{ server: Server }>(`/servers/join/${inviteCode}`);
    set((state) => ({ servers: [...state.servers, data.server] }));
    return data.server;
  },

  updateServer: (serverId, updates) =>
    set((state) => ({
      servers: state.servers.map((s) => (s.id === serverId ? { ...s, ...updates } : s)),
    })),

  reset: () => set({ servers: [], selectedServerId: null, selectedChannelId: null }),
}));
