import { useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useServerStore } from '@/store/useServerStore';
import { Modal } from './Modal';
import { toast } from 'sonner';
import { extractAxiosError } from '@/lib/utils';

export function CreateServerModal() {
    const { showCreateServer, toggleCreateServer } = useUIStore();
    const { createServer, selectServer } = useServerStore();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const server = await createServer(name.trim());
            selectServer(server.id);
            toggleCreateServer(false);
            setName('');
            toast.success('Server created successfully!');
        } catch (err) {
            toast.error(extractAxiosError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={showCreateServer}
            onClose={() => toggleCreateServer(false)}
            title="Create Your Server"
            className="max-w-md"
        >
            <p className="text-white/50 text-center mb-6">
                Give your new server a personality with a name. You can always change it later.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Server Name</label>
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Awesome Server"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-brand focus:bg-brand/5 transition-all"
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={() => toggleCreateServer(false)}
                        className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="px-8 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-brand/20"
                    >
                        {loading ? 'Creating...' : 'Create Server'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
