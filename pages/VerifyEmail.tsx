
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);

  // Since actual OTP via email isn't supported without a custom backend, 
  // we simulate the visual flow or instruct users to click the link.
  
  const handleVerify = (e: React.FormEvent) => {
      e.preventDefault();
      // Simulate verification for visual completeness
      if(code.length > 3) {
          setVerified(true);
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
                </p>

                <div className="bg-black/20 p-6 rounded-xl border border-white/5 mb-6">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-4">Or Enter Code (Simulation)</p>
                    <form onSubmit={handleVerify} className="space-y-4">
                        <input 
                            type="text" 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="e.g. 123456" 
                            className="w-full text-center text-xl tracking-widest bg-[#0B0B0F] border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none"
                        />
                        <button type="submit" className="w-full py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition text-sm">
                            Verify Code
                        </button>
                    </form>
                </div>

                <div className="text-xs text-gray-500">
                    Didn't receive it? <button className="text-brand-purple hover:underline">Resend Email</button>
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
