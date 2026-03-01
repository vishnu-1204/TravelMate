import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Validate input
    const validation = registerSchema.safeParse({ name: fullName, email: normalizedEmail, password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Note: Passing fullName to signUp, though the hook may currently ignore it.
      // Keeping original behavior where name was collected but not strictly required by the hook signature for now.
      // @ts-ignore - The hook might only take 2 args, but we pass 3 for future support
      const { error, needsEmailVerification } = await signUp(normalizedEmail, password, fullName);
      
      if (error) {
        setError(error.message || 'Unable to create account. Please try again.');
      } else {
        if (needsEmailVerification) {
          navigate('/login', {
            state: {
              message: `Account created for ${normalizedEmail}. Please verify your email before logging in.`,
            },
          });
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account. Please try again later.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#131326] flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md bg-transparent flex flex-col">
          
          <div className="w-full text-left mb-10">
            <h1 className="text-4xl font-bold mb-2">Sign Up</h1>
          </div>

          {error && (
            <div className="w-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] px-4 py-3 rounded-2xl mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Name Row */}
            <div className="flex gap-4">
              <div className="auth-input-container !mb-0 flex-1">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="auth-input !px-6"
                  required
                />
              </div>
              <div className="auth-input-container !mb-0 flex-1">
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="auth-input !px-6"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-input-container">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input !px-6"
                required
              />
            </div>

            {/* Password */}
            <div className="auth-input-container">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input !px-6 !pr-16"
                required
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
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input !px-6 !pr-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 text-sm hover:text-white transition-colors underline decoration-[#38bdf8]/30 underline-offset-2"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="flex items-center px-1 mb-6 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" required />
                  <div className="h-5 w-5 border-2 border-white/20 rounded-md peer-checked:bg-[#38bdf8] peer-checked:border-[#38bdf8] transition-all" />
                  <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm text-white/60">
                  I Agree with <span className="text-[#38bdf8] font-medium hover:underline">privacy</span> and <span className="text-[#38bdf8] font-medium hover:underline">policy</span>
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="auth-btn !mt-8">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Account...
                </div>
              ) : (
                "Sign up"
              )}
            </button>
          </form>

          <p className="mt-12 text-center text-white/60 text-sm">
            Already have an account ?{" "}
            <Link to="/login" className="text-[#38bdf8] font-bold ml-1 hover:underline">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </PageTransition>
  );
};

export default Register;
