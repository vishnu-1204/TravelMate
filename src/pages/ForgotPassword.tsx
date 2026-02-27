import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const validation = emailSchema.safeParse({ email: normalizedEmail });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to send reset email. Please try again.');
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
      <div className="min-h-screen bg-[#6b6678] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2b2836] rounded-3xl shadow-2xl p-12 text-white">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>

          <h1 className="text-3xl font-semibold mb-2">Reset Password</h1>
          <p className="text-gray-400 mb-8">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {success ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-4 rounded-lg text-sm">
              <div className="flex items-center gap-3 mb-2">
                <Mail size={20} />
                <span className="font-medium">Check your email</span>
              </div>
              <p>
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Please check your inbox and spam folder.
              </p>
              <p className="mt-3 text-gray-400 text-xs">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  className="text-sky-400 hover:underline"
                  onClick={() => { setSuccess(false); setError(''); }}
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="inputStyle"
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 transition font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
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

export default ForgotPassword;
