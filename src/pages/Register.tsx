import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';
import { lovable } from "@/integrations/lovable";

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    setSocialLoading("google");
    setError("");
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        setError("Failed to sign up with Google. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignup = async () => {
    setSocialLoading("apple");
    setError("");
    try {
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        setError("Failed to sign up with Apple. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate input
    const validation = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      if (error) {
        // Use generic error message to prevent account enumeration
        setError('Unable to create account. Please check your information and try again.');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Unable to create account. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <PageTransition>
    <div className="min-h-screen bg-[#6b6678] flex items-center justify-center p-6">

      <div className="w-full max-w-6xl bg-[#2b2836] rounded-3xl shadow-2xl grid lg:grid-cols-2 overflow-hidden">

        {/* LEFT IMAGE PANEL */}
        <div className="relative hidden lg:block">

          <img
            src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/70 to-black/80" />

          {/* Logo */}
          <h2 className="absolute top-6 left-6 text-white text-xl font-semibold tracking-widest">
            TravelWise
          </h2>

          {/* Back Button */}
          <Link
            to="/"
            className="absolute top-6 right-6 px-4 py-2 text-xs bg-white/20 rounded-full backdrop-blur text-white hover:bg-white/30"
          >
            Back to website →
          </Link>

          {/* Bottom Text */}
          <div className="absolute bottom-14 left-10 text-white">
            <h2 className="text-2xl font-semibold">
              Capturing Moments,
              <br />
              Creating Memories
            </h2>

            <div className="flex gap-2 mt-5">
              <span className="w-6 h-[3px] bg-white/40 rounded-full" />
              <span className="w-6 h-[3px] bg-white/40 rounded-full" />
              <span className="w-6 h-[3px] bg-white rounded-full" />
            </div>
          </div>

        </div>

        {/* RIGHT FORM */}
        <div className="p-12 text-white flex flex-col justify-center">

          <h1 className="text-3xl font-semibold mb-2">
            Create an account
          </h1>

          <p className="text-gray-400 mb-8">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-400 hover:underline">
              Log in
            </Link>
          </p>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="inputStyle"
              required
            />

            {/* Email */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="inputStyle"
              required
            />

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="inputStyle pr-12"
                required
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
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="inputStyle"
              required
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 transition font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>

          </form>

          {/* Social Sign Up */}
          <div className="mt-8">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <div className="flex-1 h-px bg-white/10"></div>
              Or sign up with
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button 
                type="button"
                onClick={handleGoogleSignup}
                disabled={socialLoading === "google"}
                className="socialBtn flex items-center justify-center gap-2"
              >
                {socialLoading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </button>

              <button 
                type="button"
                onClick={handleAppleSignup}
                disabled={socialLoading === "apple"}
                className="socialBtn flex items-center justify-center gap-2"
              >
                {socialLoading === "apple" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                )}
                Apple
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </PageTransition>
);

};

export default Register;
