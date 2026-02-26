import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useServerStore } from '@/store/useServerStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, getStatusColor } from '@/lib/utils';
import { Shield } from 'lucide-react';
import type { ServerMember } from '@/types';
import { ModerationModal } from './modals/ModerationModal';

type StatusGroup = 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';

const STATUS_ORDER: StatusGroup[] = ['ONLINE', 'IDLE', 'DND', 'OFFLINE'];
const STATUS_LABELS: Record<StatusGroup, string> = {
  ONLINE: 'Online',
  IDLE: 'Idle',
  DND: 'Do Not Disturb',
  OFFLINE: 'Offline',
};

function MemberItem({
  member,
  isCurrentUser,
  canModerate,
  onModerate
}: {
  member: ServerMember;
  isCurrentUser: boolean;
  canModerate: boolean;
  onModerate: () => void;
}) {
  const { openProfile } = useUIStore();

  return (
    <div className="flex items-center gap-1 group/item px-2 py-0.5">
      <button
        onClick={() => openProfile(member.userId)}
        className="flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left min-w-0"
      >
        {/* Avatar with status */}
        <div className="relative flex-shrink-0">
          {member.user.avatar ? (
            <img src={member.user.avatar} alt={member.user.username} className="w-8 h-8 rounded-full shadow-lg" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {member.user.username[0].toUpperCase()}
            </div>
          )}
          <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-raised transition-transform group-hover/item:scale-110', getStatusColor(member.user.status))} />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            isCurrentUser ? 'text-brand-light' : 'text-white/70 group-hover/item:text-white'
          )}>
            {member.user.username}
            {isCurrentUser && <span className="text-white/30 ml-1 text-xs font-normal">(you)</span>}
          </p>
          {member.user.statusText && (
            <p className="text-[10px] text-white/20 truncate group-hover/item:text-white/40">{member.user.statusText}</p>
          )}
        </div>
      </button>

      {canModerate && !isCurrentUser && (
        <button
          onClick={onModerate}
          title="Moderate User"
          className="p-2 text-white/0 group-hover/item:text-white/20 hover:text-brand-light hover:bg-brand/10 rounded-lg transition-all"
        >
          <Shield className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function MembersPanel() {
  const { selectedServer } = useServerStore();
  const { membersPanelOpen } = useUIStore();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [moderatingMember, setModeratingMember] = useState<ServerMember | null>(null);

  const viewer = useMemo(() => {
    return selectedServer?.members.find((m) => m.userId === user?.id);
  }, [selectedServer?.members, user?.id]);

  const canModerateEveryone = viewer && ['OWNER', 'ADMIN', 'MODERATOR'].includes(viewer.role);

  if (!membersPanelOpen || !selectedServer) return null;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return selectedServer.members.filter((m) =>
      m.user.username.toLowerCase().includes(q)
    );
  }, [selectedServer.members, query]);

  const grouped = useMemo(() => {
    return STATUS_ORDER.reduce<Record<StatusGroup, ServerMember[]>>(
      (acc, status) => {
        acc[status] = filtered.filter((m) => m.user.status === status);
        return acc;
      },
      { ONLINE: [], IDLE: [], DND: [], OFFLINE: [] }
    );
  }, [filtered]);

  return (
    <aside className="w-60 bg-surface-raised flex flex-col border-l border-white/5 flex-shrink-0">
      {/* Header */}
      <div className="h-14 px-4 flex items-center gap-2 border-b border-white/5">
        <h3 className="font-semibold text-white/70">Members</h3>
        <span className="text-sm text-white/30">{selectedServer.members.length}</span>
      </div>

      {/* Search */}
      <div className="p-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members"
            className="w-full pl-9 pr-3 py-2 bg-surface-base border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Members by status */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-hide">
        {STATUS_ORDER.map((status) => {
          const members = grouped[status];
          if (members.length === 0) return null;

          return (
            <div key={status} className="mb-4">
              <h4 className="px-2 py-1.5 text-xs font-semibold text-white/30 uppercase tracking-wider">
                {STATUS_LABELS[status]} — {members.length}
              </h4>
              <div className="space-y-0.5">
                {members.map((member) => (
                  <MemberItem
                    key={member.userId}
                    member={member}
                    isCurrentUser={member.userId === user?.id}
                    canModerate={!!canModerateEveryone}
                    onModerate={() => setModeratingMember(member)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {moderatingMember && (
        <ModerationModal
          member={moderatingMember}
          onClose={() => setModeratingMember(null)}
        />
      )}
    </aside>
  );
}
