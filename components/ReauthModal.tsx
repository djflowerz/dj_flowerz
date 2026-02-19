
import React, { useState } from 'react';
import { X, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ReauthModalProps {
    onSuccess: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    actionLabel?: string;
}

const ReauthModal: React.FC<ReauthModalProps> = ({
    onSuccess,
    onCancel,
    title = "Verify Identity",
    description = "This is a sensitive operation. Please enter your password to continue.",
    actionLabel = "Confirm"
}) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { reauthenticate } = useAuth();

    const handleConfirm = async () => {
        if (!password) {
            setError('Password is required');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await reauthenticate(password);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Invalid password. Please try again.');
            console.error('Reauth Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-[#15151A] rounded-2xl border border-white/10 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-brand-purple/20 rounded-full flex items-center justify-center mb-4">
                        <Shield className="text-brand-purple" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-sm text-gray-400 mt-2">{description}</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs flex items-center gap-2 mb-4">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 uppercase font-bold mb-2">Your Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none transition"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full py-3 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 disabled:opacity-50 transition shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : actionLabel}
                    </button>

                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="w-full py-3 bg-transparent text-gray-500 hover:text-white font-bold transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReauthModal;
