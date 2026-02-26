import { useState } from 'react';
import { Search, X, Paperclip, MessageSquare } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useServerStore } from '@/store/useServerStore';
import api from '@/api/axios';
import { cn, formatMessageTime } from '@/lib/utils';
import type { Message, UserStatus } from '@/types';

interface SearchResult extends Omit<Message, 'author'> {
    author: {
        id: string;
        username: string;
        avatar: string | null;
        status: UserStatus;
    };
    channel: {
        id: string;
        name: string;
    };
}

export function SearchSidebar() {
    const { showSearch, toggleSearch } = useUIStore();
    const { selectedServerId, selectedChannelId } = useServerStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<{
        channelOnly: boolean;
        hasAttachments: boolean;
    }>({
        channelOnly: false,
        hasAttachments: false,
    });

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const params: any = { query: query.trim() };

            if (filter.channelOnly && selectedChannelId) {
                params.channelId = selectedChannelId;
            } else if (selectedServerId) {
                params.serverId = selectedServerId;
            }

            if (filter.hasAttachments) {
                params.hasAttachments = 'true';
            }

            const { data } = await api.get('/search/messages', { params });
            setResults(data.results);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!showSearch) return null;

    return (
        <aside className="w-96 bg-surface-raised border-l border-white/5 flex flex-col animate-slide-in-right z-20">
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-white/40" />
                    <span className="font-semibold text-white">Search</span>
                </div>
                <button
                    onClick={() => toggleSearch(false)}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
                <form onSubmit={handleSearch} className="relative">
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search messages..."
                        className="w-full bg-surface-base border border-white/10 rounded-xl px-4 py-2.5 pl-11 text-white placeholder:text-white/20 focus:outline-none focus:border-brand transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                </form>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter((f) => ({ ...f, channelOnly: !f.channelOnly }))}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                            filter.channelOnly ? "bg-brand text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Current Channel
                    </button>
                    <button
                        onClick={() => setFilter((f) => ({ ...f, hasAttachments: !f.hasAttachments }))}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                            filter.hasAttachments ? "bg-brand text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                    >
                        <Paperclip className="w-3.5 h-3.5" />
                        Has Attachments
                    </button>
                </div>

                <div className="flex-1 mt-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/30">
                            <div className="w-8 h-8 border-2 border-white/10 border-t-brand rounded-full animate-spin" />
                            <p className="text-sm">Searching records...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-2">
                                {results.length} Results
                            </p>
                            {results.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="bg-white/5 border border-white/5 p-3 rounded-xl hover:bg-white/[0.08] transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-brand-light">{msg.author.username}</span>
                                            <span className="text-[10px] text-white/30">{formatMessageTime(msg.createdAt)}</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/30 group-hover:text-white/50 transition-colors">
                                            #{msg.channel.name}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/70 line-clamp-3 break-words">
                                        {msg.content.split(new RegExp(`(${query})`, 'gi')).map((part: string, i: number) =>
                                            part.toLowerCase() === query.toLowerCase()
                                                ? <mark key={i} className="bg-brand/40 text-white rounded-sm px-0.5">{part}</mark>
                                                : part
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : query && !loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-white/20">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 opacity-20" />
                            </div>
                            <p>No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-white/10">
                            <Search className="w-12 h-12 mb-4 opacity-10" />
                            <p className="text-sm max-w-[200px]">Search for messages, links, and members in this server.</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
