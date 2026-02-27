
import React from 'react';
import { Shield, Smartphone } from 'lucide-react';

const MFAEnrollment: React.FC = () => {
    return (
        <div className="bg-[#1A1A22] border border-white/5 rounded-xl p-6 relative overflow-hidden opacity-75">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-brand-purple/20 rounded-lg flex items-center justify-center">
                    <Smartphone size={20} className="text-brand-purple" />
                </div>
                <div>
                    <h4 className="text-white font-bold">Two-Factor Authentication</h4>
                    <p className="text-xs text-gray-500">Secure your account with MFA</p>
                </div>
            </div>

            <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-lg p-4 text-center">
                <Shield size={24} className="text-brand-purple mx-auto mb-2" />
                <h5 className="text-white font-bold text-sm">Coming Soon</h5>
                <p className="text-xs text-gray-400 mt-1">
                    We are upgrading our security systems. Two-Factor Authentication (2FA) will be available via Authenticator App soon.
                </p>
            </div>
        </div>
    );
};

export default MFAEnrollment;
