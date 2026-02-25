import { MessageSquare, Plus, Compass, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useServerStore } from '@/store/useServerStore';
import { useUIStore } from '@/store/useUIStore';
import { cn, getStatusColor } from '@/lib/utils';

function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap">
        <div className="bg-surface-overlay text-white text-sm px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-surface-overlay" />
        </div>
      </div>
    </div>
  );
}

export function ServerBar() {
  const { user } = useAuthStore();
  const { servers, selectedServerId, selectServer } = useServerStore();
  const { dmMode, setDMMode } = useUIStore();

  return (
    <aside className="w-[72px] h-full bg-surface-base flex flex-col items-center py-3 gap-2 border-r border-white/5 overflow-y-auto scrollbar-hide flex-shrink-0">
      {/* Logo / DM button */}
      <Tooltip label="Direct Messages">
        <button
          onClick={() => setDMMode(true)}
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group',
            dmMode
              ? 'bg-brand text-white shadow-lg shadow-brand/30'
              : 'bg-surface-raised text-white/60 hover:bg-brand hover:text-white hover:rounded-xl'
          )}
        >
          <Zap className="w-6 h-6" />
        </button>
      </Tooltip>

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Server list */}
      <div className="flex flex-col items-center gap-2 flex-1">
        {servers.map((server) => {
          const isActive = selectedServerId === server.id && !dmMode;
          return (
            <Tooltip key={server.id} label={server.name}>
              <button
                onClick={() => {
                  setDMMode(false);
                  selectServer(server.id);
                }}
                className={cn(
                  'relative w-12 h-12 rounded-2xl overflow-hidden transition-all duration-200',
                  isActive
                    ? 'rounded-xl ring-2 ring-brand ring-offset-2 ring-offset-surface-base'
                    : 'hover:rounded-xl hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-surface-base'
                )}
              >
                {server.icon ? (
                  <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{server.name[0].toUpperCase()}</span>
                  </div>
                )}
                {isActive && <div className="absolute inset-0 bg-brand/10" />}
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Add server */}
      <Tooltip label="Add a Server">
        <button className="w-12 h-12 rounded-2xl bg-surface-raised text-status-online hover:bg-status-online hover:text-white hover:rounded-xl flex items-center justify-center transition-all duration-200">
          <Plus className="w-5 h-5" />
        </button>
      </Tooltip>

      <Tooltip label="Explore Servers">
        <button className="w-12 h-12 rounded-2xl bg-surface-raised text-brand-light hover:bg-brand hover:text-white hover:rounded-xl flex items-center justify-center transition-all duration-200">
          <Compass className="w-5 h-5" />
        </button>
      </Tooltip>

      {/* User avatar */}
      {user && (
        <>
          <div className="w-8 h-px bg-white/10 my-1" />
          <Tooltip label={user.username}>
            <button className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/10 hover:ring-brand transition-all duration-200">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-brand flex items-center justify-center text-white font-bold">
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-base', getStatusColor(user.status))} />
            </button>
          </Tooltip>
        </>
      )}
    </aside>
  );
}
