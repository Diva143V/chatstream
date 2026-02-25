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

export default function App() {
  const { isAuthenticated, refreshUser } = useAuthStore();
  const { fetchServers } = useServerStore();
  const { dmMode } = useUIStore();

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
          // DM / Friends view placeholder
          <div className="flex-1 flex items-center justify-center text-white/30">
            <p>Select a friend to start chatting</p>
          </div>
        ) : (
          <>
            <ChatArea />
            <MembersPanel />
          </>
        )}
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
    </div>
  );
}
