
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setMessage('Password reset link has been sent to your email. Please check your inbox.');
      setEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center bg-[#0B0B0F]">
      <div className="relative w-full max-w-md p-8 glass-panel rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 mx-4 md:mx-0">
        <div className="absolute -inset-0.5 bg-gradient-to-b from-brand-pink/20 to-brand-purple/20 rounded-[32px] blur-xl opacity-50 z-[-1]"></div>
        <Link to="/login" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-[10px] font-bold uppercase tracking-widest transition-colors w-fit">
          <ArrowLeft size={14} /> BACK TO LOGIN
        </Link>

        <h2 className="text-3xl md:text-4xl font-black text-white mb-2 text-center uppercase tracking-tighter">Reset Password</h2>
        <p className="text-brand-pink/70 text-center mb-8 font-mono text-sm tracking-widest uppercase">Enter your email to receive a reset link.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              id="forgot-password-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOU@EXAMPLE.COM"
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/50 focus:outline-none transition-all font-mono tracking-widest text-sm shadow-inner placeholder:text-gray-600"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand-pink text-white font-black uppercase tracking-widest rounded-2xl hover:bg-[#ff4291] transition-all shadow-[0_0_20px_rgba(255,42,133,0.3)] hover:shadow-[0_0_30px_rgba(255,42,133,0.5)] flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed text-[12px]"
          >
            {isLoading ? 'SENDING...' : <><Send size={16} /> SEND RESET LINK</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
