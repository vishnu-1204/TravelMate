import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';

import { BACKEND_URL } from '@/lib/apiConfig';

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new one from the forgot password page.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to reset password. Please try again.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Unable to reach the server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="auth-split-layout">
        <div className="auth-container">
          {/* Left Sidebar - Image & Brand */}
          <div className="auth-sidebar">
            <img 
              src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80" 
              alt="Scenic Lake & Mountain" 
              className="auth-sidebar-img"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/90 via-transparent to-transparent z-10" />
            
            <div className="relative z-20 p-12 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white tracking-tight">
                  Travel<span className="text-[#FF7A00]">Mate</span>
                </span>
                <Link to="/" className="text-sm font-medium text-white/80 hover:text-white flex items-center gap-2 transition-colors">
                  Back to website <span className="text-lg">→</span>
                </Link>
              </div>
              
              <div className="mt-auto">
                <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                  Securing Your<br />Next Destination
                </h2>
                <div className="flex gap-2">
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                  <div className="w-8 h-1 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Form */}
          <div className="auth-content">
            <div className="max-w-md w-full mx-auto">
              {!token ? (
                <div className="text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h1>
                  <p className="text-[#94a3b8] mb-8 leading-relaxed">
                    This password reset link is invalid or has expired. Please request a new one.
                  </p>
                  <Link
                    to="/forgot-password"
                    className="auth-btn-primary px-10 py-3.5 inline-flex items-center justify-center"
                  >
                    Request New Reset Link
                  </Link>
                </div>
              ) : success ? (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-white px-6 py-8 rounded-3xl text-sm text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <CheckCircle size={30} className="text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-2">Password Reset!</h2>
                  <p className="text-[#94a3b8] leading-relaxed mb-8 px-4">
                    Your password has been updated. You can now log in with your new credentials.
                  </p>
                  <Link
                    to="/login"
                    className="auth-btn-primary block text-center"
                  >
                    Go to Login
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-[#FF7A00] text-sm mb-6 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                  
                  <h1 className="text-3xl font-bold text-white mb-2">New Password</h1>
                  <p className="text-[#94a3b8] text-sm mb-8">
                    Enter your new password below. Make sure it's at least 6 characters long.
                  </p>

                  {error && (
                    <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* New Password */}
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input-new pr-12"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#FF7A00] transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="auth-input-new pr-12"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#FF7A00] transition-colors"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="auth-btn-primary mt-6 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ResetPassword;
