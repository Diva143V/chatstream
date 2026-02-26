import { useEffect, useState } from 'react';
import {
    LiveKitRoom,
    useTracks,
    ParticipantTile,
    ControlBar,
    RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import api from '@/api/axios';
import { Loader2 } from 'lucide-react';

interface VoiceChannelProps {
    channelId: string;
    channelName: string;
    onDisconnect?: () => void;
}

export function VoiceChannel({ channelId, channelName, onDisconnect }: VoiceChannelProps) {
    const [token, setToken] = useState<string | null>(null);
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.post('/voice/token', { roomName: channelId });
                setToken(data.token);
                setServerUrl(data.serverUrl);
            } catch (err: any) {
                console.error('Failed to get voice token:', err);
                setError(err.response?.data?.error || 'Failed to connect to voice server');
            }
        })();
    }, [channelId]);

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-base">
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 max-w-md">
                    <p className="font-bold mb-2">Voice Connection Error</p>
                    <p className="text-sm opacity-80">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (!token || !serverUrl) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface-base">
                <Loader2 className="w-8 h-8 text-brand animate-spin mb-4" />
                <p className="text-white/40 animate-pulse">Connecting to voice...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={serverUrl}
                onDisconnected={onDisconnect}
                data-lk-theme="default"
                className="flex-1 flex flex-col"
            >
                {/* Visual grid for voice participants */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-white">Voice: {channelName}</h2>
                        <p className="text-sm text-white/40">Connected to LiveKit Room</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <ParticipantList />
                    </div>
                </div>

                {/* Controls */}
                <ControlBar
                    variation="minimal"
                    controls={{ microphone: true, screenShare: true, camera: true, leave: true }}
                    className="bg-surface-raised border-t border-white/5 py-4"
                />

                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
}

function ParticipantList() {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.Microphone, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    // Filter unique participants from tracks
    const participants = Array.from(new Set(tracks.map(t => t.participant.sid)));

    if (participants.length === 0) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-white/20">
                <p>Waiting for others to join...</p>
            </div>
        );
    }

    return (
        <>
            {tracks.map((trackReference) => (
                <ParticipantTile key={`${trackReference.participant.sid}-${trackReference.source}`} {...trackReference} />
            ))}
        </>
    );
}
