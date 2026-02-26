import { useState, useMemo } from 'react';
import { Users, Search, MessageSquare, X } from 'lucide-react';
import { useDMStore } from '@/store/useDMStore';
import { useUIStore } from '@/store/useUIStore';
import { cn, getStatusColor } from '@/lib/utils';

export function FriendsList() {
    const { friends, loading } = useDMStore();
    const { setDMMode, openProfile } = useUIStore();
    const [filter, setFilter] = useState<'ALL' | 'ONLINE' | 'PENDING' | 'BLOCKED'>('ONLINE');
    const [query, setQuery] = useState('');

    const filteredFriends = useMemo(() => {
        return friends.filter(friend => {
            const matchesQuery = friend.username.toLowerCase().includes(query.toLowerCase());
            if (filter === 'ONLINE') return matchesQuery && friend.status !== 'OFFLINE';
            return matchesQuery;
        });
    }, [friends, filter, query]);

    return (
        <div className="flex-1 flex flex-col bg-surface-base overflow-hidden">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-surface-base/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                        <Users className="w-5 h-5 text-white/40" />
                        <span className="font-bold text-white">Friends</span>
                    </div>

                    <nav className="flex items-center gap-1">
                        {(['ONLINE', 'ALL', 'PENDING', 'BLOCKED'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-3 py-1 rounded-md text-sm font-medium transition-all",
                                    filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                )}
                            >
                                {f.charAt(0) + f.slice(1).toLowerCase()}
                            </button>
                        ))}
                        <button className="ml-2 px-3 py-1 bg-status-online/20 text-status-online hover:bg-status-online/30 rounded-md text-sm font-bold transition-all">
                            Add Friend
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Search */}
                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search"
                                className="w-full pl-10 pr-4 py-2 bg-surface-raised border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand transition-all"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">
                            {filter} — {filteredFriends.length}
                        </h4>

                        <div className="space-y-0.5">
                            {filteredFriends.map(friend => (
                                <div
                                    key={friend.id}
                                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            {friend.avatar ? (
                                                <img src={friend.avatar} className="w-10 h-10 rounded-full" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center font-bold text-white">
                                                    {friend.username[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-4 border-surface-base", getStatusColor(friend.status))} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white group-hover:text-brand-light transition-colors">{friend.username}</h4>
                                            <p className="text-xs text-white/40">{friend.statusText ?? friend.status.toLowerCase()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setDMMode(true, friend.id)}
                                            className="p-2 bg-surface-overlay text-white/60 hover:text-white hover:bg-brand rounded-full transition-all"
                                            title="Message"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openProfile(friend.id)}
                                            className="p-2 bg-surface-overlay text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                            title="More"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {filteredFriends.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                                    <Users className="w-20 h-20 mb-4" />
                                    <p>No one's here yet...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Activity Sidebar */}
                <div className="w-80 border-l border-white/5 p-4 hidden lg:block">
                    <h3 className="text-lg font-bold text-white mb-4">Active Now</h3>
                    <div className="bg-surface-raised rounded-2xl border border-white/10 p-6 text-center">
                        <p className="text-sm text-white/40 italic">It's quiet for now. When friends start an activity, it'll show up here!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
