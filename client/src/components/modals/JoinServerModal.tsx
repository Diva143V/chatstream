import { useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useServerStore } from '@/store/useServerStore';
import { Modal } from './Modal';
import { toast } from 'sonner';
import { extractAxiosError } from '@/lib/utils';

export function JoinServerModal() {
    const { showJoinServer, toggleJoinServer } = useUIStore();
    const { joinServer, selectServer } = useServerStore();
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        setLoading(true);
        try {
            const server = await joinServer(inviteCode.trim());
            selectServer(server.id);
            toggleJoinServer(false);
            setInviteCode('');
            toast.success(`Joined ${server.name}!`);
        } catch (err) {
            toast.error(extractAxiosError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={showJoinServer}
            onClose={() => toggleJoinServer(false)}
            title="Join a Server"
            className="max-w-md"
        >
            <p className="text-white/50 text-center mb-6">
                Enter an invite below to join an existing server.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Invite Code</label>
                    <input
                        autoFocus
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="h7x2kz9"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-brand focus:bg-brand/5 transition-all text-center font-mono tracking-widest"
                    />
                    <p className="text-[10px] text-white/30 text-center">Invites look like: h7x2kz9</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={() => toggleJoinServer(false)}
                        className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !inviteCode.trim()}
                        className="px-8 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-brand/20"
                    >
                        {loading ? 'Joining...' : 'Join Server'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
