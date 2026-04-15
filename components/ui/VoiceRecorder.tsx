// components/ui/VoiceRecorder.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Pause, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
    onUploadSuccess: (url: string) => void;
    folder?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
    onUploadSuccess,
    folder = 'voice_messages'
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const playbackRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setDuration(0);
            
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

            if (navigator.vibrate) navigator.vibrate(50);
        } catch (err) {
            toast.error("Microphone access denied");
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (navigator.vibrate) navigator.vibrate(30);
        }
    };

    const handleUpload = async () => {
        if (!audioBlob) return;
        setIsUploading(true);

        try {
            const fileName = `voice_${Date.now()}.webm`;
            const token = localStorage.getItem('sb-access-token');
            const apiUrl = `${import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke'}/api/admin/r2-upload`;

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'x-file-name': encodeURIComponent(fileName),
                    'x-folder': folder,
                    'content-type': 'audio/webm'
                },
                body: audioBlob
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            onUploadSuccess(data.url);
            reset();
            toast.success("Voice Message Sent");
        } catch (err) {
            toast.error("Message failed to send");
        } finally {
            setIsUploading(false);
        }
    };

    const reset = () => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setDuration(0);
        setIsPlaying(false);
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3">
            {isRecording ? (
                <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black tracking-widest text-red-400">{formatTime(duration)}</span>
                    <button onClick={stopRecording} className="p-1 hover:scale-110 transition-transform text-red-500">
                        <Square size={16} fill="currentColor" />
                    </button>
                </div>
            ) : audioUrl ? (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl animate-in fade-in slide-in-from-right-2 duration-300">
                    <audio 
                        ref={playbackRef} 
                        src={audioUrl} 
                        onEnded={() => setIsPlaying(false)} 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => {
                            if (isPlaying) playbackRef.current?.pause();
                            else playbackRef.current?.play();
                            setIsPlaying(!isPlaying);
                        }}
                        className="p-2 bg-brand-purple/20 text-brand-purple rounded-xl hover:bg-brand-purple/30 transition-colors"
                    >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <span className="text-[10px] font-bold text-gray-400 mr-2">{formatTime(duration)}</span>
                    <button onClick={reset} disabled={isUploading} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                    </button>
                    <button 
                        onClick={handleUpload} 
                        disabled={isUploading}
                        className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors flex items-center justify-center"
                    >
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
            ) : (
                <button 
                    onClick={startRecording}
                    className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-brand-purple hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-all group"
                    title="Record Voice Note"
                >
                    <Mic size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            )}
        </div>
    );
};
