// components/ui/R2Upload.tsx
import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle2, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface R2UploadProps {
    onUploadSuccess: (url: string) => void;
    folder?: string;
    label?: string;
    accept?: string;
}

export const R2Upload: React.FC<R2UploadProps> = ({ 
    onUploadSuccess, 
    folder = 'escrow_evidence',
    label = 'Upload Evidence',
    accept = 'image/*,application/pdf'
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size limit: 10MB
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File too large", { description: "Maximum size is 10MB" });
            return;
        }

        // Preview local image
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }

        await uploadFile(file);
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setProgress(10);
        
        try {
            const token = localStorage.getItem('sb-access-token');
            const apiUrl = `${import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke'}/api/admin/r2-upload`;

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'x-file-name': encodeURIComponent(file.name),
                    'x-folder': folder,
                    'content-type': file.type
                },
                body: file
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setProgress(100);
            
            // Haptic Success trigger
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
            
            onUploadSuccess(data.url);
            toast.success("Upload Complete");
            
        } catch (err) {
            console.error('[R2Upload] Error:', err);
            toast.error("Upload Failed", { description: "Please try again later." });
            setPreview(null);
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="relative group">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={accept}
                className="hidden" 
            />
            
            {preview ? (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/40 group/preview animate-in fade-in zoom-in duration-300">
                    <img src={preview} alt="Upload Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 bg-white text-black rounded-full hover:bg-brand-purple hover:text-white transition"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <button 
                            onClick={() => setPreview(null)}
                            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-500 transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-8 border-2 border-dashed border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-brand-purple/40 rounded-2xl transition-all flex flex-col items-center justify-center gap-3 group/btn"
                >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                        {isUploading ? (
                            <Loader2 size={24} className="animate-spin text-brand-purple" />
                        ) : (
                            <Upload size={24} className="text-gray-500 group-hover/btn:text-white" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover/btn:text-white">{label}</p>
                        <p className="text-[9px] text-gray-600 mt-1 uppercase tracking-tighter">Images, PDFs • Max 10MB</p>
                    </div>

                    {isUploading && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden rounded-full">
                            <div 
                                className="h-full bg-brand-purple transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </button>
            )}
        </div>
    );
};
