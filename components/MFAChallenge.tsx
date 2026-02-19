
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface MFAChallengeProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const MFAChallenge: React.FC<MFAChallengeProps> = ({ onSuccess, onCancel }) => {
    return (
        <div className="w-full max-w-md p-8 bg-[#15151A] rounded-2xl border border-white/10 shadow-2xl animate-fade-in text-center">
            <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white transition" onClick={onCancel}>
                <ArrowLeft size={16} /> <span className="text-sm font-bold">Back to Login</span>
            </div>

            <h2 className="text-2xl font-display font-bold text-white mb-4">Second-Step Verification</h2>
            <p className="text-sm text-gray-400 mb-8">
                MFA is currently being upgraded for Supabase integration. Please check back later.
            </p>

            <button
                onClick={onSuccess} // Temporary bypass for dev/testing if needed, or disable
                disabled={true}
                className="w-full py-4 bg-gray-700 text-gray-400 font-bold rounded-lg cursor-not-allowed"
            >
                Verify Code (Disabled)
            </button>
        </div>
    );
};

export default MFAChallenge;
