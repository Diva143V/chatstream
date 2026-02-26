import { useEffect, useState } from 'react';
import { Mail, Calendar, MessageSquare, UserPlus } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from './Modal';
import api from '@/api/axios';
import type { User } from '@/types';
import { format } from 'date-fns';

export function ProfileModal() {
    const { profileUserId, closeProfile } = useUIStore();
    const { user: currentUser } = useAuthStore();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profileUserId) {
            setLoading(true);
            // Fetch user profile if it's not the current user
            if (profileUserId === currentUser?.id) {
                setUser(currentUser);
                setLoading(false);
            } else {
                api.get(`/users/${profileUserId}`)
                    .then(res => setUser(res.data.user))
                    .catch(err => console.error(err))
                    .finally(() => setLoading(false));
            }
        } else {
            setUser(null);
        }
    }, [profileUserId, currentUser]);

    if (!profileUserId) return null;

    return (
        <Modal
            isOpen={!!profileUserId}
            onClose={closeProfile}
            className="max-w-md p-0 overflow-hidden"
        >
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                </div>
            ) : user ? (
                <div className="flex flex-col">
                    {/* Banner */}
                    <div className="h-32 bg-gradient-to-br from-brand to-brand-light relative">
                        <div className="absolute -bottom-12 left-6">
                            <div className="relative">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-24 h-24 rounded-full border-8 border-surface-raised bg-surface-base" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full border-8 border-surface-raised bg-brand flex items-center justify-center text-3xl font-bold">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-surface-raised bg-status-online" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 px-6 pb-6 bg-surface-raised">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white mb-0.5">{user.username}</h2>
                            <p className="text-white/40 text-sm">{user.statusText ?? user.status.toLowerCase()}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-white/70">
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-white/70">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm">Joined {format(new Date(user.createdAt || Date.now()), 'MMM d, yyyy')}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-semibold transition-all">
                                    <MessageSquare className="w-4 h-4" /> Message
                                </button>
                                {user.id !== currentUser?.id && (
                                    <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-all">
                                        <UserPlus className="w-4 h-4" /> Add Friend
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-64 flex items-center justify-center text-white/40">
                    User not found
                </div>
            )}
        </Modal>
    );
}
