
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

const Login: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Redirect if already logged in
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || (location.state as any)?.from || '/';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location.state]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.email) {
      setEmail(state.email);
    }
    if (state?.message) {
      setSuccess(state.message);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Check if session exists
      if (data.session) {
        // Successful login — redirect back to the page they came from, or home
        const from = (location.state as any)?.from?.pathname || (location.state as any)?.from || '/';
        navigate(from, { replace: true });

      } else {
        setError('Please check your email and confirm your account before logging in.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (signInError) throw signInError;
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center bg-[#0B0B0F]">
      <div className="relative w-full max-w-md p-8 glass-panel rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 mx-4 md:mx-0">
        <div className="absolute -inset-0.5 bg-gradient-to-b from-brand-cyan/20 to-brand-purple/20 rounded-[32px] blur-xl opacity-50 z-[-1]"></div>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-2 text-center uppercase tracking-tighter">Welcome Back</h2>
        <p className="text-brand-cyan/70 text-center mb-8 font-mono text-sm tracking-widest uppercase">Sign in to access your account.</p>

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl hover:bg-white/5 hover:border-white/20 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-white font-black uppercase text-[11px] tracking-widest">CONTINUE WITH GOOGLE</span>
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5 border-dashed"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <span className="bg-[#101014] px-4 py-1 rounded-full border border-white/5 shadow-inner backdrop-blur-md">OR SIGN IN WITH EMAIL</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOU@EXAMPLE.COM"
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 focus:outline-none transition-all font-mono tracking-widest text-sm shadow-inner placeholder:text-gray-600"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 focus:outline-none transition-all font-mono tracking-widest text-sm shadow-inner placeholder:text-gray-600"
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
            <label className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-brand-purple focus:ring-brand-purple/50 focus:ring-offset-0 focus:ring-offset-transparent transition-colors"
                style={{ WebkitAppearance: 'none', appearance: 'none', width: '16px', height: '16px', display: 'inline-block', position: 'relative' }}
              />
              <span className="relative z-10 -ml-[18px] mr-1 pointer-events-none opacity-0 data-[checked=true]:opacity-100 transition-opacity" data-checked={showPassword}>✓</span>
              SHOW PASSWORD
            </label>
            <Link to="/forgot-password" className="text-brand-cyan hover:text-white hover:text-shadow-[0_0_10px_rgba(40,230,220,0.5)] transition-all">
              FORGOT PASSWORD?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 btn-premium rounded-2xl text-[12px] shadow-[0_0_20px_rgba(157,78,221,0.2)] hover:shadow-[0_0_30px_rgba(157,78,221,0.4)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
          DON'T HAVE AN ACCOUNT?{' '}
          <Link to="/signup" className="text-brand-purple hover:text-white transition-colors ml-1 hover:drop-shadow-[0_0_8px_rgba(157,78,221,0.8)]">
            SIGN UP
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
