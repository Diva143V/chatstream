import { useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useDMStore } from '@/store/useDMStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from './Modal';
import { toast } from 'sonner';
import { extractAxiosError } from '@/lib/utils';

export function AddFriendModal() {
    const { showAddFriend, toggleAddFriend } = useUIStore();
    const { addFriend, fetchFriends } = useDMStore();
    const { user } = useAuthStore();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setLoading(true);
        try {
            await addFriend(username.trim());
            if (user?.id) await fetchFriends(user.id);
            toggleAddFriend(false);
            setUsername('');
            toast.success(`Friend request sent to ${username}!`);
        } catch (err) {
            toast.error(extractAxiosError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={showAddFriend}
            onClose={() => toggleAddFriend(false)}
            title="Add Friend"
            className="max-w-md"
        >
            <p className="text-white/50 text-center mb-6">
                You can add a friend with their username.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Username</label>
                    <input
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter a username"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-brand focus:bg-brand/5 transition-all"
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={() => toggleAddFriend(false)}
                        className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !username.trim()}
                        className="px-8 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-brand/20"
                    >
                        {loading ? 'Sending...' : 'Send Friend Request'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
