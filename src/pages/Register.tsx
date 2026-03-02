import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreePolicy) {
      setError("Please agree to the privacy policy");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const validation = registerSchema.safeParse({ name: fullName, email: normalizedEmail, password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // @ts-ignore
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
      setError('Unable to create account. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: 'url("/images/auth-bg.png")' }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

        {/* Auth Card */}
        <div className="w-full max-w-[480px] bg-[#282828] rounded-lg shadow-2xl p-8 md:p-12 flex flex-col items-center relative z-10">
          
          {/* Brand Logo */}
          <div className="flex flex-col items-center mb-10">
            <span className="text-4xl font-bold text-white tracking-tight">
              Travel<span className="text-sky-400">Mate</span>
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-10 mb-10 w-full justify-center">
            <Link to="/login" className="text-sm font-bold text-gray-400 hover:text-white transition-colors py-2">
              SIGN IN
            </Link>
            <button className="text-sm font-bold text-white relative py-2">
              SIGN UP
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-6 py-4 rounded-full bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all font-medium"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-6 py-4 rounded-full bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all font-medium"
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-full bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all font-medium"
              required
            />
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-full bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all font-medium pr-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-full bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all font-medium"
              required
            />

            <div className="flex items-center gap-2 px-2 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded-sm bg-[#535353] border-none checked:bg-sky-400 focus:ring-offset-0 focus:ring-0 transition-colors cursor-pointer" 
                  checked={agreePolicy}
                  onChange={(e) => setAgreePolicy(e.target.checked)}
                  required
                />
                <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                  agree with <span className="text-sky-400">privacy</span> and <span className="text-sky-400">policy</span>
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-sky-400 text-black py-4 rounded-full font-bold text-sm tracking-wider hover:bg-sky-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-sky-400/10"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SIGN UP"}
            </button>
          </form>

          {/* Footer Link */}
          <p className="mt-10 text-xs font-bold text-gray-400 tracking-wide">
            Already have an account? <Link to="/login" className="text-sky-400 hover:text-sky-300 ml-1 transition-colors">Log In</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Register;
