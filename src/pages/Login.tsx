import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PageTransition from "@/components/layout/PageTransition";
import { z } from "zod";
import { lovable } from "@/integrations/lovable";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const mapLoginError = (rawMessage: string) => {
  const message = rawMessage.toLowerCase();
  if (message.includes("verify your email") || message.includes("not confirmed")) {
    return {
      userMessage: "Your email is not verified yet. Please check your inbox.",
      allowResend: true,
    };
  }
  if (message.includes("invalid email or password") || message.includes("invalid login credentials")) {
    return {
      userMessage: "Email or password is incorrect. Use Forgot password if needed.",
      allowResend: false,
    };
  }
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch")) {
    return {
      userMessage: "Unable to reach authentication service. Make sure the backend is running.",
      allowResend: false,
    };
  }
  return {
    userMessage: rawMessage || "Login failed. Please try again.",
    allowResend: false,
  };
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const signupMessage = (location.state as { message?: string } | null)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const validation = loginSchema.safeParse({ email: normalizedEmail, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(normalizedEmail, password);
      if (error) {
        const mapped = mapLoginError(error.message || "");
        setError(mapped.userMessage);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
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
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80" 
              alt="Scenic Travel" 
              className="auth-sidebar-img"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131326]/80 via-transparent to-transparent z-10" />
            
            <div className="relative z-20 p-12 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white tracking-tight">
                  Travel<span className="text-sky-400">Mate</span>
                </span>
                <Link to="/" className="text-sm font-medium text-white/80 hover:text-white flex items-center gap-2 transition-colors">
                  Back to website <span className="text-lg">→</span>
                </Link>
              </div>
              
              <div className="mt-auto">
                <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                  Capturing Moments,<br />Creating Memories
                </h2>
                <div className="flex gap-2">
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                  <div className="w-8 h-1 bg-white/30 rounded-full" />
                  <div className="w-8 h-1 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Form */}
          <div className="auth-content">
            <div className="max-w-md w-full mx-auto">
              <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-[#94a3b8] text-sm mb-10">
                Don't have an account? <Link to="/register" className="text-sky-400 hover:text-sky-400 font-medium ml-1 transition-colors">Sign up</Link>
              </p>

              {/* Feedback Messages */}
              {signupMessage && (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-xs text-center">
                  {signupMessage}
                </div>
              )}

              {error && (
                <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-sky-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded-md border-[#3d3d4a] bg-[#2d2d3a] text-sky-400 focus:ring-sky-400/50 transition-colors cursor-pointer" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-sm text-[#94a3b8] group-hover:text-white transition-colors tracking-tight">Stay signed in</span>
                  </label>
                  <Link to="/forgot-password"  className="text-sm font-medium text-sky-400 hover:text-sky-400 transition-colors">
                    Forgot Password?
                  </Link>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="auth-btn-primary mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
                </button>
              </form>

              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3d3d4a]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1f1f2e] px-4 text-[#64748b]">Or continue with</span>
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


export default Login;
