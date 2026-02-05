import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Plane, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';

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
  const { signUp } = useAuth();
  const navigate = useNavigate();

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

        </div>
      </div>
    </div>
  </PageTransition>
);

};

export default Register;
