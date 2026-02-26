import { create } from 'zustand';

interface UIStore {
  // Panels
  sidebarOpen: boolean;
  membersPanelOpen: boolean;

  // Modals
  showSettings: boolean;
  settingsTab: 'account' | 'privacy' | 'notifications' | 'appearance';
  profileUserId: string | null;
  showCreateServer: boolean;
  showJoinServer: boolean;
  showAddFriend: boolean;

  // DMs
  selectedDMId: string | null;
  dmMode: boolean; // true when viewing DMs/friends

  // Typing indicators: channelId -> username[]
  typingUsers: Record<string, string[]>;

  // Actions
  toggleSidebar: () => void;
  toggleMembersPanel: () => void;
  openSettings: (tab?: UIStore['settingsTab']) => void;
  closeSettings: () => void;
  openProfile: (userId: string) => void;
  closeProfile: () => void;
  toggleCreateServer: (show?: boolean) => void;
  toggleJoinServer: (show?: boolean) => void;
  toggleAddFriend: (show?: boolean) => void;
  setDMMode: (on: boolean, dmId?: string | null) => void;
  setTyping: (channelId: string, username: string, isTyping: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  membersPanelOpen: true,
  showSettings: false,
  settingsTab: 'account',
  profileUserId: null,
  showCreateServer: false,
  showJoinServer: false,
  showAddFriend: false,
  selectedDMId: null,
  dmMode: false,
  typingUsers: {},

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleMembersPanel: () => set((s) => ({ membersPanelOpen: !s.membersPanelOpen })),

  openSettings: (tab = 'account') => set({ showSettings: true, settingsTab: tab }),
  closeSettings: () => set({ showSettings: false }),

  openProfile: (userId) => set({ profileUserId: userId }),
  closeProfile: () => set({ profileUserId: null }),

  toggleCreateServer: (show) => set((s) => ({ showCreateServer: show ?? !s.showCreateServer })),
  toggleJoinServer: (show) => set((s) => ({ showJoinServer: show ?? !s.showJoinServer })),
  toggleAddFriend: (show) => set((s) => ({ showAddFriend: show ?? !s.showAddFriend })),

  setDMMode: (on, dmId = null) => set({ dmMode: on, selectedDMId: dmId }),

  setTyping: (channelId, username, isTyping) =>
    set((state) => {
      const current = state.typingUsers[channelId] ?? [];
      const updated = isTyping
        ? current.includes(username) ? current : [...current, username]
        : current.filter((u) => u !== username);
      return { typingUsers: { ...state.typingUsers, [channelId]: updated } };
    }),
}));
