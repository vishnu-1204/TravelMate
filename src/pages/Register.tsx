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
          navigate('/', { replace: true });
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
      <div className="auth-split-layout">
        <div className="auth-container">
          {/* Left Sidebar - Image & Brand */}
          <div className="auth-sidebar">
            <img 
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" 
              alt="Beach View" 
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
                  Start Your Journey,<br />Explore the World
                </h2>
                <div className="flex gap-2">
                  <div className="w-8 h-1 bg-white rounded-full" />
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Form */}
          <div className="auth-content">
            <div className="max-w-md w-full mx-auto">
              <h1 className="text-3xl font-bold text-white mb-2">Create an account</h1>
              <p className="text-[#94a3b8] text-sm mb-8">
                Already have an account? <Link to="/login" className="text-[#FF7A00] hover:brightness-110 font-medium ml-1 transition-colors">Log in</Link>
              </p>

              {/* Error Message */}
              {error && (
                <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="auth-input-new"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="auth-input-new"
                    required
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input-new"
                  required
                />
                
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input-new pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#FF7A00] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input-new"
                  required
                />

                <div className="flex items-center gap-2 py-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded-md border-white/10 bg-[#1A1A1A] text-[#FF7A00] focus:ring-[#FF7A00]/50 transition-colors cursor-pointer" 
                      checked={agreePolicy}
                      onChange={(e) => setAgreePolicy(e.target.checked)}
                      required
                    />
                    <span className="text-sm text-[#94a3b8] group-hover:text-white transition-colors tracking-tight">
                      I agree to the <span className="text-[#FF7A00] cursor-pointer hover:brightness-110 hover:underline transition-colors">Terms & Conditions</span>
                    </span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="auth-btn-primary mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3d3d4a]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#222222] px-4 text-gray-500">Or register with</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="auth-btn-social">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                  <span>Google</span>
                </button>
                <button className="auth-btn-social">
                  <img src="https://www.svgrepo.com/show/442938/apple-logo.svg" alt="Apple" className="w-5 h-5 invert" />
                  <span>Apple</span>
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
