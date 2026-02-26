import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useServerStore } from '@/store/useServerStore';
import { useUIStore } from '@/store/useUIStore';
import { useSocket } from '@/hooks/useSocket';
import { ServerBar } from '@/components/ServerBar';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { MembersPanel } from '@/components/MembersPanel';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { CreateServerModal } from '@/components/modals/CreateServerModal';
import { JoinServerModal } from '@/components/modals/JoinServerModal';
import { AddFriendModal } from '@/components/modals/AddFriendModal';
import { InviteModal } from '@/components/modals/InviteModal';
import { SearchSidebar } from '@/components/SearchSidebar';
import { FriendsList } from '@/components/FriendsList';

export default function App() {
  const { isAuthenticated, refreshUser } = useAuthStore();
  const { fetchServers } = useServerStore();
  const { dmMode, selectedDMId } = useUIStore(); // Added selectedDMId

  // Initialize socket connection
  useSocket();

  // Refresh user and fetch servers on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
      fetchServers();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen flex bg-surface-base overflow-hidden">
      {/* Server sidebar (icon bar) */}
      <ServerBar />

      {/* Channel sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 flex overflow-hidden">
        {dmMode ? (
          selectedDMId ? (
            <ChatArea />
          ) : (
            <FriendsList />
          )
        ) : (
          <>
            <ChatArea />
            <MembersPanel />
          </>
        )}
        <SearchSidebar />
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          },
        }}
      />

      {/* Modals */}
      <SettingsModal />
      <ProfileModal />
      <CreateServerModal />
      <JoinServerModal />
      <AddFriendModal />
      <InviteModal />
    </div>
  );
}
