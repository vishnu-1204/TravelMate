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
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const signupMessage = (location.state as { message?: string } | null)?.message;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setShowResendVerification(false);

    // Normalize email: trim and lowercase
    const normalizedEmail = email.trim().toLowerCase();

    const validation = loginSchema.safeParse({ email: normalizedEmail, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      console.log(`[Login] Attempting sign-in for: ${normalizedEmail}`);
      const { error } = await signIn(normalizedEmail, password);
      
      if (error) {
        console.warn(`[Login] Sign-in failed: ${error.message}`);
        const mapped = mapLoginError(error.message || "");
        setError(mapped.userMessage);
        setShowResendVerification(mapped.allowResend);
      } else {
        console.log(`[Login] Sign-in successful for: ${normalizedEmail}`);
        navigate("/");
      }
    } catch (err: any) {
      console.error(`[Login] Unexpected error:`, err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("Resend verification is currently handled by the backend automatically on registration.");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#131326] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-transparent flex flex-col items-center">
          
          <div className="w-full text-left mb-10">
            <h1 className="text-4xl font-bold text-white mb-2">Log In</h1>
          </div>

          {signupMessage && (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl mb-6 text-sm">
              {signupMessage}
            </div>
          )}

          {error && (
            <div className="w-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] px-4 py-3 rounded-2xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Email/Username */}
            <div className="auth-input-container">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <input
                type="email"
                placeholder="Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                required
              />
            </div>

            {/* Password */}
            <div className="auth-input-container">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input !pr-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 text-sm hover:text-white transition-colors"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="flex items-center justify-between px-2 mb-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="h-5 w-5 border-2 border-white/30 rounded-md peer-checked:bg-[#38bdf8] peer-checked:border-[#38bdf8] transition-all" />
                  <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm text-white/80 group-hover:text-white transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password"  className="text-sm text-[#38bdf8] font-medium hover:underline">
                Forgot Password
              </Link>
            </div>

            <button type="submit" disabled={loading} className="auth-btn mt-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </div>
              ) : (
                "Log in"
              )}
            </button>
          </form>


            <p className="mt-12 text-white/70 text-sm">
              Don't have an account ?{" "}
              <Link to="/register" className="text-[#38bdf8] font-bold ml-1 hover:underline">
                Sign up
              </Link>
            </p>
        </div>
      </div>
    </PageTransition>
  );
};


export default Login;
