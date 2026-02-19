
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
      <div className="w-full max-w-md p-8 bg-[#15151A] rounded-2xl border border-white/10 shadow-2xl">
        <Link to="/login" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">Reset Password</h2>
        <p className="text-gray-400 text-center mb-8">Enter your email to receive a reset link.</p>

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
            <label className="block text-sm text-gray-400 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-brand-purple focus:outline-none"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : <><Send size={18} /> Send Reset Link</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
