import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useServerStore } from '@/store/useServerStore';
import { Modal } from './Modal';
import { toast } from 'sonner';
import api from '@/api/axios';
import { extractAxiosError } from '@/lib/utils';
import { Copy, Trash2, Clock, Users, Plus } from 'lucide-react';

interface Invite {
    id: string;
    code: string;
    maxUses: number | null;
    uses: number;
    expiresAt: string | null;
    createdAt: string;
    creator: {
        username: string;
        avatar: string | null;
    };
}

export function InviteModal() {
    const { showInvite, toggleInvite } = useUIStore();
    const { selectedServerId } = useServerStore();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(false);
    const [maxUses, setMaxUses] = useState<number | null>(null);
    const [expiration, setExpiration] = useState<number | null>(null); // in hours

    useEffect(() => {
        if (showInvite && selectedServerId) {
            fetchInvites();
        }
    }, [showInvite, selectedServerId]);

    const fetchInvites = async () => {
        try {
            const { data } = await api.get(`/servers/${selectedServerId}/invites`);
            setInvites(data.invites);
        } catch (err) {
            console.error('Fetch invites error:', err);
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            const { data } = await api.post(`/servers/${selectedServerId}/invites`, {
                maxUses: maxUses || null,
                expirationInHours: expiration || null,
            });
            setInvites([data.invite, ...invites]);
            toast.success('Invite created!');
        } catch (err) {
            toast.error(extractAxiosError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (code: string) => {
        try {
            await api.delete(`/invites/${code}`);
            setInvites(invites.filter((i) => i.code !== code));
            toast.success('Invite revoked');
        } catch (err) {
            toast.error(extractAxiosError(err));
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard!');
    };

    return (
        <Modal
            isOpen={showInvite}
            onClose={() => toggleInvite(false)}
            title="Server Invites"
            className="max-w-xl"
        >
            <div className="space-y-6">
                {/* Create Form */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Create New Invite</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/40 uppercase">Max Uses</label>
                            <select
                                value={maxUses || ''}
                                onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : null)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
                            >
                                <option value="">Unlimited</option>
                                <option value="1">1 use</option>
                                <option value="5">5 uses</option>
                                <option value="10">10 uses</option>
                                <option value="25">25 uses</option>
                                <option value="100">100 uses</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/40 uppercase">Expiration</label>
                            <select
                                value={expiration || ''}
                                onChange={(e) => setExpiration(e.target.value ? Number(e.target.value) : null)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
                            >
                                <option value="">Never</option>
                                <option value="1">1 hour</option>
                                <option value="6">6 hours</option>
                                <option value="12">12 hours</option>
                                <option value="24">24 hours (1 day)</option>
                                <option value="168">7 days</option>
                                <option value="720">30 days</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        {loading ? 'Creating...' : 'Generate New Link'}
                    </button>
                </div>

                {/* List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Active Invites</h3>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {invites.length === 0 ? (
                            <div className="text-center py-8 text-white/20">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-10" />
                                <p>No active invites</p>
                            </div>
                        ) : (
                            invites.map((invite) => (
                                <div
                                    key={invite.id}
                                    className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between group hover:bg-white/[0.08] transition-all"
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-brand font-bold tracking-widest">{invite.code}</span>
                                            <button
                                                onClick={() => copyToClipboard(invite.code)}
                                                className="p-1.5 text-white/30 hover:text-white transition-colors"
                                                title="Copy code"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-white/40">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {invite.uses} / {invite.maxUses || '∞'} uses
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never expires'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRevoke(invite.code)}
                                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Revoke Invite"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
