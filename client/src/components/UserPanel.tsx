import { useState, useRef, useEffect } from 'react';
import { Settings, User, LogOut, Mic, Headphones } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { cn, getStatusColor } from '@/lib/utils';

export function UserPanel() {
  const { user, logout } = useAuthStore();
  const { openSettings, openProfile } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="p-2 bg-surface-base border-t border-white/5 relative" ref={menuRef}>
      {/* User Menu Dropdown */}
      {menuOpen && (
        <div className="absolute bottom-full left-2 right-2 mb-2 bg-surface-raised rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up z-50">
          <button
            onClick={() => { openProfile(user.id); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors"
          >
            <User className="w-4 h-4" /> View Profile
          </button>
          <button
            onClick={() => { openSettings(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <div className="border-t border-white/10" />
          <button
            onClick={() => { logout(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* User info */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 flex-1 min-w-0 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="relative flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold">
                {user.username[0].toUpperCase()}
              </div>
            )}
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-base',
              getStatusColor(user.status)
            )} />
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user.username}</p>
            <p className="text-xs text-white/40 truncate">{user.statusText ?? user.status.toLowerCase()}</p>
          </div>
        </button>

        {/* Quick actions */}
        <div className="flex items-center gap-0.5">
          <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={() => openSettings()}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
