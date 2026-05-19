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
      <div className="auth-split-layout">
        <div className="auth-container">
          {/* Left Sidebar - Image & Brand */}
          <div className="auth-sidebar">
            <img 
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80" 
              alt="Travel Map Recovery" 
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
                  Find Your Way<br />Back to Adventure
                </h2>
                <div className="flex gap-2">
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                  <div className="w-8 h-1 bg-white rounded-full" />
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Form */}
          <div className="auth-content">
            <div className="max-w-md w-full mx-auto">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-[#FF7A00] text-sm mb-6 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
              
              <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
              
              {!success && (
                <p className="text-[#94a3b8] text-sm mb-8">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              )}

              {success ? (
                <div className="w-full bg-[#FF7A00]/10 border border-[#FF7A00]/30 text-white px-6 py-8 rounded-3xl text-sm text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-[#FF7A00] to-[#FFC857] rounded-full flex items-center justify-center shadow-lg shadow-[#FF7A00]/25">
                      <Mail size={30} className="text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-2">Check your email</h2>
                  <p className="text-[#94a3b8] leading-relaxed mb-6 px-4">
                    If an account exists for <strong className="text-white">{email}</strong>, we've sent a password reset link.
                  </p>
                  <button
                    type="button"
                    className="text-[#FF7A00] font-medium hover:brightness-110 hover:underline transition-all"
                    onClick={() => { setSuccess(false); setError(''); }}
                  >
                    Try another email
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input-new"
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="auth-btn-primary mt-6 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
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
        </div>
      </div>
    </PageTransition>
  );
};

export default ForgotPassword;
