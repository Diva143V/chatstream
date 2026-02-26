import { useState } from 'react';
import { Shield, Hammer, Clock, Ban, AlertTriangle, X } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useServerStore } from '@/store/useServerStore';
import api from '@/api/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ServerMember } from '@/types';

interface ModerationModalProps {
    member: ServerMember;
    onClose: () => void;
}

const ACTIONS = [
    { id: 'WARN', label: 'Warning', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { id: 'TIMEOUT', label: 'Timeout', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'KICK', label: 'Kick', icon: Hammer, color: 'text-red-400', bg: 'bg-red-400/10' },
    { id: 'BAN', label: 'Ban', icon: Ban, color: 'text-red-600', bg: 'bg-red-600/10' },
];

export function ModerationModal({ member, onClose }: ModerationModalProps) {
    const { selectedServerId } = useServerStore();
    const [type, setType] = useState<any>('WARN');
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('3600'); // 1 hour
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return toast.error('Please provide a reason');

        setLoading(true);
        try {
            await api.post(`/servers/${selectedServerId}/action`, {
                targetId: member.userId,
                type,
                reason: reason.trim(),
                durationInSeconds: type === 'TIMEOUT' ? parseInt(duration) : null,
            });

            toast.success(`User ${member.user.username} has been ${type.toLowerCase()}ed`);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to moderate user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface-raised w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface-overlay/50">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-brand" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Moderate User</h2>
                            <p className="text-sm text-white/30 truncate max-w-[200px]">Target: @{member.user.username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Action Type */}
                    <div className="grid grid-cols-2 gap-3">
                        {ACTIONS.map((action) => (
                            <button
                                key={action.id}
                                type="button"
                                onClick={() => setType(action.id)}
                                className={cn(
                                    "flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left",
                                    type === action.id
                                        ? "bg-white/5 border-white/20"
                                        : "bg-surface-base/30 border-transparent hover:border-white/5 hover:bg-surface-base/50"
                                )}
                            >
                                <div className={cn("p-2 rounded-lg", action.bg)}>
                                    <action.icon className={cn("w-4 h-4", action.color)} />
                                </div>
                                <span className={cn("text-sm font-medium", type === action.id ? "text-white" : "text-white/40")}>
                                    {action.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest pl-1">Reason</label>
                        <textarea
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Spamming, breaking rules..."
                            className="w-full bg-surface-base border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-brand/40 min-h-[100px] transition-all"
                        />
                    </div>

                    {/* Duration (only for Timeout) */}
                    {type === 'TIMEOUT' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-bold text-white/30 uppercase tracking-widest pl-1">Duration</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full bg-surface-base border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand/40 transition-all appearance-none cursor-pointer"
                            >
                                <option value="60">1 Minute</option>
                                <option value="300">5 Minutes</option>
                                <option value="3600">1 Hour</option>
                                <option value="86400">24 Hours</option>
                                <option value="604800">1 Week</option>
                            </select>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "flex-[2] px-4 py-3 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand/20 transition-all",
                                loading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {loading ? "Executing..." : `Confirm ${type.toLowerCase()}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
