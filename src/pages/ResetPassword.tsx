import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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

  if (!token) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-[#131326] flex items-center justify-center p-4 text-white text-center">
          <div className="w-full max-md bg-transparent flex flex-col items-center">
            <div className="w-16 h-16 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
            <p className="text-white/60 mb-10 leading-relaxed px-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="auth-btn px-10"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#131326] flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-transparent flex flex-col">
          
          <div className="w-full text-left mb-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
            <h1 className="text-4xl font-bold mb-2">New Password</h1>
            {!success && (
              <p className="text-white/60 text-sm mt-3 leading-relaxed">
                Enter your new password below. Make sure it's at least 6 characters long.
              </p>
            )}
          </div>

          {success ? (
            <div className="w-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-white px-6 py-8 rounded-3xl text-sm text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle size={32} className="text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Password Reset!</h2>
              <p className="text-white/70 leading-relaxed mb-8 px-4">
                Your password has been updated. You can now log in with your new password.
              </p>
              <Link
                to="/login"
                className="auth-btn block"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="w-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] px-4 py-3 rounded-2xl mb-6 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="w-full space-y-5">
                {/* New Password */}
                <div className="auth-input-container">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input !pr-16"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 text-sm hover:text-white transition-colors underline decoration-[#38bdf8]/30 underline-offset-2"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="auth-input-container">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-input !pr-16"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 text-sm hover:text-white transition-colors underline decoration-[#38bdf8]/30 underline-offset-2"
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>

                <button type="submit" disabled={loading} className="auth-btn mt-4">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Resetting...
                    </div>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ResetPassword;
