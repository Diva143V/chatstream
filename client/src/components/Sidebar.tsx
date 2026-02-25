import { useState } from 'react';
import { Hash, Volume2, Megaphone, ChevronDown, ChevronRight } from 'lucide-react';
import { useServerStore } from '@/store/useServerStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import type { Channel, ChannelType } from '@/types';
import { UserPanel } from './UserPanel';

function ChannelIcon({ type }: { type: ChannelType }) {
  switch (type) {
    case 'VOICE': return <Volume2 className="w-4 h-4" />;
    case 'ANNOUNCEMENT': return <Megaphone className="w-4 h-4" />;
    default: return <Hash className="w-4 h-4" />;
  }
}

function ChannelGroup({
  category,
  channels,
  selectedChannelId,
  onSelect,
}: {
  category: string;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {category}
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {channels.map((ch) => {
            const isSelected = selectedChannelId === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => onSelect(ch.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all group',
                  isSelected
                    ? 'bg-brand/20 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                )}
              >
                <span className={cn(
                  'transition-colors flex-shrink-0',
                  isSelected ? 'text-brand-light' : 'text-white/40 group-hover:text-white/60'
                )}>
                  <ChannelIcon type={ch.type} />
                </span>
                <span className="truncate">{ch.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { selectedServer, selectedChannelId, selectChannel } = useServerStore();

  if (!selectedServer) {
    return (
      <aside className="w-60 bg-surface-raised flex flex-col border-r border-white/5">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/30 text-sm text-center px-4">Select a server to view channels</p>
        </div>
        <UserPanel />
      </aside>
    );
  }

  // Group channels by category
  const channelGroups = selectedServer.channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    const cat = ch.category ?? 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ch);
    return acc;
  }, {});

  return (
    <aside className="w-60 bg-surface-raised flex flex-col border-r border-white/5 flex-shrink-0">
      {/* Server header */}
      <button className="h-14 px-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors">
        <h2 className="font-semibold text-white truncate">{selectedServer.name}</h2>
        <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
      </button>

      {/* Server description */}
      {selectedServer.description && (
        <div className="px-4 py-2 border-b border-white/5">
          <p className="text-xs text-white/40 line-clamp-2">{selectedServer.description}</p>
        </div>
      )}

      {/* Channels */}
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        {Object.entries(channelGroups).map(([cat, channels]) => (
          <ChannelGroup
            key={cat}
            category={cat}
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelect={selectChannel}
          />
        ))}
      </nav>

      {/* User panel at bottom */}
      <UserPanel />
    </aside>
  );
}
