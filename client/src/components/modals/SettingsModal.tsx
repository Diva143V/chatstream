import { User, Shield, Bell, Palette, LogOut } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from './Modal';
import { cn } from '@/lib/utils';

export function SettingsModal() {
    const { showSettings, settingsTab, openSettings, closeSettings } = useUIStore();
    const { user, logout } = useAuthStore();

    const tabs = [
        { id: 'account', label: 'My Account', icon: User },
        { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'appearance', label: 'Appearance', icon: Palette },
    ] as const;

    if (!user) return null;

    return (
        <Modal
            isOpen={showSettings}
            onClose={closeSettings}
            className="max-w-4xl h-[600px] p-0 flex"
        >
            {/* Sidebar */}
            <div className="w-60 bg-surface-base border-r border-white/5 flex flex-col p-4">
                <h3 className="px-2 mb-4 text-xs font-bold text-white/40 uppercase tracking-widest">User Settings</h3>
                <nav className="flex-1 space-y-0.5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = settingsTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => openSettings(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-brand text-white shadow-lg shadow-brand/20"
                                        : "text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="border-t border-white/5 pt-4">
                    <button
                        onClick={() => { logout(); closeSettings(); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-surface-raised flex flex-col min-w-0">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">
                        {tabs.find(t => t.id === settingsTab)?.label}
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {settingsTab === 'account' && (
                        <div className="space-y-8">
                            {/* Profile Card */}
                            <div className="bg-surface-overlay rounded-2xl border border-white/10 overflow-hidden">
                                <div className="h-24 bg-brand" />
                                <div className="px-6 pb-6 -mt-12 flex items-end justify-between">
                                    <div className="flex items-end gap-4">
                                        <div className="relative group">
                                            {user.avatar ? (
                                                <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-surface-overlay bg-surface-base" />
                                            ) : (
                                                <div className="w-24 h-24 rounded-full border-4 border-surface-overlay bg-brand flex items-center justify-center text-3xl font-bold">
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                                <span className="text-[10px] font-bold uppercase">Change Avatar</span>
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <h4 className="text-2xl font-bold text-white leading-none">{user.username}</h4>
                                            <p className="text-white/40 text-sm mt-1">ChatStream User</p>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-medium transition-colors">
                                        Edit User Profile
                                    </button>
                                </div>
                            </div>

                            {/* Account Details */}
                            <div className="bg-surface-overlay rounded-2xl border border-white/10 p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Username</label>
                                        <p className="text-white">{user.username}</p>
                                    </div>
                                    <button className="text-sm text-brand-light hover:underline">Edit</button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Email</label>
                                        <p className="text-white">{user.email}</p>
                                    </div>
                                    <button className="text-sm text-brand-light hover:underline">Edit</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsTab !== 'account' && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <Shield className="w-8 h-8 text-white/20" />
                            </div>
                            <h3 className="text-lg font-semibold text-white/60">Coming Soon</h3>
                            <p className="text-sm text-white/30 max-w-xs mt-2">This settings feature is currently under development.</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
