
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VerifyEmail: React.FC = () => {
    const { checkEmailVerification, auth, logout } = useAuth();
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-check every 3 seconds
    React.useEffect(() => {
        if (verified) return;

        const interval = setInterval(async () => {
            const isVerified = await checkEmailVerification();
            if (isVerified) {
                setVerified(true);
                clearInterval(interval);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [verified, checkEmailVerification]);

    const handleManualCheck = async () => {
        setLoading(true);
        setError('');
        try {
            const isVerified = await checkEmailVerification();
            if (isVerified) {
                setVerified(true);
            } else {
                setError("Email not verified yet. Please check your inbox and click the link.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to check verification status.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-20 flex items-center justify-center bg-[#0B0B0F]">
            <div className="w-full max-w-md p-8 bg-[#15151A] rounded-2xl border border-white/10 shadow-2xl text-center">

                {!verified ? (
                    <>
                        <div className="w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Mail size={32} className="text-brand-purple" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Check Your Email</h2>
                        <p className="text-gray-400 mb-8 text-sm">
                            We've sent a verification link to your email address. Please click the link to activate your account.
                            <span className="block mt-2 text-brand-cyan/80">Don't see it? Please check your <strong>spam/junk</strong> folder.</span>
                        </p>

                        <div className="bg-black/20 p-6 rounded-xl border border-white/5 mb-6">
                            <p className="text-xs text-gray-400 mb-4">
                                Once you've clicked the link in your email, click the button below to continue.
                            </p>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-xs">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleManualCheck}
                                disabled={loading}
                                className="w-full py-3 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? "Checking..." : "I have verified my email"}
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="text-xs text-gray-500">
                                Didn't receive it? <button onClick={() => auth.currentUser?.sendEmailVerification()} className="text-brand-purple hover:underline font-bold">Resend Email</button>
                            </div>

                            <div className="text-xs text-gray-600">
                                Using a different account? <button onClick={logout} className="text-gray-400 hover:text-white underline">Sign Out</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="animate-fade-in-up">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Email Verified!</h2>
                        <p className="text-gray-400 mb-8 text-sm">Your account is now active.</p>
                        <Link to="/account" className="w-full py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2">
                            Go to Dashboard <ArrowRight size={18} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
