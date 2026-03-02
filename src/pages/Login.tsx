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
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: 'url("/images/auth-bg.png")' }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

        {/* Auth Card */}
        <div className="w-full max-w-[440px] bg-[#282828] rounded-lg shadow-2xl p-8 md:p-12 flex flex-col items-center relative z-10">
          
          {/* Brand Logo */}
          <div className="flex flex-col items-center mb-10">
            <span className="text-4xl font-bold text-white tracking-tight">
              Travel<span className="text-sky-400">Mate</span>
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-10 mb-10 w-full justify-center">
            <button className="text-sm font-bold text-white relative py-2">
              SIGN IN
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400" />
            </button>
            <Link to="/register" className="text-sm font-bold text-gray-400 hover:text-white transition-colors py-2">
              SIGN UP
            </Link>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Username or Email"
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
            </div>

            <div className="flex items-center gap-2 px-2 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded-sm bg-[#535353] border-none checked:bg-sky-400 focus:ring-offset-0 focus:ring-0 transition-colors cursor-pointer" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">stay signed in</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-sky-400 text-black py-4 rounded-full font-bold text-sm tracking-wider hover:bg-sky-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-sky-400/10"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SIGN IN"}
            </button>
          </form>

          {/* Footer Link */}
          <Link to="/forgot-password"  className="mt-10 text-xs font-bold text-gray-400 hover:text-sky-400 transition-colors tracking-wide">
            Forgot Password?
          </Link>
        </div>
      </div>
    </PageTransition>
  );
};


export default Login;
