
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

const Signup: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      if (signUpError) throw signUpError;

      // Check if session exists (auto-confirm is enabled) or email confirmation is required
      if (data.session) {
        // User requested no auto-login. Sign out immediately.
        await supabase.auth.signOut();
        navigate('/login', {
          state: {
            email,
            message: "Account created successfully! Please sign in."
          }
        });
      } else {
        // Email confirmation required
        navigate('/login', {
          state: {
            email,
            message: "Account created! Please check your email to confirm."
          }
        });
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
      console.error('Google signup error:', err);
      setError(err.message || 'Failed to sign up with Google');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center bg-[#0B0B0F]">
      <div className="w-full max-w-md p-8 bg-[#15151A] rounded-2xl border border-white/10 shadow-2xl">
        <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">Create Account</h2>
        <p className="text-gray-400 text-center mb-8">Join the community for exclusive access.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-white">Continue with Google</span>
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs text-gray-500 uppercase">
            <span className="bg-[#15151A] px-2">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none"
              required
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirm</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-cyan text-black font-bold rounded-lg hover:bg-cyan-400 transition shadow-lg shadow-brand-cyan/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-white font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
