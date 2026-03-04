import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';

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
            <h1 className="text-4xl font-bold mb-2">Reset Password</h1>
            {!success && (
              <p className="text-white/60 text-sm mt-3 leading-relaxed">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            )}
          </div>

          {success ? (
            <div className="w-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-white px-6 py-8 rounded-3xl text-sm text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#38bdf8] rounded-full flex items-center justify-center shadow-lg">
                  <Mail size={32} className="text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-white/70 leading-relaxed mb-6 px-4">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
              </p>
              <button
                type="button"
                className="text-[#38bdf8] font-bold hover:underline"
                onClick={() => { setSuccess(false); setError(''); }}
              >
                Try another email
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="w-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] px-4 py-3 rounded-2xl mb-6 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="auth-input-container">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="auth-btn mt-4">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </div>
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
