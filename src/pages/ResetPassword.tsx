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
        <div className="min-h-screen bg-[#6b6678] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#2b2836] rounded-3xl shadow-2xl p-12 text-white text-center">
            <h1 className="text-2xl font-semibold mb-4">Invalid Reset Link</h1>
            <p className="text-gray-400 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 transition font-medium"
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
      <div className="min-h-screen bg-[#6b6678] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2b2836] rounded-3xl shadow-2xl p-12 text-white">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>

          <h1 className="text-3xl font-semibold mb-2">Create New Password</h1>
          <p className="text-gray-400 mb-8">
            Enter your new password below. Make sure it's at least 6 characters long.
          </p>

          {success ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-4 rounded-lg text-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle size={20} />
                <span className="font-medium">Password Reset Successful</span>
              </div>
              <p className="mb-4">
                Your password has been updated. You can now log in with your new password.
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 transition font-medium text-white text-sm"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="inputStyle pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="inputStyle pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 transition font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
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
    </PageTransition>
  );
};

export default ResetPassword;
