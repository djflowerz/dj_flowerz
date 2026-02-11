
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { realLogin, signInWithGoogle, signInWithFacebook, signInWithTikTok } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await realLogin(email, password);
      navigate('/account'); 
    } catch (err: any) {
      setError('Failed to login. Please check your credentials.');
      console.error(err);
    }
  };

  const handleSocialLogin = async (method: 'google' | 'facebook' | 'tiktok') => {
      try {
          if (method === 'google') await signInWithGoogle();
          if (method === 'facebook') await signInWithFacebook();
          if (method === 'tiktok') await signInWithTikTok();
          navigate('/account');
      } catch (err: any) {
          setError(err.message || `Failed to sign in with ${method}`);
      }
  }

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center bg-[#0B0B0F]">
      <div className="w-full max-w-md p-8 bg-[#15151A] rounded-2xl border border-white/10 shadow-2xl">
        <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-gray-400 text-center mb-8">Sign in to access your account.</p>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm text-center flex items-center justify-center gap-2"><AlertCircle size={16}/> {error}</div>}

        <div className="grid grid-cols-3 gap-3 mb-6">
            <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </button>
            <button onClick={() => handleSocialLogin('facebook')} className="flex items-center justify-center py-3 bg-[#1877F2] rounded-lg hover:bg-[#166fe5] transition text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 2.848-5.978 5.817-5.978.313 0 .615.01.862.019l.242.012v2.529l-1.54.004c-1.636 0-2.327.915-2.327 2.223v2.771h3.711l-.475 3.667h-3.236v7.98h-3.053z"/></svg>
            </button>
            <button onClick={() => handleSocialLogin('tiktok')} className="flex items-center justify-center py-3 bg-black border border-white/20 rounded-lg hover:bg-gray-900 transition text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.58-1.09-.63-.63-1.1-1.35-1.45-2.13-1.85-.02-3.71-.02-5.56-.03.01 2.87.03 5.74.03 8.61 0 2.28-.7 4.56-2.27 6.36-1.57 1.83-4.01 2.72-6.42 2.37-2.38-.28-4.52-1.65-5.78-3.7-1.4-2.23-1.42-5.18-.09-7.46 1.25-2.24 3.7-3.77 6.27-3.88.02 1.48.01 2.97.02 4.45-.88.06-1.76.43-2.42 1.05-.72.67-1.12 1.63-1.1 2.61.02 1.05.51 2.06 1.33 2.73.91.8 2.24 1.09 3.4.74 1.25-.33 2.27-1.34 2.62-2.58.33-1.3.15-2.73-.01-4.05-.02-4.32-.03-8.64-.04-12.96z"/></svg>
            </button>
        </div>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs text-gray-500 uppercase"><span className="bg-[#15151A] px-2">Or sign in with email</span></div>
        </div>

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
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-brand-purple focus:outline-none"
              required 
            />
          </div>

          <div className="flex items-center justify-between text-sm">
             <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-600 bg-gray-700" />
                Remember me
             </label>
             <Link to="/forgot-password" className="text-brand-cyan hover:underline">Forgot Password?</Link>
          </div>

          <button type="submit" className="w-full py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition shadow-lg shadow-brand-purple/20">
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account? <Link to="/signup" className="text-white font-bold hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
